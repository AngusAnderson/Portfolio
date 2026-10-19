import "./style.css";

import { WINDOW_HEIGHT, WINDOW_WIDTH } from "./settings";
import { GameMap } from "./engine/map";
import { Player } from "./engine/player";
import { Raycaster } from "./engine/raycaster";
import { EnvironmentSystem } from "./engine/environment";
import { RainAudio } from "./engine/audio";

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

const environment = new EnvironmentSystem();
environment.update(player, map);

const rainAudio = new RainAudio();
rainAudio.update(environment.current, player);

window.addEventListener("keydown", (event: KeyboardEvent) => {
	player.handleKeyDown(event);
});

window.addEventListener("keyup", (event: KeyboardEvent) => {
	player.handleKeyUp(event);
});

let previousTime: number | null = null;

canvas.addEventListener("click", async () => {
	void rainAudio.start().catch((error: unknown) => {
		console.error('Could not start rain audio:', error);
	});
	
	
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
	environment.update(player, map);
	rainAudio.update(environment.current, player);
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

	const currentEnvironment = environment.current;

	context.save();

	context.fillStyle = "rgba(0, 0, 0, 0.75)";
	context.fillRect(6, 6, 290, 78);

	context.fillStyle = "#ffffff";
	context.font = "10px monospace";
	context.textBaseline = "top";

	context.fillText(
		`Area: ${currentEnvironment.zoneName}`,
		12,
		12
	);

	context.fillText(
		`Location: ${currentEnvironment.kind}`,
		12,
		26
	);

	context.fillText(
		`Sheltered: ${currentEnvironment.sheltered}`,
		12,
		40
	);

	context.fillText(
		`Rain exposure: ${currentEnvironment.exposedToRain}`,
		12,
		54
	);

	context.fillText(
		`Cover: ${currentEnvironment.shelterSource}`,
		12,
		68
	);

	context.restore();

	requestAnimationFrame(gameLoop);
}

document.addEventListener("visibilitychange", () => {
	void rainAudio
		.setPageVisible(!document.hidden)
		.catch((error: unknown) => {
			console.warn(
				"Could not change audio playback state. Click the game to resume.",
				error
			);
		});
});

const muteButton =
	document.querySelector<HTMLButtonElement>("#rain-mute");

const volumeSlider =
	document.querySelector<HTMLInputElement>("#rain-volume");

if (muteButton) {
	muteButton.addEventListener("click", () => {
		rainAudio.setMuted(!rainAudio.isMuted);

		muteButton.textContent = rainAudio.isMuted
			? "Unmute rain"
			: "Mute rain";

		muteButton.setAttribute(
			"aria-pressed",
			String(rainAudio.isMuted)
		);

		void rainAudio.start().catch((error: unknown) => {
			console.error(
				"Could not start rain audio:",
				error
			);
		});
	});
}

if (volumeSlider) {
	volumeSlider.value = String(rainAudio.volume);

	volumeSlider.addEventListener("input", () => {
		rainAudio.setVolume(Number(volumeSlider.value));
	});
}

requestAnimationFrame(gameLoop);