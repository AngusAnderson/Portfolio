import {
	RES,
	TILESIZE,
	WINDOW_HEIGHT,
} from "../../settings";

import { projectHeight } from "./camera";
import type { WallTexture } from "./textures";
import type { CameraState, WallSegment } from "./types";

export function renderWalls(
	context: CanvasRenderingContext2D,
	columns: WallSegment[][],
	camera: CameraState,
	texture: WallTexture
): void {
	for (let column = 0; column < columns.length; column++) {
		const segments = columns[column];

		if (!segments) {
			continue;
		}

		const screenX = column * RES;

		for (let index = segments.length - 1; index >= 0; index--) {
			const segment = segments[index];

			if (!segment) {
				continue;
			}

			renderWallSegment(
				context,
				screenX,
				segment,
				camera,
				texture
			);
		}
	}
}

function renderWallSegment(
	context: CanvasRenderingContext2D,
	screenX: number,
	segment: WallSegment,
	camera: CameraState,
	texture: WallTexture
): void {
	const distance = segment.entryDistance;

	const brightness = Math.min(1, 60 / distance);
	const sideShade = segment.verticalSide ? 1 : 0.7;

	if (camera.cameraHeight > segment.height) {
		const nearTop = projectHeight(
			segment.height,
			segment.entryDistance,
			camera
		);

		const farTop = projectHeight(
			segment.height,
			segment.exitDistance,
			camera
		);

		const top = Math.max(0, Math.min(nearTop, farTop));

		const bottom = Math.min(
			WINDOW_HEIGHT,
			Math.max(nearTop, farTop)
		);

		if (bottom > top) {
			const shade = Math.round(100 * brightness);

			context.fillStyle =
				`rgb(${shade}, ${shade}, ${shade})`;

			context.fillRect(
				screenX,
				top,
				RES,
				bottom - top
			);
		}
	}

	for (
		let baseHeight = 0;
		baseHeight < segment.height;
		baseHeight += TILESIZE
	) {
		const upperHeight = Math.min(
			baseHeight + TILESIZE,
			segment.height
		);

		const top = projectHeight(
			upperHeight,
			distance,
			camera
		);

		const bottom = projectHeight(
			baseHeight,
			distance,
			camera
		);

		if (bottom <= 0 || top >= WINDOW_HEIGHT) {
			continue;
		}

		if (texture.loaded) {
			const textureWidth = texture.image.naturalWidth;
			const textureHeight = texture.image.naturalHeight;

			const textureX = Math.max(
				0,
				Math.min(
					textureWidth - 1,
					Math.floor(
						segment.texturePosition * textureWidth
					)
				)
			);

			context.drawImage(
				texture.image,
				textureX,
				0,
				1,
				textureHeight,
				screenX,
				top,
				RES,
				bottom - top
			);

			context.fillStyle =
				`rgba(0, 0, 0, ${1 - brightness * sideShade})`;
		} else {
			const shade = Math.round(
				255 * brightness * sideShade
			);

			context.fillStyle =
				`rgb(${shade}, ${shade}, ${shade})`;
		}

		context.fillRect(
			screenX,
			top,
			RES,
			bottom - top
		);
	}
}