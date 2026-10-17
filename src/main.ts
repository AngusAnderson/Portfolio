import "./style.css";

import { WINDOW_HEIGHT, WINDOW_WIDTH } from "./settings";
import { GameMap } from "./engine/map";
import { Player } from "./engine/player";
import { Raycaster } from "./engine/raycaster";

const canvas = document.querySelector<HTMLCanvasElement>("#game");

if (!canvas) {
	throw new Error("Could not find the #game canvas element");
}

const context = canvas.getContext("2d");

if (!context) {
	throw new Error("Could not get a 2D canvas rendering context");
}

canvas.width = WINDOW_WIDTH;
canvas.height = WINDOW_HEIGHT;

const map = new GameMap();
const player = new Player();
const raycaster = new Raycaster(player, map);

window.addEventListener("keydown", (event: KeyboardEvent) => {
	player.handleKeyDown(event);
});

window.addEventListener("keyup", (event: KeyboardEvent) => {
	player.handleKeyUp(event);
});

let previousTime: number | null = null;

canvas.addEventListener("click", async () => {
	if (document.pointerLockElement === canvas) {
		return;
	}

	try {
		await canvas.requestPointerLock();
	} catch (error) {
		console.error("Could not capture the mouse:", error);
	}
});

document.addEventListener("mousemove", (event: MouseEvent) => {
	if (document.pointerLockElement !== canvas) {
		return;
	}

	player.handleMouseMove(event);
});

document.addEventListener("pointerlockerror", () => {
	console.error(
		"Pointer lock failed. Click the game again to try capturing the mouse."
	);
});

function gameLoop(timestamp: number): void {
	const deltaTime = previousTime === null
		? 0
		: (timestamp - previousTime) / 1000;

	previousTime = timestamp;

	player.update(map, deltaTime);
	raycaster.castAllRays();

	if (!context) {
		throw new Error("Could not load the canvas context");
	}

	const horizon = Math.max(
		0,
		Math.min(WINDOW_HEIGHT, raycaster.horizonY)
	);

	// Sky / ceiling.
	context.fillStyle = "#252530";
	context.fillRect(
		0,
		0,
		WINDOW_WIDTH,
		horizon
	);

	// Ground.
	context.fillStyle = "#454039";
	context.fillRect(
		0,
		horizon,
		WINDOW_WIDTH,
		WINDOW_HEIGHT - horizon
	);

	// Uncomment these for the top-down debugging view:
	// map.render(context);
	// player.render(context);

	raycaster.render(context);

	requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);