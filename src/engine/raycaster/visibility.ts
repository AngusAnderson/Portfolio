import type { WallSegment } from "./types";

export function wallBlocksSurface(
	walls: WallSegment[],
	surfaceDistance: number,
	directionZ: number,
	cameraHeight: number
): boolean {
	const epsilon = 0.000001;

	for (const wall of walls) {
		if (wall.entryDistance >= surfaceDistance) {
			break;
		}

		let verticalEntry: number;
		let verticalExit: number;

		if (Math.abs(directionZ) < epsilon) {
			if (
				cameraHeight < 0 ||
				cameraHeight > wall.height
			) {
				continue;
			}

			verticalEntry = -Infinity;
			verticalExit = Infinity;
		} else {
			const groundDistance =
				-cameraHeight / directionZ;

			const topDistance =
				(wall.height - cameraHeight) / directionZ;

			verticalEntry = Math.min(
				groundDistance,
				topDistance
			);

			verticalExit = Math.max(
				groundDistance,
				topDistance
			);
		}

		const entry = Math.max(
			wall.entryDistance,
			verticalEntry,
			0
		);

		const exit = Math.min(
			wall.exitDistance,
			verticalExit
		);

		if (
			entry <= exit &&
			entry < surfaceDistance - epsilon
		) {
			return true;
		}
	}

	return false;
}