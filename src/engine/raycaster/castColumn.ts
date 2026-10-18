import { TILESIZE } from "../../settings";
import type { GameMap } from "../map";
import type { CameraState, WallSegment } from "./types";

export function castColumn(
	map: GameMap,
	camera: CameraState,
	angle: number,
	correction: number
): WallSegment[] {
	const segments: WallSegment[] = [];

	let directionX = Math.cos(angle);
	let directionY = Math.sin(angle);

	if (Math.abs(directionX) < 0.00000001) {
		directionX = 0;
	}

	if (Math.abs(directionY) < 0.00000001) {
		directionY = 0;
	}

	let column = Math.floor(camera.x / TILESIZE);
	let row = Math.floor(camera.y / TILESIZE);

	const stepX = directionX < 0 ? -1 : 1;
	const stepY = directionY < 0 ? -1 : 1;

	const deltaX = directionX === 0
		? Infinity
		: TILESIZE / Math.abs(directionX);

	const deltaY = directionY === 0
		? Infinity
		: TILESIZE / Math.abs(directionY);

	const nextBoundaryX = directionX < 0
		? column * TILESIZE
		: (column + 1) * TILESIZE;

	const nextBoundaryY = directionY < 0
		? row * TILESIZE
		: (row + 1) * TILESIZE;

	let sideDistanceX = directionX === 0
		? Infinity
		: (nextBoundaryX - camera.x) / directionX;

	let sideDistanceY = directionY === 0
		? Infinity
		: (nextBoundaryY - camera.y) / directionY;

	let entryDistance = 0;
	let verticalSide = false;

	const mapRows = map.grid.length;
	const mapColumns = map.grid[0]?.length ?? 0;
	const maxSteps = mapRows + mapColumns + 4;

	for (let step = 0; step < maxSteps; step++) {
		if (
			row < 0 ||
			row >= mapRows ||
			column < 0 ||
			column >= mapColumns
		) {
			break;
		}

		const exitDistance = Math.min(
			sideDistanceX,
			sideDistanceY
		);

		const tileValue = map.grid[row]?.[column] ?? 0;

		if (tileValue > 0 && entryDistance > 0) {
			const hitX = camera.x + directionX * entryDistance;
			const hitY = camera.y + directionY * entryDistance;

			const wallCoordinate = verticalSide ? hitY : hitX;

			const positionInTile =
				((wallCoordinate % TILESIZE) + TILESIZE) %
				TILESIZE;

			let texturePosition = positionInTile / TILESIZE;

			if (
				(verticalSide && directionX > 0) ||
				(!verticalSide && directionY < 0)
			) {
				texturePosition = 1 - texturePosition;
			}

			segments.push({
				entryDistance: Math.max(
					entryDistance * correction,
					0.001
				),
				exitDistance: Math.max(
					exitDistance * correction,
					0.001
				),
				height: tileValue * TILESIZE,
				texturePosition,
				verticalSide,
			});
		}

		if (sideDistanceX < sideDistanceY) {
			entryDistance = sideDistanceX;
			sideDistanceX += deltaX;
			column += stepX;
			verticalSide = true;
		} else {
			entryDistance = sideDistanceY;
			sideDistanceY += deltaY;
			row += stepY;
			verticalSide = false;
		}
	}

	return segments;
}