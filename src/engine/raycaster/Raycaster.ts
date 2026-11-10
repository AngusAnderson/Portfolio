import { FOV, NUM_RAYS, RES, WINDOW_HEIGHT } from "../../settings";

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
import { getRainSceneDepth } from "./rainVisibility";

import type { WallSegment, CameraState } from "./types";

export class Raycaster {
	private player: Player;
	private map: GameMap;

	private columns: WallSegment[][] = [];

	private wallTexture: WallTexture;

	private projectionDistance = 415;

	private rainCamera: CameraState | null = null;
	private readonly rainDepthCache = new Map<number, number>();

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

		this.rainCamera = camera;
		this.rainDepthCache.clear();

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

	public getRainCamera(): CameraState {
		return this.rainCamera ?? createCameraState(
			this.player,
			this.projectionDistance
		);
	}

	public isRainVisibleAt(
		screenX: number,
		screenY: number,
		rainDepth: number
	): boolean {
		if (
			!Number.isFinite(screenX) ||
			!Number.isFinite(screenY) ||
			!Number.isFinite(rainDepth) ||
			rainDepth <= 0
		) {
			return false;
		}

		const column = Math.floor(screenX / RES);
		const row = Math.floor(screenY);

		if (
			column < 0 ||
			column >= NUM_RAYS ||
			row < 0 ||
			row >= WINDOW_HEIGHT
		) {
			return false;
		}

		const key = row * NUM_RAYS + column;

		let sceneDepth = this.rainDepthCache.get(key);

		if (sceneDepth === undefined) {
			sceneDepth = getRainSceneDepth(
				column,
				row,
				this.map,
				this.columns,
				this.getRainCamera()
			);

			this.rainDepthCache.set(key, sceneDepth);
		}

		return rainDepth < sceneDepth - 0.01;
	}

	public getWorldCamera(): CameraState {
		return this.getRainCamera();
	}

	public isWorldPointVisible(
		screenX: number,
		screenY: number,
		depth: number
	): boolean {
		return this.isRainVisibleAt(screenX, screenY, depth);
	}
}