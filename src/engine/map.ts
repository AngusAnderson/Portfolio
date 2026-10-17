import { TILESIZE } from "../settings";

export class GameMap {
	public grid: number[][];

	constructor() {
		this.grid = [
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
			[1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1],
			[1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1],
			[1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
			[1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1],
			[1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
			[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
			[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		];
	}

	public hasWallAt(x: number, y: number): number {
	if (!Number.isFinite(x) || !Number.isFinite(y)) {
		return 1;
	}

	const row = Math.floor(y / TILESIZE);
	const column = Math.floor(x / TILESIZE);

	return this.grid[row]?.[column] ?? 1;
}

	public render(context: CanvasRenderingContext2D): void {
		for (let row = 0; row < this.grid.length; row++) {
			for (let column = 0; column < this.grid[row].length; column++) {
				const tileX = column * TILESIZE;
				const tileY = row * TILESIZE;

				if (this.grid[row][column] === 0) {
					context.fillStyle = "rgb(255, 255, 255)";
				} else {
					context.fillStyle = "rgb(40, 40, 40)";
				}

				context.fillRect(
					tileX,
					tileY,
					TILESIZE - 1,
					TILESIZE - 1
				);
			}
		}
	}
}