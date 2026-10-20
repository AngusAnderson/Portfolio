import { createStartMenu } from "./startMenu";
import { createPauseMenu } from "./pauseMenu";

export type AppState =
    | "start"
    | "playing"
    | "paused";

export type MenuState = Exclude<AppState, "playing">;

export type UIControllerOptions = {
    onRequestPlay: () => void;

    onMenuOpened?: (state: MenuState) => void;

    onSettings?: (from: MenuState) => void;

    onControls?: (from: MenuState) => void;

    onProjects?: (from: MenuState) => void;
};

export class UIController {
    private currentState: AppState = "start";

    private readonly options: UIControllerOptions;

    private readonly startMenu: HTMLElement;
    private readonly pauseMenu: HTMLElement;

    constructor(options: UIControllerOptions) {
        this.options = options;

        this.startMenu = createStartMenu();
        this.pauseMenu = createPauseMenu();

        document.body.append(
            this.startMenu,
            this.pauseMenu
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
        if (this.currentState === "playing") {
            return;
        }

        const menu = this.currentState === "start"
            ? this.startMenu
            : this.pauseMenu;

        const button =
            menu.querySelector<HTMLButtonElement>(
                ".start-menu__button--primary"
            );

        button?.focus();
    }

    private openMenu(state: MenuState): void {
        this.currentState = state;

        this.startMenu.hidden = state !== "start";
        this.pauseMenu.hidden = state !== "paused";

        this.options.onMenuOpened?.(state);

        this.focusPrimaryAction();
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

        const onSettings = this.options.onSettings;
        const onControls = this.options.onControls;
        const onProjects = this.options.onProjects;

        const menus: [HTMLElement, MenuState][] = [
            [this.startMenu, "start"],
            [this.pauseMenu, "paused"],
        ];

        for (const [menu, state] of menus) {
            this.bindAction(
                menu,
                "settings",
                onSettings
                    ? () => onSettings(state)
                    : undefined
            );

            this.bindAction(
                menu,
                "controls",
                onControls
                    ? () => onControls(state)
                    : undefined
            );
        }

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