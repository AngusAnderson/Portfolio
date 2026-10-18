import type { GameMap } from "../map";
import type { PlayerState } from "./types";

export function canMoveTo(
	player: PlayerState,
	x: number,
	y: number,
	map: GameMap,
	maxStepHeight: number,
	groundTolerance: number
): boolean {
	const radius = player.radius;

	const clearOfWalls =
		map.hasWallAt(x - radius, y - radius) === 0 &&
		map.hasWallAt(x + radius, y - radius) === 0 &&
		map.hasWallAt(x - radius, y + radius) === 0 &&
		map.hasWallAt(x + radius, y + radius) === 0;

	if (!clearOfWalls) {
		return false;
	}

	const allowedRise = player.grounded
		? maxStepHeight
		: groundTolerance;

	const supportHeight = map.getSupportHeightAt(
		x,
		y,
		player.elevation,
		allowedRise
	);

	if (supportHeight > player.elevation + allowedRise) {
		return false;
	}

	let proposedFeet = player.elevation;

	if (
		player.grounded &&
		Math.abs(supportHeight - player.elevation) <=
			maxStepHeight
	) {
		proposedFeet = supportHeight;
	}

	const proposedHead = proposedFeet + player.bodyHeight;

	for (const platform of map.getSuspendedPlatformsAt(x, y)) {
		const overlapsSlab =
			proposedFeet <
				platform.topHeight - groundTolerance &&
			proposedHead >
				platform.bottomHeight + groundTolerance;

		if (overlapsSlab) {
			return false;
		}
	}

	return true;
}