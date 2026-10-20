import { createStartMenu } from "./startMenu";
import { createPauseMenu } from "./pauseMenu";
import { createControlsPanel } from "./controlsPanel";

import {
    createSettingsPanel,
    type SettingsPanel,
    type UISettings,
} from "./settingsPanel";

export type AppState =
    | "start"
    | "playing"
    | "paused";

export type MenuState = Exclude<AppState, "playing">;

export type UIControllerOptions = {
    onRequestPlay: () => void;

    onMenuOpened?: (state: MenuState) => void;

    getSettings: () => UISettings;
    onSettingsChange: (settings: UISettings) => void;

    onProjects?: (from: MenuState) => void;
};

export class UIController {
    private currentState: AppState = "start";

    private readonly options: UIControllerOptions;

    private readonly startMenu: HTMLElement;
    private readonly pauseMenu: HTMLElement;

    private readonly controlsPanel: HTMLDialogElement;
    private readonly settingsPanel: SettingsPanel;

    constructor(options: UIControllerOptions) {
        this.options = options;

        this.startMenu = createStartMenu();
        this.pauseMenu = createPauseMenu();

        this.controlsPanel = createControlsPanel();

        this.settingsPanel = createSettingsPanel({
            getSettings: options.getSettings,
            onChange: options.onSettingsChange,
        });

        document.body.append(
            this.startMenu,
            this.pauseMenu,
            this.controlsPanel,
            this.settingsPanel.dialog
        );

        this.bindButtons();

        this.openMenu("start");
    }

    public get state(): AppState {
        return this.currentState;
    }

    public get isPlaying(): boolean {
        return this.currentState === "playing";
    }

    public showPlaying(): void {
        this.currentState = "playing";

        this.closePanels();

        this.startMenu.hidden = true;
        this.pauseMenu.hidden = true;
    }

    public showStart(): void {
        this.openMenu("start");
    }

    public showPause(): void {
        if (this.currentState === "start") {
            return;
        }

        this.openMenu("paused");
    }

    public focusPrimaryAction(): void {
        if (this.isPlaying) {
            return;
        }

        if (this.settingsPanel.dialog.open) {
            this.settingsPanel.dialog
                .querySelector<HTMLButtonElement>(
                    'button[type="submit"]'
                )
                ?.focus();

            return;
        }

        if (this.controlsPanel.open) {
            this.controlsPanel
                .querySelector<HTMLButtonElement>(
                    'button[type="submit"]'
                )
                ?.focus();

            return;
        }

        this.getCurrentMenu()
            .querySelector<HTMLButtonElement>(
                ".start-menu__button--primary"
            )
            ?.focus();
    }

    private getCurrentMenu(): HTMLElement {
        return this.currentState === "start"
            ? this.startMenu
            : this.pauseMenu;
    }

    private openMenu(state: MenuState): void {
        this.currentState = state;

        this.closePanels();

        this.startMenu.hidden = state !== "start";
        this.pauseMenu.hidden = state !== "paused";

        this.options.onMenuOpened?.(state);

        this.focusPrimaryAction();
    }

    private closePanels(): void {
        if (this.controlsPanel.open) {
            this.controlsPanel.close();
        }

        if (this.settingsPanel.dialog.open) {
            this.settingsPanel.dialog.close();
        }
    }

    private openPanel(
        dialog: HTMLDialogElement
    ): void {
        if (this.isPlaying || dialog.open) {
            return;
        }

        this.closePanels();

        dialog.showModal();
    }

    private bindButtons(): void {
        this.bindAction(
            this.startMenu,
            "enter",
            this.options.onRequestPlay
        );

        this.bindAction(
            this.pauseMenu,
            "resume",
            this.options.onRequestPlay
        );

        this.bindAction(
            this.pauseMenu,
            "start",
            () => this.showStart()
        );

        for (const menu of [
            this.startMenu,
            this.pauseMenu,
        ]) {
            this.bindAction(
                menu,
                "settings",
                () => {
                    this.settingsPanel.refresh();

                    this.openPanel(
                        this.settingsPanel.dialog
                    );
                }
            );

            this.bindAction(
                menu,
                "controls",
                () => {
                    this.openPanel(
                        this.controlsPanel
                    );
                }
            );
        }

        const onProjects = this.options.onProjects;

        this.bindAction(
            this.startMenu,
            "projects",
            onProjects
                ? () => onProjects("start")
                : undefined
        );
    }

    private bindAction(
        menu: HTMLElement,
        action: string,
        handler: (() => void) | undefined
    ): void {
        const button =
            menu.querySelector<HTMLButtonElement>(
                `[data-menu-action="${action}"]`
            );

        if (!button) {
            throw new Error(
                `Could not find "${action}" in #${menu.id}`
            );
        }

        if (!handler) {
            button.disabled = true;
            button.title = "Coming soon";
            return;
        }

        button.disabled = false;
        button.removeAttribute("title");

        button.addEventListener("click", () => {
            handler();
        });
    }
}