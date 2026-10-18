import type { PlayerState } from "./types";

export class PlayerInput {
	private pressedKeys = new Set<string>();
	private jumpQueued = false;

	public handleKeyDown(
		event: KeyboardEvent,
		player: PlayerState
	): void {
		if (
			event.code === "Space" ||
			event.code.startsWith("Arrow")
		) {
			event.preventDefault();
		}

		if (
			event.code === "Space" &&
			!this.pressedKeys.has("Space") &&
			player.grounded
		) {
			this.jumpQueued = true;
		}

		this.pressedKeys.add(event.code);
	}

	public handleKeyUp(event: KeyboardEvent): void {
		this.pressedKeys.delete(event.code);
	}

	public consumeJumpRequest(): boolean {
		const requested = this.jumpQueued;

		this.jumpQueued = false;

		return requested;
	}

	public applyMovementDirections(player: PlayerState): void {
		player.turnDirection = 0;
		player.moveDirection = 0;
		player.strafeDirection = 0;

		if (
			this.pressedKeys.has("ArrowRight") ||
			this.pressedKeys.has("KeyD")
		) {
			player.strafeDirection = 1;
		}

		if (
			this.pressedKeys.has("ArrowLeft") ||
			this.pressedKeys.has("KeyA")
		) {
			player.strafeDirection = -1;
		}

		if (
			this.pressedKeys.has("ArrowUp") ||
			this.pressedKeys.has("KeyW")
		) {
			player.moveDirection = 1;
		}

		if (
			this.pressedKeys.has("ArrowDown") ||
			this.pressedKeys.has("KeyS")
		) {
			player.moveDirection = -1;
		}
	}

	public handleMouseMove(
		event: MouseEvent,
		player: PlayerState
	): void {
		player.rotationAngle +=
			event.movementX * player.mouseSensitivity;

		const fullTurn = Math.PI * 2;

		player.rotationAngle =
			((player.rotationAngle % fullTurn) + fullTurn) %
			fullTurn;

		player.pitch -=
			event.movementY * player.pitchSensitivity;

		player.pitch = Math.max(
			-player.maxPitch,
			Math.min(player.maxPitch, player.pitch)
		);
	}
}