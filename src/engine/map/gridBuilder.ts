import type {
	LevelDefinition,
	WallDefinition,
} from "./types";

export function buildGrid(
	level: LevelDefinition
): number[][] {
	const grid = Array.from(
		{ length: level.rows },
		() => Array<number>(level.columns).fill(0)
	);

	for (const wall of level.walls) {
		if (wall.kind === "outline") {
			outlineRectangle(grid, wall);
		} else {
			fillRectangle(
				grid,
				wall.x,
				wall.y,
				wall.width,
				wall.depth,
				wall.value
			);
		}
	}

	return grid;
}

function fillRectangle(
	grid: number[][],
	column: number,
	row: number,
	width: number,
	depth: number,
	value: number
): void {
	for (let y = row; y < row + depth; y++) {
		const gridRow = grid[y];

		if (!gridRow) {
			continue;
		}

		for (let x = column; x < column + width; x++) {
			if (x >= 0 && x < gridRow.length) {
				gridRow[x] = value;
			}
		}
	}
}

function outlineRectangle(
	grid: number[][],
	wall: WallDefinition
): void {
	fillRectangle(
		grid,
		wall.x,
		wall.y,
		wall.width,
		1,
		wall.value
	);

	fillRectangle(
		grid,
		wall.x,
		wall.y + wall.depth - 1,
		wall.width,
		1,
		wall.value
	);

	fillRectangle(
		grid,
		wall.x,
		wall.y,
		1,
		wall.depth,
		wall.value
	);

	fillRectangle(
		grid,
		wall.x + wall.width - 1,
		wall.y,
		1,
		wall.depth,
		wall.value
	);
}