export function createPauseMenu(): HTMLElement {
    const menu = document.createElement("section");

    menu.id = "pause-menu";
    menu.className = "start-menu";
    menu.hidden = true;

    menu.setAttribute(
        "aria-labelledby",
        "pause-menu-title"
    );

    menu.innerHTML = `
        <div class="start-menu__panel">
            <header class="start-menu__header">
                <p class="start-menu__eyebrow">
                    Take a moment
                </p>

                <span
                    class="start-menu__ornament"
                    aria-hidden="true"
                >
                    ✦
                </span>

                <h1
                    id="pause-menu-title"
                    class="start-menu__title"
                >
                    Paused
                </h1>

                <p class="start-menu__description">
                    Your place in the castle is waiting.
                </p>
            </header>

            <div
                class="start-menu__actions"
                role="group"
                aria-label="Pause menu"
            >
                <button
                    class="start-menu__button start-menu__button--primary"
                    type="button"
                    data-menu-action="resume"
                >
                    <span>Resume Exploring</span>

                    <span
                        class="start-menu__arrow"
                        aria-hidden="true"
                    >
                        →
                    </span>
                </button>

                <div class="start-menu__secondary-actions">
                    <button
                        class="start-menu__button start-menu__button--secondary"
                        type="button"
                        data-menu-action="settings"
                    >
                        Settings
                    </button>

                    <button
                        class="start-menu__button start-menu__button--secondary"
                        type="button"
                        data-menu-action="controls"
                    >
                        Controls
                    </button>
                </div>
            </div>

            <footer class="start-menu__footer">
                <p class="start-menu__note">
                    Your position is preserved.
                </p>

                <button
                    class="start-menu__text-button"
                    type="button"
                    data-menu-action="start"
                >
                    Return to start menu
                </button>
            </footer>
        </div>
    `;

    return menu;
}