import type { Player } from "../engine/player";
import type { RainAudio } from "../engine/audio";

import { UIController } from "../ui/UIController";

import type { AppSettings } from "./AppSettings";

type SessionControllerOptions = {
    canvas: HTMLCanvasElement;
    player: Player;
    rainAudio: RainAudio;
    settings: AppSettings;

    onResetTime: () => void;
};

export class SessionController {
    private readonly options: SessionControllerOptions;
    private readonly ui: UIController;

    private readonly heldKeys =
        new Map<string, KeyboardEvent>();

    private ignoreNextUnlock = false;
    private allowUnlockedPlay = false;

    constructor(options: SessionControllerOptions) {
        this.options = options;

        this.ui = new UIController({
            onRequestPlay: () => {
                void this.requestPlay();
            },

            onMenuOpened: () => {
                this.clearHeldKeys();
                this.releasePointer();
            },

            getSettings: () => {
                return this.options.settings.getSettings();
            },

            onSettingsChange: (settings) => {
                this.options.settings.apply(settings);
            },
        });

        this.bindKeyboard();
        this.bindMouse();
        this.bindPointerLock();
        this.bindPageEvents();
    }

    public get isPlaying(): boolean {
        return this.ui.isPlaying;
    }

    public pause(): void {
        this.pauseExperience();
    }

    public openProject(): void {
        if (!this.ui.isPlaying) {
            return;
        }

        this.clearHeldKeys();

        // Change state before releasing the mouse.
        // The unlock event must not open the pause menu.
        this.ui.showProject();

        this.releasePointer();

        this.options.onResetTime();
    }

    public closeProject(): void {
        if (this.ui.state !== "project") {
            return;
        }

        this.clearHeldKeys();

        this.options.onResetTime();

        // Do not resume into an unfocused or hidden page.
        if (document.hidden || !document.hasFocus()) {
            this.allowUnlockedPlay = false;
            this.ui.showPause();
            return;
        }

        // Return directly to the world.
        this.ui.showPlaying();

        // Some browsers may reject immediate mouse recapture.
        // Keep the world visible if that happens.
        this.allowUnlockedPlay = true;

        this.options.canvas.title =
            "Click to resume mouse look";

        void this.requestPlay();
    }

    private clearHeldKeys(): void {
        for (const event of this.heldKeys.values()) {
            this.options.player.handleKeyUp(
                new KeyboardEvent("keyup", {
                    key: event.key,
                    code: event.code,
                    location: event.location,
                })
            );
        }

        this.heldKeys.clear();
    }

    private releasePointer(): void {
        if (
            document.pointerLockElement ===
            this.options.canvas
        ) {
            this.ignoreNextUnlock = true;

            document.exitPointerLock();
        }
    }

    private enterGame(): void {
        this.clearHeldKeys();

        this.options.onResetTime();

        this.ignoreNextUnlock = false;
        this.allowUnlockedPlay = false;

        this.options.canvas.removeAttribute("title");

        this.ui.showPlaying();
    }

    private pauseExperience(): void {
        this.clearHeldKeys();

        this.allowUnlockedPlay = false;

        // Leave an open project dialog in place when the
        // visitor switches tabs or windows.
        if (this.ui.isPlaying) {
            this.ui.showPause();
        }

        this.releasePointer();

        this.options.onResetTime();
    }

    private async requestPlay(): Promise<void> {
        const { canvas, rainAudio } = this.options;

        void rainAudio.start().catch((error: unknown) => {
            console.error(
                "Could not start rain audio:",
                error
            );
        });

        if (document.pointerLockElement === canvas) {
            this.enterGame();
            return;
        }

        try {
            await canvas.requestPointerLock();
        } catch (error: unknown) {
            if (this.allowUnlockedPlay) {
                console.warn(
                    "Mouse capture was not restored. " +
                        "Click the game to resume mouse look.",
                    error
                );

                return;
            }

            this.ui.focusPrimaryAction();

            console.error(
                "Could not capture the mouse. " +
                    "Click Enter or Resume to retry.",
                error
            );
        }
    }

    private bindKeyboard(): void {
        window.addEventListener(
            "keydown",
            (event: KeyboardEvent) => {
                if (!this.ui.isPlaying) {
                    return;
                }

                // Escape must still pause when gameplay has
                // resumed but mouse capture was not restored.
                if (
                    event.code === "Escape" &&
                    document.pointerLockElement !==
                        this.options.canvas
                ) {
                    event.preventDefault();

                    this.pauseExperience();
                    return;
                }

                this.heldKeys.set(event.code, event);

                this.options.player.handleKeyDown(event);
            }
        );

        window.addEventListener(
            "keyup",
            (event: KeyboardEvent) => {
                if (!this.heldKeys.has(event.code)) {
                    return;
                }

                this.heldKeys.delete(event.code);

                this.options.player.handleKeyUp(event);
            }
        );
    }

    private bindMouse(): void {
        document.addEventListener(
            "mousemove",
            (event: MouseEvent) => {
                if (
                    !this.ui.isPlaying ||
                    document.pointerLockElement !==
                        this.options.canvas
                ) {
                    return;
                }

                this.options.player.handleMouseMove(event);
            }
        );

        this.options.canvas.addEventListener("click", () => {
            if (
                !this.ui.isPlaying ||
                document.pointerLockElement ===
                    this.options.canvas
            ) {
                return;
            }

            void this.requestPlay();
        });
    }

    private bindPointerLock(): void {
        document.addEventListener(
            "pointerlockchange",
            () => {
                if (
                    document.pointerLockElement ===
                    this.options.canvas
                ) {
                    // Do not allow a delayed capture request
                    // to dismiss a project dialog.
                    if (this.ui.state === "project") {
                        this.releasePointer();
                        return;
                    }

                    this.enterGame();
                    return;
                }

                if (this.ignoreNextUnlock) {
                    this.ignoreNextUnlock = false;
                    return;
                }

                if (this.allowUnlockedPlay) {
                    return;
                }

                if (this.ui.isPlaying) {
                    this.ui.showPause();
                }
            }
        );

        document.addEventListener(
            "pointerlockerror",
            () => {
                if (this.allowUnlockedPlay) {
                    console.warn(
                        "Click the game to resume mouse look."
                    );

                    return;
                }

                if (this.ui.isPlaying) {
                    this.ui.showPause();
                }

                this.ui.focusPrimaryAction();

                console.error(
                    "Pointer lock failed. " +
                        "Click Enter or Resume to try again."
                );
            }
        );
    }

    private bindPageEvents(): void {
        window.addEventListener("blur", () => {
            this.pauseExperience();
        });

        document.addEventListener(
            "visibilitychange",
            () => {
                if (document.hidden) {
                    this.pauseExperience();
                }

                void this.options.rainAudio
                    .setPageVisible(!document.hidden)
                    .catch((error: unknown) => {
                        console.warn(
                            "Could not change audio playback state.",
                            error
                        );
                    });
            }
        );
    }
}