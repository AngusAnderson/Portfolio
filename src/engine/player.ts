import {TILESIZE} from "../settings";
import { PLAYER_SPAWN, type GameMap } from "./map";

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

	// Elevation
	public elevation: number = 0;
	public grounded: boolean = true;
	public bodyHeight: number = 24;

	private readonly maxStepHeight: number = 2;
	private readonly groundTolerance: number = 0.01;

	constructor() {
		this.x = PLAYER_SPAWN.x;
		this.y = PLAYER_SPAWN.y;
		this.rotationAngle = PLAYER_SPAWN.rotationAngle;

		

		this.radius = 3;

		this.turnDirection = 0;
		this.moveDirection = 0;
		this.strafeDirection = 0;

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
		this.grounded
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

		this.updateJump(deltaTime, map);

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
				this.followGround(map);
			}

			const nextY = this.y + stepY;

			if (this.canMoveTo(this.x, nextY, map)) {
				this.y = nextY;
				this.followGround(map);
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

		// this.jumpHeight = Math.max(0, this.elevation - map.getGroundHeightAt(this.x, this.y));
		this.updateJumpHeight(map);
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

	// MARK: - Collision Detection
	private canMoveTo(
		x: number,
		y: number,
		map: GameMap
	): boolean {
		const radius = this.radius;

		const clearOfWalls =
			map.hasWallAt(x - radius, y - radius) === 0 &&
			map.hasWallAt(x + radius, y - radius) === 0 &&
			map.hasWallAt(x - radius, y + radius) === 0 &&
			map.hasWallAt(x + radius, y + radius) === 0;

		if (!clearOfWalls) {
			return false;
		}

		const allowedRise = this.grounded
			? this.maxStepHeight
			: this.groundTolerance;

		const supportHeight = map.getSupportHeightAt(
			x,
			y,
			this.elevation,
			allowedRise
		);

		// Solid terrain cannot be entered from underneath.
		if (supportHeight > this.elevation + allowedRise) {
			return false;
		}

		let proposedFeet = this.elevation;

		// Allow a grounded player to follow small surface changes.
		if (
			this.grounded &&
			Math.abs(supportHeight - this.elevation) <=
				this.maxStepHeight
		) {
			proposedFeet = supportHeight;
		}

		const proposedHead = proposedFeet + this.bodyHeight;

		for (const platform of map.getSuspendedPlatformsAt(x, y)) {
			const overlapsSlab =
				proposedFeet <
					platform.topHeight - this.groundTolerance &&
				proposedHead >
					platform.bottomHeight + this.groundTolerance;

			if (overlapsSlab) {
				return false;
			}
		}

		return true;
	}

	private updateJump(
		deltaTime: number,
		map: GameMap
	): void {
		if (this.jumpQueued && this.grounded) {
			this.verticalVelocity = this.jumpSpeed;
			this.grounded = false;
		}

		this.jumpQueued = false;

		if (!this.grounded) {
			const previousFeet = this.elevation;
			const previousHead =
				previousFeet + this.bodyHeight;

			let nextFeet =
				this.elevation +
				this.verticalVelocity * deltaTime -
				0.5 * this.gravity * deltaTime * deltaTime;

			this.verticalVelocity -=
				this.gravity * deltaTime;

			// Stop upward movement at the nearest underside.
			if (nextFeet > previousFeet) {
				let lowestCeiling = Infinity;

				for (
					const platform of
					map.getSuspendedPlatformsAt(this.x, this.y)
				) {
					const crossesUnderside =
						previousHead <=
							platform.bottomHeight +
								this.groundTolerance &&
						nextFeet + this.bodyHeight >=
							platform.bottomHeight;

					if (crossesUnderside) {
						lowestCeiling = Math.min(
							lowestCeiling,
							platform.bottomHeight
						);
					}
				}

				if (Number.isFinite(lowestCeiling)) {
					nextFeet =
						lowestCeiling - this.bodyHeight;

					this.verticalVelocity = 0;
				}
			}

			// Only surfaces beneath the previous feet position
			// are eligible landing surfaces.
			const supportHeight = map.getSupportHeightAt(
				this.x,
				this.y,
				previousFeet,
				this.groundTolerance
			);

			if (
				nextFeet <= previousFeet &&
				nextFeet <= supportHeight
			) {
				nextFeet = supportHeight;
				this.verticalVelocity = 0;
				this.grounded = true;
			}

			this.elevation = nextFeet;
		}

		this.updateJumpHeight(map);
	}

	private updateJumpHeight(map: GameMap): void {
		const supportHeight = map.getSupportHeightAt(
			this.x,
			this.y,
			this.elevation,
			this.groundTolerance
		);

		this.jumpHeight = Math.max(
			0,
			this.elevation - supportHeight
		);
	}

	private followGround(map: GameMap): void {
		if (!this.grounded) {
			return;
		}

		const supportHeight = map.getSupportHeightAt(
			this.x,
			this.y,
			this.elevation,
			this.maxStepHeight
		);

		const heightDifference =
			supportHeight - this.elevation;

		if (
			heightDifference >= -this.maxStepHeight &&
			heightDifference <= this.maxStepHeight
		) {
			this.elevation = supportHeight;
		} else {
			this.grounded = false;
			this.verticalVelocity = 0;
		}
	}
}