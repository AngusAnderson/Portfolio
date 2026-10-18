import { TILESIZE } from "../../settings";
import type { MapGeometry } from "./types";

export function renderMapDebug(
	context: CanvasRenderingContext2D,
	map: MapGeometry
): void {
	context.save();

	for (let row = 0; row < map.grid.length; row++) {
		const gridRow = map.grid[row];

		if (!gridRow) {
			continue;
		}

		for (let column = 0; column < gridRow.length; column++) {
			const value = gridRow[column] ?? 0;

			if (value === 0) {
				context.fillStyle = "#dedede";
			} else {
				const shade = Math.max(
					25,
					130 - value * 25
				);

				context.fillStyle =
					`rgb(${shade}, ${shade}, ${shade})`;
			}

			context.fillRect(
				column * TILESIZE,
				row * TILESIZE,
				TILESIZE - 1,
				TILESIZE - 1
			);
		}
	}

	context.fillStyle = "rgba(210, 165, 45, 0.65)";

	for (const ramp of map.ramps) {
		context.fillRect(
			ramp.x,
			ramp.y,
			ramp.width,
			ramp.depth
		);
	}

	context.fillStyle = "rgba(45, 140, 220, 0.65)";

	for (const platform of map.suspendedPlatforms) {
		context.fillRect(
			platform.x,
			platform.y,
			platform.width,
			platform.depth
		);
	}

	context.restore();
}