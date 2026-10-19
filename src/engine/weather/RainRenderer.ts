import { FOV, TILESIZE } from "../../settings";

import type { RainIntensity } from "../audio/rainConfig";
import type { GameMap } from "../map";
import type { Player } from "../player";

import {
	RAIN_VISUAL_PRESETS,
	type RainVisualPreset,
} from "./rainPresents";

type RainDrop = {
	x: number;
	y: number;
	z: number;

	speedMultiplier: number;
	lengthMultiplier: number;
};

type RainCamera = {
	x: number;
	y: number;
	rotationAngle: number;
	cameraHeight: number;
	horizonY: number;
	projectionDistance: number;
};

type RainView = {
	getRainCamera(): RainCamera;

	isRainVisibleAt(
		screenX: number,
		screenY: number,
		rainDepth: number
	): boolean;
};

type ProjectedPoint = {
	x: number;
	y: number;
	depth: number;
};

export class RainRenderer {
	private readonly preset: RainVisualPreset;
	private readonly drops: RainDrop[] = [];
	private readonly map: GameMap;
	private readonly player: Player;

	private readonly radius = TILESIZE * 8;

	private readonly worldScale = TILESIZE / 128;

	private width: number;
	private height: number;

	constructor(
		intensity: RainIntensity,
		map: GameMap,
		player: Player,
		width: number,
		height: number
	) {
		this.preset = RAIN_VISUAL_PRESETS[intensity];
		this.map = map;
		this.player = player;

		this.width = Math.max(1, width);
		this.height = Math.max(1, height);

		this.createDrops();
	}

	public update(deltaTime: number): void {
		const dt = Number.isFinite(deltaTime)
			? Math.max(0, Math.min(deltaTime, 0.05))
			: 0;

		for (const drop of this.drops) {
			drop.x +=
				this.preset.windSpeed *
				this.worldScale *
				drop.speedMultiplier *
				dt;

			drop.z -=
				this.preset.fallSpeed *
				this.worldScale *
				drop.speedMultiplier *
				dt;

			const outsideRainVolume =
				Math.abs(drop.x - this.player.x) > this.radius ||
				Math.abs(drop.y - this.player.y) > this.radius;

			const landed =
				drop.z <= this.getLandingHeight(
					drop.x,
					drop.y
				);

			if (outsideRainVolume || landed) {
				this.resetDrop(drop, false);
			}
		}
	}

	public render(
		context: CanvasRenderingContext2D,
		view: RainView
	): void {
		const camera = view.getRainCamera();

		context.save();

		context.globalCompositeOperation = "source-over";
		context.globalAlpha = this.preset.opacity;
		context.fillStyle = "#b8c8d8";

		for (const drop of this.drops) {
			const length =
				this.preset.streakLenth *
				this.worldScale *
				drop.lengthMultiplier;

			const endX =
				drop.x +
				length *
				(this.preset.windSpeed / this.preset.fallSpeed);

			const endZ = drop.z - length;

			const start = this.project(
				drop.x,
				drop.y,
				drop.z,
				camera
			);

			const end = this.project(
				endX,
				drop.y,
				endZ,
				camera
			);

			if (!start || !end) {
				continue;
			}

			if (
				Math.max(start.x, end.x) < 0 ||
				Math.min(start.x, end.x) >= this.width ||
				Math.max(start.y, end.y) < 0 ||
				Math.min(start.y, end.y) >= this.height
			) {
				continue;
			}

			const steps = Math.max(
				1,
				Math.ceil(
					Math.max(
						Math.abs(end.x - start.x),
						Math.abs(end.y - start.y)
					)
				)
			);

			let lastPixelX = -1;
			let lastPixelY = -1;

			for (let step = 0; step <= steps; step++) {
				const t = step / steps;

				const screenX = Math.floor(
					start.x + (end.x - start.x) * t
				);

				const screenY = Math.floor(
					start.y + (end.y - start.y) * t
				);

				if (
					screenX < 0 ||
					screenX >= this.width ||
					screenY < 0 ||
					screenY >= this.height
				) {
					continue;
				}

				if (
					screenX === lastPixelX &&
					screenY === lastPixelY
				) {
					continue;
				}

				lastPixelX = screenX;
				lastPixelY = screenY;

				const inverseDepth =
					(1 - t) / start.depth +
					t / end.depth;

				const depth = 1 / inverseDepth;

				const worldT =
					(t / end.depth) / inverseDepth;

				const worldX =
					drop.x + (endX - drop.x) * worldT;

				const worldZ =
					drop.z + (endZ - drop.z) * worldT;

				if (
					!this.canRainExistAt(
						worldX,
						drop.y,
						worldZ
					)
				) {
					continue;
				}

				if (
					!view.isRainVisibleAt(
						screenX,
						screenY,
						depth
					)
				) {
					continue;
				}

				context.fillRect(
					screenX,
					screenY,
					1,
					1
				);
			}
		}

		context.restore();
	}

	public resize(width: number, height: number): void {
		this.width = Math.max(1, width);
		this.height = Math.max(1, height);

		this.createDrops();
	}

	private project(
		x: number,
		y: number,
		z: number,
		camera: RainCamera
	): ProjectedPoint | null {
		const relativeX = x - camera.x;
		const relativeY = y - camera.y;

		const forwardX = Math.cos(camera.rotationAngle);
		const forwardY = Math.sin(camera.rotationAngle);

		const depth =
			relativeX * forwardX +
			relativeY * forwardY;

		if (depth <= TILESIZE * 0.15) {
			return null;
		}

		const sideways =
			relativeX * -forwardY +
			relativeY * forwardX;

		const horizontalProjection =
			this.width / (2 * Math.tan(FOV / 2));

		return {
			x:
				this.width / 2 +
				(sideways / depth) * horizontalProjection,

			y:
				camera.horizonY -
				((z - camera.cameraHeight) / depth) *
					camera.projectionDistance,

			depth,
		};
	}

	private canRainExistAt(
		x: number,
		y: number,
		z: number
	): boolean {
		const row = Math.floor(y / TILESIZE);
		const column = Math.floor(x / TILESIZE);

		if (
			row < 0 ||
			column < 0 ||
			row >= this.map.grid.length ||
			column >= (this.map.grid[row]?.length ?? 0)
		) {
			return false;
		}

		if (z <= this.getLandingHeight(x, y)) {
			return false;
		}

		let selected:
			(typeof this.map.environmentZones)[number] | null =
				null;

		for (const zone of this.map.environmentZones) {
			const inside =
				x >= zone.x &&
				x < zone.x + zone.width &&
				y >= zone.y &&
				y < zone.y + zone.depth &&
				z >= zone.minElevation &&
				z < zone.maxElevation;

			if (
				inside &&
				(!selected || zone.priority > selected.priority)
			) {
				selected = zone;
			}
		}

		return !(selected?.sheltered ?? false);
	}

	private getLandingHeight(
		x: number,
		y: number
	): number {
		let height = Math.max(
			0,
			this.map.getGroundHeightAt(x, y),
			this.map.hasWallAt(x, y) * TILESIZE
		);

		for (
			const platform of
			this.map.getSuspendedPlatformsAt(x, y)
		) {
			height = Math.max(
				height,
				platform.topHeight
			);
		}

		return height;
	}

	private resetDrop(
		drop: RainDrop,
		randomHeight: boolean
	): void {
		drop.x =
			this.player.x +
			(Math.random() * 2 - 1) * this.radius;

		drop.y =
			this.player.y +
			(Math.random() * 2 - 1) * this.radius;

		const ceiling = Math.max(
			TILESIZE * 6,
			this.player.elevation + TILESIZE * 6
		);

		drop.z = randomHeight
			? Math.random() * ceiling
			: ceiling;
	}

	private createDrops(): void {
		this.drops.length = 0;

		const areaScale = (this.width * this.height) / (480 * 320);

		const count = Math.min(
			3500,
			Math.max(
				1,
				Math.round(
					this.preset.dropCount *
					8 *
					areaScale
				)
			)
		);

		for (let index = 0; index < count; index++) {
			const drop: RainDrop = {
				x: 0,
				y: 0,
				z: 0,

				speedMultiplier:
					0.75 + Math.random() * 0.5,

				lengthMultiplier:
					0.7 + Math.random() * 0.6,
			};

			this.resetDrop(drop, true);
			this.drops.push(drop);
		}
	}
}