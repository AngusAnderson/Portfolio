import type { GameMap } from "../map";
import { canMoveTo } from "./collision";
import type { PlayerPhysics } from "./physics";
import type { PlayerState } from "./types";

export function updateMovement(
	player: PlayerState,
	map: GameMap,
	physics: PlayerPhysics
): void {
	player.rotationAngle +=
		player.turnDirection * player.rotationSpeed;

	const fullTurn = Math.PI * 2;

	player.rotationAngle =
		((player.rotationAngle % fullTurn) + fullTurn) %
		fullTurn;

	const moveStep =
		player.moveDirection * player.moveSpeed;

	const strafeStep =
		player.strafeDirection * player.moveSpeed;

	const movementX =
		Math.cos(player.rotationAngle) * moveStep;

	const movementY =
		Math.sin(player.rotationAngle) * moveStep;

	const strafeX =
		Math.cos(player.rotationAngle + Math.PI / 2) *
		strafeStep;

	const strafeY =
		Math.sin(player.rotationAngle + Math.PI / 2) *
		strafeStep;

	const steps = Math.max(
		1,
		Math.ceil(
			Math.max(
				Math.abs(movementX),
				Math.abs(movementY)
			)
		)
	);

	const strafeSteps = Math.max(
		1,
		Math.ceil(
			Math.max(
				Math.abs(strafeX),
				Math.abs(strafeY)
			)
		)
	);

	const stepX = movementX / steps;
	const stepY = movementY / steps;

	const strafeStepX = strafeX / strafeSteps;
	const strafeStepY = strafeY / strafeSteps;

	for (let step = 0; step < steps; step++) {
		const nextX = player.x + stepX;

		if (
			canMoveTo(
				player,
				nextX,
				player.y,
				map,
				physics.maxStepHeight,
				physics.groundTolerance
			)
		) {
			player.x = nextX;
			physics.followGround(player, map);
		}

		const nextY = player.y + stepY;

		if (
			canMoveTo(
				player,
				player.x,
				nextY,
				map,
				physics.maxStepHeight,
				physics.groundTolerance
			)
		) {
			player.y = nextY;
			physics.followGround(player, map);
		}
	}

	for (let step = 0; step < strafeSteps; step++) {
		const nextX = player.x + strafeStepX;

		if (
			canMoveTo(
				player,
				nextX,
				player.y,
				map,
				physics.maxStepHeight,
				physics.groundTolerance
			)
		) {
			player.x = nextX;
		}

		const nextY = player.y + strafeStepY;

		if (
			canMoveTo(
				player,
				player.x,
				nextY,
				map,
				physics.maxStepHeight,
				physics.groundTolerance
			)
		) {
			player.y = nextY;
		}
	}
}