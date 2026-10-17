import {
	FOV,
	NUM_RAYS,
	RES,
	TILESIZE,
	WINDOW_HEIGHT,
} from "../settings";

import type { GameMap } from "./map";
import type { Player } from "./player";

type WallSegment = {
	entryDistance: number;
	exitDistance: number;
	height: number;
	texturePosition: number;
	verticalSide: boolean;
};

export class Raycaster {
	private player: Player;
	private map: GameMap;

	private columns: WallSegment[][] = [];

	private wallTexture: HTMLImageElement;
	private textureLoaded = false;

	private projectionDistance = 415;

	// MARK: - Initialization
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

		this.wallTexture.src =
			`${import.meta.env.BASE_URL}assets/textures/castle-stone.png`;
	}

	// MARK: - Cast all Rays
	public castAllRays(): void {
		this.columns = [];

		for (let column = 0; column < NUM_RAYS; column++) {
			const cameraX =
				2 * ((column + 0.5) / NUM_RAYS) - 1;

			const rayOffset = Math.atan(
				cameraX * Math.tan(FOV / 2)
			);

			const rayAngle =
				this.player.rotationAngle + rayOffset;

			const correction = Math.cos(rayOffset);

			this.columns.push(
				this.castColumn(rayAngle, correction)
			);
		}
	}

	// MARK: - Ray Casting
	private castColumn(
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

		let column = Math.floor(this.player.x / TILESIZE);
		let row = Math.floor(this.player.y / TILESIZE);

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
			: (nextBoundaryX - this.player.x) / directionX;

		let sideDistanceY = directionY === 0
			? Infinity
			: (nextBoundaryY - this.player.y) / directionY;

		let entryDistance = 0;
		let verticalSide = false;

		const mapRows = this.map.grid.length;
		const mapColumns = this.map.grid[0]?.length ?? 0;
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

			const tileValue = this.map.grid[row]?.[column] ?? 0;

			if (tileValue > 0 && entryDistance > 0) {
				const hitX =
					this.player.x + directionX * entryDistance;

				const hitY =
					this.player.y + directionY * entryDistance;

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

	// MARK: - Rendering
	public render(context: CanvasRenderingContext2D): void {
		const cameraHeight =
			TILESIZE / 2 + this.player.jumpHeight;

		context.save();

		context.imageSmoothingEnabled = false;
		context.globalAlpha = 1;
		context.globalCompositeOperation = "source-over";

		for (let column = 0; column < this.columns.length; column++) {
			const segments = this.columns[column];

			if (!segments) {
				continue;
			}

			const screenX = column * RES;

			for (let index = segments.length - 1; index >= 0; index--) {
				const segment = segments[index];

				if (!segment) {
					continue;
				}

				this.renderSegment(
					context,
					screenX,
					segment,
					cameraHeight
				);
			}
		}

		context.restore();
	}

	// MARK: - Get Horizon
	public get horizonY(): number {
		const pitchOffset =
			Math.tan(this.player.pitch) * this.projectionDistance;

		return WINDOW_HEIGHT / 2 + pitchOffset;
	}

	// MARK: - Project Height
	private projectHeight(
		worldHeight: number,
		distance: number,
		cameraHeight: number
	): number {
		return (
			this.horizonY -
			((worldHeight - cameraHeight) / distance) *
				this.projectionDistance
		);
	}

	// MARK: - Render Wall Segment
	private renderSegment(
		context: CanvasRenderingContext2D,
		screenX: number,
		segment: WallSegment,
		cameraHeight: number
	): void {
		const distance = segment.entryDistance;

		const brightness = Math.min(1, 60 / distance);
		const sideShade = segment.verticalSide ? 1 : 0.7;

		if (cameraHeight > segment.height) {
			const nearTop = this.projectHeight(
				segment.height,
				segment.entryDistance,
				cameraHeight
			);

			const farTop = this.projectHeight(
				segment.height,
				segment.exitDistance,
				cameraHeight
			);

			const top = Math.max(
				0,
				Math.min(nearTop, farTop)
			);

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

			const top = this.projectHeight(
				upperHeight,
				distance,
				cameraHeight
			);

			const bottom = this.projectHeight(
				baseHeight,
				distance,
				cameraHeight
			);

			if (bottom <= 0 || top >= WINDOW_HEIGHT) {
				continue;
			}

			if (this.textureLoaded) {
				const textureWidth =
					this.wallTexture.naturalWidth;

				const textureHeight =
					this.wallTexture.naturalHeight;

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
					this.wallTexture,
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
}