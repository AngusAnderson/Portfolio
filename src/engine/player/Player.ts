import { PLAYER_SPAWN } from "../map";
import type { GameMap } from "../map";

import { PlayerInput } from "./input";
import { PlayerPhysics } from "./physics";
import { updateMovement } from "./movement";
import { renderPlayerDebug } from "./debugRenderer";

import type { PlayerState } from "./types";

export class Player implements PlayerState {
	public x: number;
	public y: number;
	public radius: number = 3;

	public turnDirection: number = 0;
	public moveDirection: number = 0;
	public strafeDirection: number = 0;
	public rotationAngle: number;

	public moveSpeed: number = 4;
	public rotationSpeed: number = 4 * (Math.PI / 180);

	public jumpHeight: number = 0;

	public elevation: number = 0;
	public grounded: boolean = true;
	public bodyHeight: number = 24;

	public mouseSensitivity: number = 0.003;

	public pitch: number = 0;
	public pitchSensitivity: number = 0.002;
	public maxPitch: number = 45 * (Math.PI / 180);

	private readonly input = new PlayerInput();
	private readonly physics = new PlayerPhysics();

	constructor() {
		this.x = PLAYER_SPAWN.x;
		this.y = PLAYER_SPAWN.y;
		this.rotationAngle = PLAYER_SPAWN.rotationAngle;
	}

	public handleKeyDown(event: KeyboardEvent): void {
		this.input.handleKeyDown(event, this);
	}

	public handleKeyUp(event: KeyboardEvent): void {
		this.input.handleKeyUp(event);
	}

	public handleMouseMove(event: MouseEvent): void {
		this.input.handleMouseMove(event, this);
	}

	public update(map: GameMap, deltaTime: number): void {
		this.turnDirection = 0;
		this.moveDirection = 0;
		this.strafeDirection = 0;

		const jumpRequested = this.input.consumeJumpRequest();

		this.physics.updateJump(
			this,
			deltaTime,
			map,
			jumpRequested
		);

		this.input.applyMovementDirections(this);

		updateMovement(this, map, this.physics);

		this.physics.updateJumpHeight(this, map);
	}

	public render(context: CanvasRenderingContext2D): void {
		renderPlayerDebug(context, this);
	}
}