import {
	FOV,
	NUM_RAYS,
	RES,
	TILESIZE,
	WINDOW_HEIGHT,
} from "../settings";

import type { GameMap } from "./map";
import type { Player } from "./player";
import { Ray } from "./ray";

export class Raycaster {
	public rays: Ray[] = [];

	private player: Player;
	private map: GameMap;

	private wallTexture: HTMLImageElement;
	private textureLoaded: boolean = false;

	constructor(player: Player, map: GameMap) {
		this.player = player;
		this.map = map;

		this.wallTexture = new Image();

		this.wallTexture.onload = () => {
			this.textureLoaded = true;
		};

		this.wallTexture.onerror = () => {
			console.error(
				"Could not load the wall texture:",
				this.wallTexture.src
			);
		};

		this.wallTexture.src = `${import.meta.env.BASE_URL}assets/textures/castle-stone.png`;
	}

	public castAllRays(): void {
		this.rays = [];

		let rayAngle = this.player.rotationAngle - FOV / 2;

		for (let i = 0; i < NUM_RAYS; i++) {
			const ray = new Ray(rayAngle, this.player, this.map);

			ray.cast();
			this.rays.push(ray);

			rayAngle += FOV / NUM_RAYS;
		}
	}

	public render(context: CanvasRenderingContext2D): void {
		context.save();
		context.imageSmoothingEnabled = false;

		for (let i = 0; i < this.rays.length; i++) {
			const ray = this.rays[i];

			if (!Number.isFinite(ray.distance)) {
				continue;
			}

			const distance = Math.max(ray.distance, 0.001);
			const projectionDistance = 415;

			const lineHeight =
				(TILESIZE / distance) * projectionDistance;

			const jumpOffset =
				(this.player.jumpHeight / distance) * projectionDistance;

			const drawBegin =
				WINDOW_HEIGHT / 2 - lineHeight / 2 + jumpOffset;

			const screenX = i * RES;
			const brightness = Math.max(
				0,
				Math.min(1, ray.color / 255)
			);

			if (!this.textureLoaded) {
				const shade = Math.round(brightness * 255);

				context.fillStyle =
					`rgb(${shade}, ${shade}, ${shade})`;

				context.fillRect(
					screenX,
					drawBegin,
					RES,
					lineHeight
				);

				continue;
			}

			const wallCoordinate = ray.hitVertical
				? ray.wallHitY
				: ray.wallHitX;

			const positionInTile =
				((wallCoordinate % TILESIZE) + TILESIZE) % TILESIZE;

			const texturePosition = positionInTile / TILESIZE;
			const textureWidth = this.wallTexture.naturalWidth;
			const textureHeight = this.wallTexture.naturalHeight;

			let textureX = Math.min(
				textureWidth - 1,
				Math.floor(texturePosition * textureWidth)
			);

			if (
				(ray.hitVertical && ray.isFacingRight) ||
				(!ray.hitVertical && ray.isFacingUp)
			) {
				textureX = textureWidth - textureX - 1;
			}

			context.drawImage(
				this.wallTexture,

				textureX,
				0,
				1,
				textureHeight,

				screenX,
				drawBegin,
				RES,
				lineHeight
			);

			context.fillStyle = `rgba(0, 0, 0, ${1 - brightness})`;

			context.fillRect(
				screenX,
				drawBegin,
				RES,
				lineHeight
			);
		}

		context.restore();
	}
}