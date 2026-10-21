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
            document.exitPointerLock();
        }
    }

    private enterGame(): void {
        this.clearHeldKeys();

        this.options.onResetTime();

        this.ui.showPlaying();
    }

    private pauseExperience(): void {
        this.clearHeldKeys();

        if (this.ui.isPlaying) {
            this.ui.showPause();
        }

        this.releasePointer();

        this.options.onResetTime();
    }

    private async requestPlay(): Promise<void> {
        const { canvas, rainAudio } = this.options;

        // Keep pointer lock directly connected to the click.
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
    }

    private bindPointerLock(): void {
        document.addEventListener(
            "pointerlockchange",
            () => {
                if (
                    document.pointerLockElement ===
                    this.options.canvas
                ) {
                    this.enterGame();
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
                            "Could not change audio playback state. " +
                                "Use Enter or Resume to retry.",
                            error
                        );
                    });
            }
        );
    }

    public pause(): void {
        this.pauseExperience();
    }
}