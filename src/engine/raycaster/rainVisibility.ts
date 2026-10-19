import { FOV, NUM_RAYS } from "../../settings";

import type { GameMap } from "../map";

import {
	intersectRamp,
	intersectSuspendedPlatform,
} from "./intersections";

import type {
	CameraState,
	WallSegment,
} from "./types";

export function getRainSceneDepth(
	column: number,
	screenY: number,
	map: GameMap,
	columns: WallSegment[][],
	camera: CameraState
): number {
	const cameraX =
		2 * ((column + 0.5) / NUM_RAYS) - 1;

	const forwardX = Math.cos(camera.rotationAngle);
	const forwardY = Math.sin(camera.rotationAngle);

	const rightX = -forwardY;
	const rightY = forwardX;

	const horizontalOffset =
		cameraX * Math.tan(FOV / 2);

	const directionX =
		forwardX + rightX * horizontalOffset;

	const directionY =
		forwardY + rightY * horizontalOffset;

	const directionZ =
		(camera.horizonY - (screenY + 0.5)) /
		camera.projectionDistance;

	let nearestDepth = Infinity;

	if (directionZ < -0.000001 && camera.cameraHeight > 0) {
		nearestDepth =
			-camera.cameraHeight / directionZ;
	}

	for (const wall of columns[column] ?? []) {
		let near = wall.entryDistance;
		let far = wall.exitDistance;

		if (Math.abs(directionZ) < 0.000001) {
			if (
				camera.cameraHeight < 0 ||
				camera.cameraHeight > wall.height
			) {
				continue;
			}
		} else {
			const depthAtBottom =
				-camera.cameraHeight / directionZ;

			const depthAtTop =
				(wall.height - camera.cameraHeight) /
				directionZ;

			near = Math.max(
				near,
				Math.min(depthAtBottom, depthAtTop)
			);

			far = Math.min(
				far,
				Math.max(depthAtBottom, depthAtTop)
			);
		}

		if (
			far >= near &&
			far > 0.001
		) {
			nearestDepth = Math.min(
				nearestDepth,
				Math.max(near, 0.001)
			);
		}
	}

	for (const platform of map.suspendedPlatforms) {
		const hit = intersectSuspendedPlatform(
			platform,
			directionX,
			directionY,
			directionZ,
			camera
		);

		if (hit && hit.distance > 0.001) {
			nearestDepth = Math.min(
				nearestDepth,
				hit.distance
			);
		}
	}

	for (const ramp of map.ramps) {
		const hit = intersectRamp(
			ramp,
			directionX,
			directionY,
			directionZ,
			camera
		);

		if (hit && hit.distance > 0.001) {
			nearestDepth = Math.min(
				nearestDepth,
				hit.distance
			);
		}
	}

	return nearestDepth;
}