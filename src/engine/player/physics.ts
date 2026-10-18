import type { GameMap } from "../map";
import type { PlayerState } from "./types";

export class PlayerPhysics {
	public readonly maxStepHeight: number = 2;
	public readonly groundTolerance: number = 0.01;

	private verticalVelocity: number = 0;

	private readonly jumpSpeed: number = 90;
	private readonly gravity: number = 360;

	public updateJump(
		player: PlayerState,
		deltaTime: number,
		map: GameMap,
		jumpRequested: boolean
	): void {
		if (jumpRequested && player.grounded) {
			this.verticalVelocity = this.jumpSpeed;
			player.grounded = false;
		}

		if (!player.grounded) {
			const previousFeet = player.elevation;
			const previousHead =
				previousFeet + player.bodyHeight;

			let nextFeet =
				player.elevation +
				this.verticalVelocity * deltaTime -
				0.5 * this.gravity * deltaTime * deltaTime;

			this.verticalVelocity -=
				this.gravity * deltaTime;

			if (nextFeet > previousFeet) {
				let lowestCeiling = Infinity;

				for (
					const platform of
					map.getSuspendedPlatformsAt(
						player.x,
						player.y
					)
				) {
					const crossesUnderside =
						previousHead <=
							platform.bottomHeight +
								this.groundTolerance &&
						nextFeet + player.bodyHeight >=
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
						lowestCeiling - player.bodyHeight;

					this.verticalVelocity = 0;
				}
			}

			const supportHeight = map.getSupportHeightAt(
				player.x,
				player.y,
				previousFeet,
				this.groundTolerance
			);

			if (
				nextFeet <= previousFeet &&
				nextFeet <= supportHeight
			) {
				nextFeet = supportHeight;
				this.verticalVelocity = 0;
				player.grounded = true;
			}

			player.elevation = nextFeet;
		}

		this.updateJumpHeight(player, map);
	}

	public updateJumpHeight(
		player: PlayerState,
		map: GameMap
	): void {
		const supportHeight = map.getSupportHeightAt(
			player.x,
			player.y,
			player.elevation,
			this.groundTolerance
		);

		player.jumpHeight = Math.max(
			0,
			player.elevation - supportHeight
		);
	}

	public followGround(
		player: PlayerState,
		map: GameMap
	): void {
		if (!player.grounded) {
			return;
		}

		const supportHeight = map.getSupportHeightAt(
			player.x,
			player.y,
			player.elevation,
			this.maxStepHeight
		);

		const heightDifference =
			supportHeight - player.elevation;

		if (
			heightDifference >= -this.maxStepHeight &&
			heightDifference <= this.maxStepHeight
		) {
			player.elevation = supportHeight;
		} else {
			player.grounded = false;
			this.verticalVelocity = 0;
		}
	}
}