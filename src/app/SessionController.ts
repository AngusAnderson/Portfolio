import type { Player } from "../engine/player";
import type { RainAudio } from "../engine/audio";
import { UIController } from "../ui/UIController";
import type { AppSettings } from "./AppSettings";

type SessionControllerOptions = {
    canvas: HTMLCanvasElement; player: Player; rainAudio: RainAudio;
    settings: AppSettings; onResetTime: () => void;
};

export class SessionController {
    private readonly ui: UIController;
    private readonly heldKeys = new Map<string, KeyboardEvent>();
    private ignoreNextUnlock = false;
    private allowUnlockedPlay = false;
    private captureRequested = false;
    private readonly options: SessionControllerOptions;

    constructor(options: SessionControllerOptions) {
        this.options = options;
        this.ui = new UIController({
            onRequestPlay: () => { void this.requestPlay(); },
            onMenuOpened: () => { this.clearHeldKeys(); this.releasePointer(); },
            getSettings: () => this.options.settings.getSettings(),
            onSettingsChange: settings => this.options.settings.apply(settings),
        });
        this.bindKeyboard(); this.bindMouse(); this.bindPointerLock(); this.bindPageEvents();
    }
    public get isPlaying(): boolean { return this.ui.isPlaying; }
    public pause(): void { this.pauseExperience(); }
    public play(): void {
        this.clearHeldKeys(); this.options.onResetTime();
        this.allowUnlockedPlay = false;
        if (this.ui.state === "project") this.ui.showPause();
        void this.requestPlay();
    }
    public showStart(): void {
        this.captureRequested = false; this.allowUnlockedPlay = false;
        this.clearHeldKeys(); this.ui.showStart(); this.releasePointer(); this.options.onResetTime();
    }
    public openProject(): void {
        if (!this.ui.isPlaying) return;
        this.captureRequested = false;
        this.clearHeldKeys(); this.ui.showProject(); this.releasePointer(); this.options.onResetTime();
    }
    public closeProject(): void {
        if (this.ui.state !== "project") return;
        this.clearHeldKeys(); this.options.onResetTime();
        if (document.hidden || !document.hasFocus()) {
            this.allowUnlockedPlay = false; this.ui.showPause(); return;
        }
        this.ui.showPlaying(); this.allowUnlockedPlay = true;
        this.options.canvas.title = "Click to resume mouse look";
        void this.requestPlay();
    }
    private clearHeldKeys(): void {
        for (const event of this.heldKeys.values()) {
            this.options.player.handleKeyUp(new KeyboardEvent("keyup", {
                key: event.key, code: event.code, location: event.location,
            }));
        }
        this.heldKeys.clear();
    }
    private releasePointer(): void {
        if (document.pointerLockElement === this.options.canvas) {
            this.ignoreNextUnlock = true; document.exitPointerLock();
        }
    }
    private enterGame(): void {
        this.clearHeldKeys(); this.options.onResetTime();
        this.ignoreNextUnlock = false; this.allowUnlockedPlay = false; this.captureRequested = false;
        this.options.canvas.removeAttribute("title"); this.ui.showPlaying();
    }
    private pauseExperience(): void {
        this.captureRequested = false; this.clearHeldKeys(); this.allowUnlockedPlay = false;
        if (this.ui.isPlaying) this.ui.showPause();
        this.releasePointer(); this.options.onResetTime();
    }
    private async requestPlay(): Promise<void> {
        const { canvas, rainAudio } = this.options;
        void rainAudio.start().catch((error: unknown) => console.error("Could not start rain audio:", error));
        if (document.pointerLockElement === canvas) { this.enterGame(); return; }
        this.captureRequested = true;
        try { await canvas.requestPointerLock(); }
        catch (error: unknown) {
            this.captureRequested = false;
            if (this.allowUnlockedPlay) { console.warn("Click the game to resume mouse look.", error); return; }
            this.ui.focusPrimaryAction(); console.error("Could not capture the mouse. Click Enter or Resume to retry.", error);
        }
    }
    private bindKeyboard(): void {
        window.addEventListener("keydown", (event: KeyboardEvent) => {
            if (!this.ui.isPlaying) return;
            if (event.code === "Escape" && document.pointerLockElement !== this.options.canvas) {
                event.preventDefault(); this.pauseExperience(); return;
            }
            this.heldKeys.set(event.code, event); this.options.player.handleKeyDown(event);
        });
        window.addEventListener("keyup", (event: KeyboardEvent) => {
            if (!this.heldKeys.has(event.code)) return;
            this.heldKeys.delete(event.code); this.options.player.handleKeyUp(event);
        });
    }
    private bindMouse(): void {
        document.addEventListener("mousemove", (event: MouseEvent) => {
            if (this.ui.isPlaying && document.pointerLockElement === this.options.canvas) this.options.player.handleMouseMove(event);
        });
        this.options.canvas.addEventListener("click", () => {
            if (this.ui.isPlaying && document.pointerLockElement !== this.options.canvas) void this.requestPlay();
        });
    }
    private bindPointerLock(): void {
        document.addEventListener("pointerlockchange", () => {
            if (document.pointerLockElement === this.options.canvas) {
                if (this.ui.state === "project" || (!this.captureRequested && !this.ui.isPlaying)) { this.releasePointer(); return; }
                this.enterGame(); return;
            }
            if (this.ignoreNextUnlock) { this.ignoreNextUnlock = false; return; }
            if (this.allowUnlockedPlay) return;
            if (this.ui.isPlaying) this.ui.showPause();
        });
        document.addEventListener("pointerlockerror", () => {
            this.captureRequested = false;
            if (this.allowUnlockedPlay) { console.warn("Click the game to resume mouse look."); return; }
            if (this.ui.isPlaying) this.ui.showPause();
            this.ui.focusPrimaryAction(); console.error("Pointer lock failed. Click Enter or Resume to retry.");
        });
    }
    private bindPageEvents(): void {
        window.addEventListener("blur", () => this.pauseExperience());
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) this.pauseExperience();
            void this.options.rainAudio.setPageVisible(!document.hidden).catch((error: unknown) => console.warn("Could not change audio playback state.", error));
        });
    }
}
