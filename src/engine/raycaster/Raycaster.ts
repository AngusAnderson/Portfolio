import { FOV, NUM_RAYS } from "../../settings";

import type { GameMap } from "../map";
import type { Player } from "../player";

import {
	createCameraState,
	getHorizonY,
} from "./camera";

import { castColumn } from "./castColumn";
import { renderWalls } from "./wallRenderer";
import { renderSurfaces } from "./surfaceRenderer";
import { WallTexture } from "./textures";

import type { WallSegment } from "./types";

export class Raycaster {
	private player: Player;
	private map: GameMap;

	private columns: WallSegment[][] = [];

	private wallTexture: WallTexture;

	private projectionDistance = 415;

	constructor(player: Player, map: GameMap) {
		this.player = player;
		this.map = map;

		this.wallTexture = new WallTexture(
			`${import.meta.env.BASE_URL}assets/textures/castle-stone.png`
		);
	}

	public castAllRays(): void {
		this.columns = [];

		const camera = createCameraState(
			this.player,
			this.projectionDistance
		);

		for (let column = 0; column < NUM_RAYS; column++) {
			const cameraX =
				2 * ((column + 0.5) / NUM_RAYS) - 1;

			const rayOffset = Math.atan(
				cameraX * Math.tan(FOV / 2)
			);

			const rayAngle =
				camera.rotationAngle + rayOffset;

			const correction = Math.cos(rayOffset);

			this.columns.push(
				castColumn(
					this.map,
					camera,
					rayAngle,
					correction
				)
			);
		}
	}

	public render(context: CanvasRenderingContext2D): void {
		const camera = createCameraState(
			this.player,
			this.projectionDistance
		);

		context.save();

		context.imageSmoothingEnabled = false;
		context.globalAlpha = 1;
		context.globalCompositeOperation = "source-over";

		renderWalls(
			context,
			this.columns,
			camera,
			this.wallTexture
		);

		renderSurfaces(
			context,
			this.map,
			this.columns,
			camera
		);

		context.restore();
	}

	public get horizonY(): number {
		return getHorizonY(
			this.player.pitch,
			this.projectionDistance
		);
	}
}