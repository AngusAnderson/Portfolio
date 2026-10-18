import { TILESIZE } from "../../settings";

import type {
	MapGeometry,
	Ramp,
	SuspendedPlatform,
} from "./types";

export function hasWallAt(
	grid: number[][],
	x: number,
	y: number
): number {
	if (!Number.isFinite(x) || !Number.isFinite(y)) {
		return 1;
	}

	const row = Math.floor(y / TILESIZE);
	const column = Math.floor(x / TILESIZE);

	return grid[row]?.[column] ?? 1;
}

export function getSuspendedPlatformsAt(
	platforms: SuspendedPlatform[],
	x: number,
	y: number
): SuspendedPlatform[] {
	return platforms.filter((platform) => {
		return (
			x >= platform.x &&
			x < platform.x + platform.width &&
			y >= platform.y &&
			y < platform.y + platform.depth
		);
	});
}

export function getGroundHeightAt(
	ramps: Ramp[],
	x: number,
	y: number
): number {
	for (const ramp of ramps) {
		const inside =
			x >= ramp.x &&
			x <= ramp.x + ramp.width &&
			y >= ramp.y &&
			y <= ramp.y + ramp.depth;

		if (!inside) {
			continue;
		}

		let progress = 0;

		switch (ramp.direction) {
			case "north":
				progress =
					(ramp.y + ramp.depth - y) /
					ramp.depth;
				break;

			case "south":
				progress =
					(y - ramp.y) / ramp.depth;
				break;

			case "east":
				progress =
					(x - ramp.x) / ramp.width;
				break;

			case "west":
				progress =
					(ramp.x + ramp.width - x) /
					ramp.width;
				break;
		}

		progress = Math.max(0, Math.min(1, progress));

		return (
			ramp.startHeight +
			progress *
				(ramp.endHeight - ramp.startHeight)
		);
	}

	return 0;
}

export function getSupportHeightAt(
	map: MapGeometry,
	x: number,
	y: number,
	feetHeight: number,
	maxStepUp: number = 0
): number {
	let supportHeight = getGroundHeightAt(
		map.ramps,
		x,
		y
	);

	const platforms = getSuspendedPlatformsAt(
		map.suspendedPlatforms,
		x,
		y
	);

	for (const platform of platforms) {
		if (
			platform.topHeight <= feetHeight + maxStepUp &&
			platform.topHeight > supportHeight
		) {
			supportHeight = platform.topHeight;
		}
	}

	return supportHeight;
}