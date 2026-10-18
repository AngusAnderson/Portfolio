import {
	FOV,
	NUM_RAYS,
	RES,
	TILESIZE,
	WINDOW_HEIGHT,
} from "../settings";

import type { GameMap, Ramp, SuspendedPlatform } from "./map";
import type { Player } from "./player";

type WallSegment = {
	entryDistance: number;
	exitDistance: number;
	height: number;
	texturePosition: number;
	verticalSide: boolean;
};

type RampHit = {
	distance: number;
	x: number;
	y: number;
	isTop: boolean;
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
		const cameraHeight = TILESIZE / 2 + this.player.elevation;

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

		this.renderRamps(context, cameraHeight);

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

		// MARK: - Render Ramps
	private renderRamps(
		context: CanvasRenderingContext2D,
		cameraHeight: number
	): void {
		if (
			this.map.ramps.length === 0 &&
			this.map.suspendedPlatforms.length === 0
		) {
			return;
		}

		const forwardX = Math.cos(this.player.rotationAngle);
		const forwardY = Math.sin(this.player.rotationAngle);

		const rightX = -forwardY;
		const rightY = forwardX;

		const halfFovTangent = Math.tan(FOV / 2);
		const horizon = this.horizonY;

		for (let column = 0; column < NUM_RAYS; column++) {
			const cameraX =
				2 * ((column + 0.5) / NUM_RAYS) - 1;

			const directionX =
				forwardX + rightX * cameraX * halfFovTangent;

			const directionY =
				forwardY + rightY * cameraX * halfFovTangent;

			const walls = this.columns[column] ?? [];

			for (let screenY = 0; screenY < WINDOW_HEIGHT; screenY++) {
				const directionZ =
					(horizon - (screenY + 0.5)) /
					this.projectionDistance;

				let nearestHit: RampHit | null = null;

				for (const platform of this.map.suspendedPlatforms) {
					const hit = this.intersectSuspendedPlatform(
						platform,
						directionX,
						directionY,
						directionZ,
						cameraHeight
					);

					if (
						hit &&
						(!nearestHit ||
							hit.distance < nearestHit.distance)
					) {
						nearestHit = hit;
					}
				}

				for (const ramp of this.map.ramps) {
					const hit = this.intersectRamp(
						ramp,
						directionX,
						directionY,
						directionZ,
						cameraHeight
					);

					if (
						hit &&
						(!nearestHit ||
							hit.distance < nearestHit.distance)
					) {
						nearestHit = hit;
					}
				}

				if (!nearestHit) {
					continue;
				}

				if (
					this.wallBlocksRamp(
						walls,
						nearestHit.distance,
						directionZ,
						cameraHeight
					)
				) {
					continue;
				}

				// Using a checkboard pattern as a temporary texture. You snooze you lose.
				const checkerSize = TILESIZE / 4;

				const checker =
					(
						Math.floor(nearestHit.x / checkerSize) +
						Math.floor(nearestHit.y / checkerSize)
					) % 2;

				const baseColour = nearestHit.isTop
					? (checker === 0 ? 155 : 115)
					: 85;

				const brightness = Math.max(
					0.2,
					Math.min(1, 100 / nearestHit.distance)
				);

				const shade = Math.round(
					baseColour * brightness
				);

				context.fillStyle =
					`rgb(${shade}, ${shade}, ${shade})`;

				context.fillRect(
					column * RES,
					screenY,
					RES,
					1
				);
			}
		}
	}

	// MARK: - Ramp Surface Intersection
	private intersectRamp(
		ramp: Ramp,
		directionX: number,
		directionY: number,
		directionZ: number,
		cameraHeight: number
	): RampHit | null {
		const epsilon = 0.000001;

		if (ramp.width <= 0 || ramp.depth <= 0) {
			return null;
		}

		const rise = ramp.endHeight - ramp.startHeight;

		let slopeX = 0;
		let slopeY = 0;

		let cornerHeight = ramp.startHeight;

		switch (ramp.direction) {
			case "north":
				slopeY = -rise / ramp.depth;
				cornerHeight = ramp.endHeight;
				break;

			case "south":
				slopeY = rise / ramp.depth;
				break;

			case "east":
				slopeX = rise / ramp.width;
				break;

			case "west":
				slopeX = -rise / ramp.width;
				cornerHeight = ramp.endHeight;
				break;
		}

		const minX = ramp.x;
		const maxX = ramp.x + ramp.width;
		const minY = ramp.y;
		const maxY = ramp.y + ramp.depth;

		let nearest: RampHit | null = null;

		const considerHit = (
			distance: number,
			isTop: boolean
		): void => {
			if (
				!Number.isFinite(distance) ||
				distance <= epsilon
			) {
				return;
			}

			const x =
				this.player.x + directionX * distance;

			const y =
				this.player.y + directionY * distance;

			if (
				x < minX - epsilon ||
				x > maxX + epsilon ||
				y < minY - epsilon ||
				y > maxY + epsilon
			) {
				return;
			}

			const z =
				cameraHeight + directionZ * distance;

			const surfaceHeight =
				cornerHeight +
				slopeX * (x - ramp.x) +
				slopeY * (y - ramp.y);

			if (!isTop) {
				if (
					z < -epsilon ||
					z > surfaceHeight + epsilon
				) {
					return;
				}
			}

			if (!nearest || distance < nearest.distance) {
				nearest = {
					distance,
					x,
					y,
					isTop,
				};
			}
		};

		const denominator =
			directionZ -
			slopeX * directionX -
			slopeY * directionY;

		if (Math.abs(denominator) > epsilon) {
			const heightAtCameraXY =
				cornerHeight +
				slopeX * (this.player.x - ramp.x) +
				slopeY * (this.player.y - ramp.y);

			const distance =
				(heightAtCameraXY - cameraHeight) /
				denominator;

			considerHit(distance, true);
		}

		if (Math.abs(directionX) > epsilon) {
			considerHit(
				(minX - this.player.x) / directionX,
				false
			);

			considerHit(
				(maxX - this.player.x) / directionX,
				false
			);
		}

		if (Math.abs(directionY) > epsilon) {
			considerHit(
				(minY - this.player.y) / directionY,
				false
			);

			considerHit(
				(maxY - this.player.y) / directionY,
				false
			);
		}

		return nearest;
	}

	// MARK: - Ramp Occlusion
	private wallBlocksRamp(
		walls: WallSegment[],
		rampDistance: number,
		directionZ: number,
		cameraHeight: number
	): boolean {
		const epsilon = 0.000001;

		for (const wall of walls) {
			if (wall.entryDistance >= rampDistance) {
				break;
			}

			let verticalEntry: number;
			let verticalExit: number;

			if (Math.abs(directionZ) < epsilon) {
				if (
					cameraHeight < 0 ||
					cameraHeight > wall.height
				) {
					continue;
				}

				verticalEntry = -Infinity;
				verticalExit = Infinity;
			} else {
				const groundDistance =
					-cameraHeight / directionZ;

				const topDistance =
					(wall.height - cameraHeight) /
					directionZ;

				verticalEntry = Math.min(
					groundDistance,
					topDistance
				);

				verticalExit = Math.max(
					groundDistance,
					topDistance
				);
			}

			const entry = Math.max(
				wall.entryDistance,
				verticalEntry,
				0
			);

			const exit = Math.min(
				wall.exitDistance,
				verticalExit
			);

			if (
				entry <= exit &&
				entry < rampDistance - epsilon
			) {
				return true;
			}
		}

		return false;
	}

	// MARK: - Suspended Platform Intersection
	private intersectSuspendedPlatform(
		platform: SuspendedPlatform,
		directionX: number,
		directionY: number,
		directionZ: number,
		cameraHeight: number
	): RampHit | null {
		const epsilon = 0.000001;

		if (
			platform.width <= 0 ||
			platform.depth <= 0 ||
			platform.topHeight <= platform.bottomHeight
		) {
			return null;
		}

		const origins = [
			this.player.x,
			this.player.y,
			cameraHeight,
		];

		const directions = [
			directionX,
			directionY,
			directionZ,
		];

		const minimums = [
			platform.x,
			platform.y,
			platform.bottomHeight,
		];

		const maximums = [
			platform.x + platform.width,
			platform.y + platform.depth,
			platform.topHeight,
		];

		let entryDistance = -Infinity;
		let exitDistance = Infinity;

		for (let axis = 0; axis < 3; axis++) {
			const origin = origins[axis]!;
			const direction = directions[axis]!;
			const minimum = minimums[axis]!;
			const maximum = maximums[axis]!;

			if (Math.abs(direction) < epsilon) {
				if (origin < minimum || origin > maximum) {
					return null;
				}

				continue;
			}

			const first = (minimum - origin) / direction;
			const second = (maximum - origin) / direction;

			const near = Math.min(first, second);
			const far = Math.max(first, second);

			entryDistance = Math.max(entryDistance, near);
			exitDistance = Math.min(exitDistance, far);

			if (entryDistance > exitDistance) {
				return null;
			}
		}

		if (exitDistance <= epsilon) {
			return null;
		}

		const distance = entryDistance > epsilon
			? entryDistance
			: exitDistance;

		if (!Number.isFinite(distance)) {
			return null;
		}

		const hitZ = cameraHeight + directionZ * distance;

		return {
			distance,
			x: this.player.x + directionX * distance,
			y: this.player.y + directionY * distance,
			isTop:
				Math.abs(hitZ - platform.topHeight) < 0.001,
		};
	}
}