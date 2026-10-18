import {
	FOV,
	NUM_RAYS,
	RES,
	TILESIZE,
	WINDOW_HEIGHT,
} from "../../settings";

import type { GameMap } from "../map";

import {
	intersectRamp,
	intersectSuspendedPlatform,
} from "./intersections";

import { wallBlocksSurface } from "./visibility";

import type {
	CameraState,
	SurfaceHit,
	WallSegment,
} from "./types";

export function renderSurfaces(
	context: CanvasRenderingContext2D,
	map: GameMap,
	columns: WallSegment[][],
	camera: CameraState
): void {
	if (
		map.ramps.length === 0 &&
		map.suspendedPlatforms.length === 0
	) {
		return;
	}

	const forwardX = Math.cos(camera.rotationAngle);
	const forwardY = Math.sin(camera.rotationAngle);

	const rightX = -forwardY;
	const rightY = forwardX;

	const halfFovTangent = Math.tan(FOV / 2);
	const horizon = camera.horizonY;

	for (let column = 0; column < NUM_RAYS; column++) {
		const cameraX =
			2 * ((column + 0.5) / NUM_RAYS) - 1;

		const directionX =
			forwardX + rightX * cameraX * halfFovTangent;

		const directionY =
			forwardY + rightY * cameraX * halfFovTangent;

		const walls = columns[column] ?? [];

		for (let screenY = 0; screenY < WINDOW_HEIGHT; screenY++) {
			const directionZ =
				(horizon - (screenY + 0.5)) /
				camera.projectionDistance;

			let nearestHit: SurfaceHit | null = null;

			for (const platform of map.suspendedPlatforms) {
				const hit = intersectSuspendedPlatform(
					platform,
					directionX,
					directionY,
					directionZ,
					camera
				);

				if (
					hit &&
					(!nearestHit ||
						hit.distance < nearestHit.distance)
				) {
					nearestHit = hit;
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

				if (
					hit &&
					(!nearestHit ||
						hit.distance < nearestHit.distance)
				) {
					nearestHit = hit;
				}
			}

			if (!nearestHit) {
				continue;
			}

			if (
				wallBlocksSurface(
					walls,
					nearestHit.distance,
					directionZ,
					camera.cameraHeight
				)
			) {
				continue;
			}

			const checkerSize = TILESIZE / 4;

			const checker =
				(
					Math.floor(nearestHit.x / checkerSize) +
					Math.floor(nearestHit.y / checkerSize)
				) % 2;

			const baseColour = nearestHit.isTop
				? (checker === 0 ? 155 : 115)
				: 85;

			const brightness = Math.max(
				0.2,
				Math.min(1, 100 / nearestHit.distance)
			);

			const shade = Math.round(
				baseColour * brightness
			);

			context.fillStyle =
				`rgb(${shade}, ${shade}, ${shade})`;

			context.fillRect(
				column * RES,
				screenY,
				RES,
				1
			);
		}
	}
}