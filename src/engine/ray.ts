import { TILESIZE, WINDOW_WIDTH, WINDOW_HEIGHT } from "../settings";
import type { GameMap } from "./map";
import type { Player } from "./player";

function normalizeAngle(angle: number): number {
	let normalizedAngle = angle % (Math.PI * 2);

	if (normalizedAngle <= 0) {
		normalizedAngle += Math.PI * 2;
	}

	return normalizedAngle;
}

function distanceBetween(
	x1: number,
	y1: number,
	x2: number,
	y2: number
): number {
	const deltaX = x2 - x1;
	const deltaY = y2 - y1;

	return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

export class Ray {
	public rayAngle: number;

	public isFacingDown: boolean;
	public isFacingUp: boolean;
	public isFacingRight: boolean;
	public isFacingLeft: boolean;

	public wallHitX: number;
	public wallHitY: number;

	public distance: number;
	public color: number;

	private player: Player;
	private map: GameMap;

	constructor(angle: number, player: Player, map: GameMap) {
		this.rayAngle = normalizeAngle(angle);
		this.player = player;
		this.map = map;

		this.isFacingDown =
			this.rayAngle > 0 && this.rayAngle < Math.PI;
		this.isFacingUp = !this.isFacingDown;

		this.isFacingRight =
			this.rayAngle < 0.5 * Math.PI ||
			this.rayAngle > 1.5 * Math.PI;
		this.isFacingLeft = !this.isFacingRight;

		this.wallHitX = 0;
		this.wallHitY = 0;

		this.distance = 0;
		this.color = 255;
	}

	public cast(): void {
		this.castHorizontalRay();
		this.castVerticalRay();
		this.calculateClosestHit();
	}

	private castHorizontalRay(): void {
		let foundHorizontalWall = false;
		let horizontalHitX = 0;
		let horizontalHitY = 0;

		let firstIntersectionY: number;

		if (this.isFacingUp) {
			firstIntersectionY =
				Math.floor(this.player.y / TILESIZE) * TILESIZE - 0.01;
		} else {
			firstIntersectionY =
				Math.floor(this.player.y / TILESIZE) * TILESIZE + TILESIZE;
		}

		const firstIntersectionX =
			this.player.x +
			(firstIntersectionY - this.player.y) /
				Math.tan(this.rayAngle);

		let nextHorizontalX = firstIntersectionX;
		let nextHorizontalY = firstIntersectionY;

		let xStep: number;
		let yStep: number;

		if (this.isFacingUp) {
			yStep = -TILESIZE;
		} else {
			yStep = TILESIZE;
		}

		xStep = yStep / Math.tan(this.rayAngle);

		while (
			nextHorizontalX >= 0 &&
			nextHorizontalX <= WINDOW_WIDTH &&
			nextHorizontalY >= 0 &&
			nextHorizontalY <= WINDOW_HEIGHT
		) {
			if (this.map.hasWallAt(nextHorizontalX, nextHorizontalY) !== 0) {
				foundHorizontalWall = true;
				horizontalHitX = nextHorizontalX;
				horizontalHitY = nextHorizontalY;

				break;
			}

			nextHorizontalX += xStep;
			nextHorizontalY += yStep;
		}

		this.horizontalHit = {
			found: foundHorizontalWall,
			x: horizontalHitX,
			y: horizontalHitY,
		};
	}

	private castVerticalRay(): void {
		let foundVerticalWall = false;
		let verticalHitX = 0;
		let verticalHitY = 0;

		let firstIntersectionX: number;

		if (this.isFacingRight) {
			firstIntersectionX =
				Math.floor(this.player.x / TILESIZE) * TILESIZE + TILESIZE;
		} else {
			firstIntersectionX =
				Math.floor(this.player.x / TILESIZE) * TILESIZE - 0.01;
		}

		const firstIntersectionY =
			this.player.y +
			(firstIntersectionX - this.player.x) *
				Math.tan(this.rayAngle);

		let nextVerticalX = firstIntersectionX;
		let nextVerticalY = firstIntersectionY;

		let xStep: number;
		let yStep: number;

		if (this.isFacingRight) {
			xStep = TILESIZE;
		} else {
			xStep = -TILESIZE;
		}

		yStep = xStep * Math.tan(this.rayAngle);

		while (
			nextVerticalX >= 0 &&
			nextVerticalX <= WINDOW_WIDTH &&
			nextVerticalY >= 0 &&
			nextVerticalY <= WINDOW_HEIGHT
		) {
			if (this.map.hasWallAt(nextVerticalX, nextVerticalY) !== 0) {
				foundVerticalWall = true;
				verticalHitX = nextVerticalX;
				verticalHitY = nextVerticalY;

				break;
			}

			nextVerticalX += xStep;
			nextVerticalY += yStep;
		}

		this.verticalHit = {
			found: foundVerticalWall,
			x: verticalHitX,
			y: verticalHitY,
		};
	}

	private calculateClosestHit(): void {
		const horizontalDistance = this.horizontalHit.found
			? distanceBetween(
					this.player.x,
					this.player.y,
					this.horizontalHit.x,
					this.horizontalHit.y
				)
			: 999;

		const verticalDistance = this.verticalHit.found
			? distanceBetween(
					this.player.x,
					this.player.y,
					this.verticalHit.x,
					this.verticalHit.y
				)
			: 999;

		if (horizontalDistance < verticalDistance) {
			this.wallHitX = this.horizontalHit.x;
			this.wallHitY = this.horizontalHit.y;
			this.distance = horizontalDistance;
			this.color = 160;
		} else {
			this.wallHitX = this.verticalHit.x;
			this.wallHitY = this.verticalHit.y;
			this.distance = verticalDistance;
			this.color = 255;
		}

		this.distance *= Math.cos(
			this.player.rotationAngle - this.rayAngle
		);

		this.color *= (1 / this.distance) * 60;

		if (this.color > 255) {
			this.color = 255;
		} else if (this.color < 0) {
			this.color = 0;
		}
	}

	public render(context: CanvasRenderingContext2D): void {
		context.strokeStyle = "#ff0000";
		context.lineWidth = 1;

		context.beginPath();
		context.moveTo(this.player.x, this.player.y);
		context.lineTo(this.wallHitX, this.wallHitY);
		context.stroke();
	}

	private horizontalHit: RayHit = {
		found: false,
		x: 0,
		y: 0,
	};

	private verticalHit: RayHit = {
		found: false,
		x: 0,
		y: 0,
	};
}

type RayHit = {
	found: boolean;
	x: number;
	y: number;
};