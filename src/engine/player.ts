import {TILESIZE} from "../settings";
import type { GameMap } from "./map";

export class Player {
	public x: number;
	public y: number;
	public radius: number;

	public turnDirection: number;
	public moveDirection: number;
	public rotationAngle: number;
	public strafeDirection: number;

	public moveSpeed: number;
	public rotationSpeed: number;

	private pressedKeys: Set<string>;

	// Jumping
	public jumpHeight: number = 0;

	private verticalVelocity: number = 0;
	private jumpQueued: boolean = false;

	private readonly jumpSpeed: number = 90;
	private readonly gravity: number = 360;

	// Mouse
	public mouseSensitivity: number = 0.003;

	public pitch: number = 0;
	public pitchSensitivity: number = 0.002;
	public maxPitch: number = 45 * (Math.PI / 180);

	constructor() {
		this.x = 7.5 * TILESIZE;
		this.y = 8.5 * TILESIZE;

		this.radius = 3;

		this.turnDirection = 0;
		this.moveDirection = 0;
		this.strafeDirection = 0;
		this.rotationAngle = -Math.PI / 2;

		this.moveSpeed = 4;
		this.rotationSpeed = 4 * (Math.PI / 180);

		this.pressedKeys = new Set<string>();
	}

	// MARK: - Input Handling
	public handleKeyDown(event: KeyboardEvent): void {
	if (
		event.code === "Space" ||
		event.code.startsWith("Arrow")
	) {
		event.preventDefault();
	}

	if (
		event.code === "Space" &&
		!this.pressedKeys.has("Space") &&
		this.jumpHeight === 0
	) {
		this.jumpQueued = true;
	}

	this.pressedKeys.add(event.code);
}

	public handleKeyUp(event: KeyboardEvent): void {
		this.pressedKeys.delete(event.code);
	}

	// MARK: - Movement and Rotation
	public update(map: GameMap, deltaTime: number): void {
		this.turnDirection = 0;
		this.moveDirection = 0;
		this.strafeDirection = 0;

		this.updateJump(deltaTime);

		if (this.pressedKeys.has("ArrowRight") || this.pressedKeys.has("KeyD")) {
			this.strafeDirection = 1;
		}

		if (this.pressedKeys.has("ArrowLeft") || this.pressedKeys.has("KeyA")) {
			this.strafeDirection = -1;
		}

		if (this.pressedKeys.has("ArrowUp") || this.pressedKeys.has("KeyW")) {
			this.moveDirection = 1;
		}

		if (this.pressedKeys.has("ArrowDown") || this.pressedKeys.has("KeyS")) {
			this.moveDirection = -1;
		}

		this.rotationAngle += this.turnDirection * this.rotationSpeed;

		const fullTurn = Math.PI * 2;

		this.rotationAngle = ((this.rotationAngle % fullTurn) + fullTurn) % fullTurn;

		const moveStep = this.moveDirection * this.moveSpeed;
		const strafeStep = this.strafeDirection * this.moveSpeed;

		const movementX = Math.cos(this.rotationAngle) * moveStep;
		const movementY = Math.sin(this.rotationAngle) * moveStep;

		const strafeX = Math.cos(this.rotationAngle + Math.PI / 2) * strafeStep;
		const strafeY = Math.sin(this.rotationAngle + Math.PI / 2) * strafeStep;

		const steps = Math.max(
			1,
			Math.ceil(Math.max(Math.abs(movementX), Math.abs(movementY)))
		);

		const strafeSteps = Math.max(
			1,
			Math.ceil(Math.max(Math.abs(strafeX), Math.abs(strafeY)))
		);

		const stepX = movementX / steps;
		const stepY = movementY / steps;

		const strafeStepX = strafeX / strafeSteps;
		const strafeStepY = strafeY / strafeSteps;

		for (let step = 0; step < steps; step++) {
			const nextX = this.x + stepX;

			if (this.canMoveTo(nextX, this.y, map)) {
				this.x = nextX;
			}

			const nextY = this.y + stepY;

			if (this.canMoveTo(this.x, nextY, map)) {
				this.y = nextY;
			}
		}

		for (let step = 0; step < strafeSteps; step++) {
			const nextX = this.x + strafeStepX;

			if (this.canMoveTo(nextX, this.y, map)) {
				this.x = nextX;
			}

			const nextY = this.y + strafeStepY;

			if (this.canMoveTo(this.x, nextY, map)) {
				this.y = nextY;
			}
		}
	}

	// MARK: - Rendering
	public render(context: CanvasRenderingContext2D): void {
		context.fillStyle = "#ff0000";
		context.strokeStyle = "#ff0000";
		context.lineWidth = 2;

		context.beginPath();
		context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
		context.fill();

		context.beginPath();
		context.moveTo(this.x, this.y);
		context.lineTo(
			this.x + Math.cos(this.rotationAngle) * 50,
			this.y + Math.sin(this.rotationAngle) * 50
		);
		context.stroke();
	}

	// MARK: - Mouse Handling
	public handleMouseMove(event: MouseEvent): void {
		// Horizontal turning.
		this.rotationAngle +=
			event.movementX * this.mouseSensitivity;

		const fullTurn = Math.PI * 2;

		this.rotationAngle =
			((this.rotationAngle % fullTurn) + fullTurn) % fullTurn;

		// Vertical turning
		this.pitch -= event.movementY * this.pitchSensitivity;

		this.pitch = Math.max(
			-this.maxPitch,
			Math.min(this.maxPitch, this.pitch)
		);
	}

	private canMoveTo(x: number, y: number, map: GameMap): boolean {
		const radius = this.radius;

		return (
			map.hasWallAt(x - radius, y - radius) === 0 &&
			map.hasWallAt(x + radius, y - radius) === 0 &&
			map.hasWallAt(x - radius, y + radius) === 0 &&
			map.hasWallAt(x + radius, y + radius) === 0
		);
	}

	private updateJump(deltaTime: number): void {
		if (this.jumpQueued && this.jumpHeight === 0) {
			this.verticalVelocity = this.jumpSpeed;
		}

		this.jumpQueued = false;

		if (this.jumpHeight > 0 || this.verticalVelocity > 0) {
			this.jumpHeight +=
				this.verticalVelocity * deltaTime -
				0.5 * this.gravity * deltaTime * deltaTime;

			this.verticalVelocity -= this.gravity * deltaTime;

			if (this.jumpHeight <= 0) {
				this.jumpHeight = 0;
				this.verticalVelocity = 0;
			}
		}
	}
}