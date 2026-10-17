import { FOV, NUM_RAYS, RES, TILESIZE, WINDOW_HEIGHT } from "../settings";
import type { GameMap } from "./map";
import type { Player } from "./player";
import { Ray } from "./ray";

export class Raycaster {
	public rays: Ray[];

	private player: Player;
	private map: GameMap;

	constructor(player: Player, map: GameMap) {
		this.rays = [];
		this.player = player;
		this.map = map;
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
	const projectionDistance = 415;

	for (let i = 0; i < this.rays.length; i++) {
		const ray = this.rays[i];

		const distance = Math.max(ray.distance, 0.001);
		const lineHeight =
			(TILESIZE / distance) * projectionDistance;

		const jumpOffset =
			(this.player.jumpHeight / distance) * projectionDistance;

		const drawBegin =
			WINDOW_HEIGHT / 2 -
			lineHeight / 2 +
			jumpOffset;

		const colour = Math.round(ray.color);

		context.fillStyle = `rgb(${colour}, ${colour}, ${colour})`;

		context.fillRect(
			i * RES,
			drawBegin,
			RES,
			lineHeight
		);
	}
}
}