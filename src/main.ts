import "./style.css";

import { WINDOW_HEIGHT, WINDOW_WIDTH } from "./settings";

import { GameMap } from "./engine/map";
import { Player } from "./engine/player";
import { Raycaster } from "./engine/raycaster";
import { EnvironmentSystem } from "./engine/environment";
import { RainAudio } from "./engine/audio";
import { RainRenderer } from "./engine/weather";

import { createStartMenu } from "./ui/startMenu";

// ========================================
// MARK: Canvas
// ========================================

const canvas = document.querySelector<HTMLCanvasElement>("#game");

if (!canvas) {
    throw new Error("Could not find the #game canvas element");
}

const context = (() => {
    const result = canvas.getContext("2d");

    if (!result) {
        throw new Error("Could not get a 2D canvas rendering context");
    }

    return result;
})();

canvas.width = WINDOW_WIDTH;
canvas.height = WINDOW_HEIGHT;

// ========================================
// MARK: World
// ========================================

const map = new GameMap();
const player = new Player();
const raycaster = new Raycaster(player, map);

const environment = new EnvironmentSystem();

environment.update(player, map);

// ========================================
// MARK: Rain
// ========================================

const rainAudio = new RainAudio();

rainAudio.update(environment.current, player);

const rainRenderer = new RainRenderer(
    rainAudio.intensity,
    map,
    player,
    canvas.width,
    canvas.height
);

// ========================================
// MARK: Start menu
// ========================================

const startMenu = createStartMenu();

document.body.append(startMenu);

const enterButton =
    startMenu.querySelector<HTMLButtonElement>(
        '[data-menu-action="enter"]'
    );

if (!enterButton) {
    throw new Error("Could not find the Enter the Castle button");
}

// ========================================
// MARK: Application state
// ========================================

let isPlaying = false;
let previousTime: number | null = null;

const heldKeys = new Map<string, KeyboardEvent>();

function clearHeldKeys(): void {
    for (const event of heldKeys.values()) {
        player.handleKeyUp(
            new KeyboardEvent("keyup", {
                key: event.key,
                code: event.code,
                location: event.location,
            })
        );
    }

    heldKeys.clear();
}

function showMenu(): void {
    isPlaying = false;

    clearHeldKeys();

    startMenu.hidden = false;
}

function enterGame(): void {
    clearHeldKeys();

    isPlaying = true;
    startMenu.hidden = true;

    // Avoid a large movement step when resuming.
    previousTime = null;
}

// ========================================
// MARK: Enter / resume
// ========================================

enterButton.addEventListener("click", async () => {
    // Do not wait for audio loading before requesting pointer lock.
    void rainAudio.start().catch((error: unknown) => {
        console.error("Could not start rain audio:", error);
    });

    if (document.pointerLockElement === canvas) {
        enterGame();
        return;
    }

    try {
        await canvas.requestPointerLock();
    } catch (error: unknown) {
        showMenu();

        console.error(
            "Could not capture the mouse. Click Enter the Castle to retry.",
            error
        );
    }
});

// ========================================
// MARK: Keyboard input
// ========================================

window.addEventListener("keydown", (event: KeyboardEvent) => {
    if (!isPlaying) {
        return;
    }

    heldKeys.set(event.code, event);

    player.handleKeyDown(event);
});

window.addEventListener("keyup", (event: KeyboardEvent) => {
    if (!heldKeys.has(event.code)) {
        return;
    }

    heldKeys.delete(event.code);

    player.handleKeyUp(event);
});

// ========================================
// MARK: Mouse input
// ========================================

document.addEventListener("mousemove", (event: MouseEvent) => {
    if (
        !isPlaying ||
        document.pointerLockElement !== canvas
    ) {
        return;
    }

    player.handleMouseMove(event);
});

// ========================================
// MARK: Pointer lock
// ========================================

document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement === canvas) {
        enterGame();
    } else {
        showMenu();

        enterButton.focus();
    }
});

document.addEventListener("pointerlockerror", () => {
    showMenu();

    console.error(
        "Pointer lock failed. Click Enter the Castle to try again."
    );
});

// ========================================
// MARK: Window focus
// ========================================

window.addEventListener("blur", () => {
    showMenu();

    if (document.pointerLockElement === canvas) {
        document.exitPointerLock();
    }
});

// ========================================
// MARK: Page visibility / audio
// ========================================

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        showMenu();

        if (document.pointerLockElement === canvas) {
            document.exitPointerLock();
        }

        previousTime = null;
    }

    void rainAudio
        .setPageVisible(!document.hidden)
        .catch((error: unknown) => {
            console.warn(
                "Could not change audio playback state. " +
                    "Use Enter the Castle to resume audio.",
                error
            );
        });
});

// ========================================
// MARK: Existing audio controls
// ========================================

const muteButton =
    document.querySelector<HTMLButtonElement>("#rain-mute");

const volumeSlider =
    document.querySelector<HTMLInputElement>("#rain-volume");

if (muteButton) {
    muteButton.textContent = rainAudio.isMuted
        ? "Unmute rain"
        : "Mute rain";

    muteButton.setAttribute(
        "aria-pressed",
        String(rainAudio.isMuted)
    );

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

// ========================================
// MARK: Game loop
// ========================================

function gameLoop(timestamp: number): void {
    const deltaTime = previousTime === null
        ? 0
        : Math.max(
            0,
            Math.min(
                (timestamp - previousTime) / 1000,
                0.05
            )
        );

    previousTime = timestamp;

    // Player movement is disabled while a menu is open.
    if (isPlaying) {
        player.update(map, deltaTime);
    }

    // Keep the environment and weather active behind the menu.
    environment.update(player, map);

    rainAudio.update(
        environment.current,
        player
    );

    rainRenderer.update(deltaTime);

    raycaster.castAllRays();

    // ====================================
    // MARK: Background
    // ====================================

    const horizon = Math.max(
        0,
        Math.min(
            WINDOW_HEIGHT,
            raycaster.horizonY
        )
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

    // ====================================
    // MARK: World and rain
    // ====================================

    raycaster.render(context);

    rainRenderer.render(
        context,
        raycaster
    );

    requestAnimationFrame(gameLoop);
}

// ========================================
// MARK: Initial state
// ========================================

showMenu();

requestAnimationFrame(gameLoop);