import { TILESIZE } from "../settings";

export type Ramp = {
	x: number;
	y: number;
	width: number;
	depth: number;
	startHeight: number;
	endHeight: number;
	direction: "north" | "south" | "east" | "west";
};

export type Platform = {
	x: number;
	y: number;
	width: number;
	depth: number;
	height: number;
};

export type SuspendedPlatform = {
	x: number;
	y: number;
	width: number;
	depth: number;
	bottomHeight: number;
	topHeight: number;
};

export const LEVEL_COLS = 31;
export const LEVEL_ROWS = 29;

export const PLAYER_SPAWN = {
	x: 15.5 * TILESIZE,
	y: 26.5 * TILESIZE,
	rotationAngle: -Math.PI / 2,
};

export class GameMap {
	public grid: number[][];

	public ramps: Ramp[] = [];

	public suspendedPlatforms: SuspendedPlatform[] = [];

	constructor() {
		this.grid = Array.from(
			{ length: LEVEL_ROWS },
			() => Array<number>(LEVEL_COLS).fill(0)
		);

		this.buildWalls();
		this.buildGroundSurfaces();
		this.buildSuspendedPlatforms();
	}

	// MARK: - Wall Layout
	private buildWalls(): void {
		// Outer level boundary.
		this.outlineRectangle(
			0,
			0,
			LEVEL_COLS,
			LEVEL_ROWS,
			1
		);

		// Castle perimeter:
		// X = 5 through 25, Y = 2 through 20.
		this.outlineRectangle(5, 2, 21, 19, 3);

		// Three-tile-wide main gateway.
		this.fillRectangle(14, 20, 3, 1, 0);

		// Tall front corner towers.
		this.fillRectangle(5, 18, 3, 3, 4);
		this.fillRectangle(23, 18, 3, 3, 4);

		// Tall rear corner towers.
		this.fillRectangle(5, 2, 3, 3, 4);
		this.fillRectangle(23, 2, 3, 3, 4);

		// Raised keep enclosure.
		// Interior: columns 11–19, rows 4–8.
		this.outlineRectangle(10, 3, 11, 7, 3);

		// Keep entrance, aligned with its approach ramp.
		this.fillRectangle(14, 9, 3, 1, 0);

		// Left side chamber.
		this.outlineRectangle(6, 5, 4, 5, 2);
		this.fillRectangle(7, 9, 2, 1, 0);

		// Right side chamber.
		this.outlineRectangle(21, 5, 4, 5, 2);
		this.fillRectangle(22, 9, 2, 1, 0);
	}

	private fillRectangle(
		column: number,
		row: number,
		width: number,
		depth: number,
		value: number
	): void {
		for (let y = row; y < row + depth; y++) {
			const gridRow = this.grid[y];

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

	private outlineRectangle(
		column: number,
		row: number,
		width: number,
		depth: number,
		value: number
	): void {
		this.fillRectangle(column, row, width, 1, value);

		this.fillRectangle(
			column,
			row + depth - 1,
			width,
			1,
			value
		);

		this.fillRectangle(column, row, 1, depth, value);

		this.fillRectangle(
			column + width - 1,
			row,
			1,
			depth,
			value
		);
	}

	// MARK: - Ground Surfaces
	private buildGroundSurfaces(): void {
		// Main ramp rising north towards the keep.
		// Low edge: Y = 16 tiles.
		// High edge: Y = 12 tiles.
		this.ramps.push({
			x: 14 * TILESIZE,
			y: 12 * TILESIZE,
			width: 3 * TILESIZE,
			depth: 4 * TILESIZE,
			startHeight: 0,
			endHeight: TILESIZE,
			direction: "north",
		});

		// Raised approach between the main ramp and keep.
		this.addPlatform({
			x: 14 * TILESIZE,
			y: 9 * TILESIZE,
			width: 3 * TILESIZE,
			depth: 3 * TILESIZE,
			height: TILESIZE,
		});

		// Raised floor inside the keep.
		this.addPlatform({
			x: 11 * TILESIZE,
			y: 4 * TILESIZE,
			width: 9 * TILESIZE,
			depth: 5 * TILESIZE,
			height: TILESIZE,
		});

		// Left bridge-access ramp.
		// Rises south from the courtyard to the bridge.
		this.ramps.push({
			x: 8 * TILESIZE,
			y: 13 * TILESIZE,
			width: 2 * TILESIZE,
			depth: 4 * TILESIZE,
			startHeight: 0,
			endHeight: TILESIZE + 8,
			direction: "south",
		});

		// Right bridge-access ramp.
		this.ramps.push({
			x: 21 * TILESIZE,
			y: 13 * TILESIZE,
			width: 2 * TILESIZE,
			depth: 4 * TILESIZE,
			startHeight: 0,
			endHeight: TILESIZE + 8,
			direction: "south",
		});
	}

	public addPlatform(platform: Platform): void {
		this.ramps.push({
			x: platform.x,
			y: platform.y,
			width: platform.width,
			depth: platform.depth,
			startHeight: platform.height,
			endHeight: platform.height,
			direction: "north",
		});
	}

	// MARK: - Suspended Platforms
	private buildSuspendedPlatforms(): void {
		this.suspendedPlatforms.push({
			x: 8 * TILESIZE,
			y: 17 * TILESIZE,
			width: 15 * TILESIZE,
			depth: 2 * TILESIZE,
			bottomHeight: TILESIZE,
			topHeight: TILESIZE + 8,
		});
	}

	public getSuspendedPlatformsAt(
		x: number,
		y: number
	): SuspendedPlatform[] {
		return this.suspendedPlatforms.filter((platform) => {
			return (
				x >= platform.x &&
				x < platform.x + platform.width &&
				y >= platform.y &&
				y < platform.y + platform.depth
			);
		});
	}

	// MARK: - Ground Height
	public getGroundHeightAt(x: number, y: number): number {
		for (const ramp of this.ramps) {
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

	public getSupportHeightAt(
		x: number,
		y: number,
		feetHeight: number,
		maxStepUp: number = 0
	): number {
		let supportHeight = this.getGroundHeightAt(x, y);

		for (const platform of this.getSuspendedPlatformsAt(x, y)) {
			if (
				platform.topHeight <= feetHeight + maxStepUp &&
				platform.topHeight > supportHeight
			) {
				supportHeight = platform.topHeight;
			}
		}

		return supportHeight;
	}

	// MARK: - Wall Collision
	public hasWallAt(x: number, y: number): number {
		if (!Number.isFinite(x) || !Number.isFinite(y)) {
			return 1;
		}

		const row = Math.floor(y / TILESIZE);
		const column = Math.floor(x / TILESIZE);

		return this.grid[row]?.[column] ?? 1;
	}

	// MARK: - Top-Down Debug Rendering
	public render(context: CanvasRenderingContext2D): void {
		context.save();

		for (let row = 0; row < this.grid.length; row++) {
			const gridRow = this.grid[row];

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

		// Gold: solid ramps and raised floors.
		context.fillStyle = "rgba(210, 165, 45, 0.65)";

		for (const ramp of this.ramps) {
			context.fillRect(
				ramp.x,
				ramp.y,
				ramp.width,
				ramp.depth
			);
		}

		// Blue: suspended bridge.
		context.fillStyle = "rgba(45, 140, 220, 0.65)";

		for (const platform of this.suspendedPlatforms) {
			context.fillRect(
				platform.x,
				platform.y,
				platform.width,
				platform.depth
			);
		}

		context.restore();
	}
}