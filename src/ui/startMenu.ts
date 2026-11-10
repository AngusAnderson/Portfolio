import "./ui.css";
import "./retroMenu.css";

import { PROJECTS } from "../data/projects";

import {
    chooseStartupVariant,
    getStartupPreference,
    saveStartupPreference,
    type StartupPreference,
} from "./startupTheme";

export function createStartMenu(): HTMLElement {
    const variant = chooseStartupVariant();
    const isSystems = variant === "anderson-systems";

    const menu = document.createElement("section");

    menu.id = "start-menu";
    menu.className = "start-menu retro-menu";
    menu.dataset.variant = variant;
    menu.setAttribute("aria-label", "Portfolio start menu");

    menu.innerHTML = `
        <div class="retro-shell">
            <div class="retro-topline">
                <span>${isSystems ? "ANDERSON SYSTEMS" : "AA/OS"}</span>
                <span>PERSONAL COMPUTING ENVIRONMENT</span>
            </div>

            <section
                class="retro-boot"
                aria-labelledby="retro-boot-title"
            >
                <p class="retro-eyebrow">PERSONAL ARCHIVE SYSTEM</p>

                <h1
                    id="retro-boot-title"
                    class="retro-logo"
                >
                    ${
                        isSystems
                            ? `<span>ANDERSON</span><small>SYSTEMS</small>`
                            : `<span>AA/OS</span><small>PERSONAL ARCHIVE</small>`
                    }
                </h1>

                <div class="retro-boot-log" aria-live="polite">
                    <p>DISPLAY INTERFACE ................. READY</p>
                    <p>PROJECT INDEX ..................... READY</p>
                    <p data-asset-status>PREPARING PROJECT IMAGES</p>
                </div>

                <div class="retro-progress-heading">
                    <span data-boot-status>INITIALISING PORTFOLIO</span>
                    <span data-progress-label>0%</span>
                </div>

                <progress
                    class="retro-progress"
                    max="100"
                    value="0"
                    aria-label="Project image preparation"
                ></progress>

                <button
                    class="retro-continue"
                    type="button"
                    disabled
                >
                    PREPARING ARCHIVE
                </button>

                <p class="retro-small">
                    ANGUS ANDERSON / INTERACTIVE PORTFOLIO
                </p>
            </section>

            <section
                class="retro-home"
                aria-labelledby="start-menu-title"
                hidden
            >
                <header class="retro-heading">
                    <p class="retro-eyebrow">
                        ${
                            isSystems
                                ? "PERSONAL COMPUTING ENVIRONMENT"
                                : "PERSONAL ARCHIVE SYSTEM"
                        }
                    </p>

                    <h1 id="start-menu-title" class="retro-logo">
                        ${
                            isSystems
                                ? `<span>ANDERSON</span><small>SYSTEMS</small>`
                                : `<span>AA/OS</span><small>ANGUS ANDERSON</small>`
                        }
                    </h1>
                </header>

                <div class="retro-divider">
                    <span>MAIN MENU</span>
                </div>

                <nav
                    class="retro-actions"
                    aria-label="Main menu"
                >
                    <button
                        id="enter-castle-button"
                        class="retro-action start-menu__button--primary"
                        type="button"
                        data-menu-action="enter"
                    >
                        <span class="retro-number">01</span>
                        <span>ENTER EXPERIENCE</span>
                    </button>

                    <button
                        class="retro-action"
                        type="button"
                        data-menu-action="projects"
                    >
                        <span class="retro-number">02</span>
                        <span>PROJECT ARCHIVE</span>
                    </button>

                    <button
                        class="retro-action"
                        type="button"
                        data-retro-action="about"
                    >
                        <span class="retro-number">03</span>
                        <span>ABOUT ME</span>
                    </button>

                    <button
                        class="retro-action"
                        type="button"
                        data-menu-action="controls"
                    >
                        <span class="retro-number">04</span>
                        <span>CONTROLS</span>
                    </button>

                    <button
                        class="retro-action"
                        type="button"
                        data-menu-action="settings"
                    >
                        <span class="retro-number">05</span>
                        <span>SETTINGS</span>
                    </button>

                    <button
                        class="retro-action"
                        type="button"
                        data-retro-action="appearance"
                    >
                        <span class="retro-number">06</span>
                        <span>STARTUP STYLE</span>
                    </button>
                </nav>

                <footer class="retro-menu-footer">
                    <p>↑ ↓ SELECT <span>ENTER CONFIRM</span></p>
                    <p class="retro-small">
                        MOUSE AND TOUCH ALSO SUPPORTED
                    </p>
                </footer>
            </section>

            <div class="retro-bottomline">
                <span>ANGUS ANDERSON</span>
                <span data-system-status>INITIALISING</span>
            </div>
        </div>
    `;

    const requireElement = <T extends Element>(
        selector: string
    ): T => {
        const element = menu.querySelector<T>(selector);

        if (!element) {
            throw new Error(`Missing menu element: ${selector}`);
        }

        return element;
    };

    const boot = requireElement<HTMLElement>(".retro-boot");
    const home = requireElement<HTMLElement>(".retro-home");

    const continueButton =
        requireElement<HTMLButtonElement>(".retro-continue");

    const progress =
        requireElement<HTMLProgressElement>(".retro-progress");

    const progressLabel =
        requireElement<HTMLElement>("[data-progress-label]");

    const bootStatus =
        requireElement<HTMLElement>("[data-boot-status]");

    const assetStatus =
        requireElement<HTMLElement>("[data-asset-status]");

    const systemStatus =
        requireElement<HTMLElement>("[data-system-status]");

    const primary =
        requireElement<HTMLButtonElement>(
            "#enter-castle-button"
        );

    const createDialog = (
        title: string
    ): {
        dialog: HTMLDialogElement;
        content: HTMLDivElement;
    } => {
        const dialog = document.createElement("dialog");

        dialog.className = "retro-dialog";
        dialog.dataset.variant = variant;
        dialog.setAttribute("aria-label", title);

        const heading = document.createElement("h2");
        heading.className = "retro-dialog-title";
        heading.textContent = title;

        const content = document.createElement("div");
        content.className = "retro-dialog-content";

        const form = document.createElement("form");
        form.method = "dialog";

        const close = document.createElement("button");
        close.type = "submit";
        close.className = "retro-close";
        close.textContent = "RETURN TO MENU";

        form.append(close);
        dialog.append(heading, content, form);
        menu.append(dialog);

        dialog.addEventListener("close", () => {
            if (!menu.hidden && !home.hidden) {
                primary.focus();
            }
        });

        return { dialog, content };
    };

    const archive = createDialog("PROJECT ARCHIVE");
    const about = createDialog("ABOUT ME");
    const appearance = createDialog("STARTUP STYLE");

    const projectList = document.createElement("div");
    projectList.className = "retro-project-list";

    for (const project of PROJECTS) {
        const article = document.createElement("article");
        article.className = "retro-project";

        const heading = document.createElement("h3");
        heading.textContent = project.title;

        const description = document.createElement("p");
        description.textContent = project.description;

        const technologies = document.createElement("p");
        technologies.className = "retro-small";
        technologies.textContent =
            project.technologies.join(" / ");

        article.append(
            heading,
            description,
            technologies
        );

        if (project.image) {
            const image = document.createElement("img");

            image.src = project.image;
            image.alt = `${project.title} preview`;
            image.loading = "lazy";
            image.decoding = "async";
            image.className = "retro-project-image";

            image.addEventListener("error", () => {
                image.hidden = true;
            });

            article.prepend(image);
        }

        const links = document.createElement("div");
        links.className = "retro-project-links";

        const addLink = (
            text: string,
            value: string | undefined
        ): void => {
            if (!value) {
                return;
            }

            let url: URL;

            try {
                url = new URL(value, window.location.href);
            } catch {
                return;
            }

            if (
                url.protocol !== "https:" &&
                url.protocol !== "http:"
            ) {
                return;
            }

            const link = document.createElement("a");

            link.textContent = text;
            link.href = url.href;
            link.target = "_blank";
            link.rel = "noopener noreferrer";

            links.append(link);
        };

        addLink("VISIT PROJECT ↗", project.projectUrl);
        addLink("VIEW SOURCE ↗", project.sourceUrl);

        article.append(links);
        projectList.append(article);
    }

    if (PROJECTS.length === 0) {
        projectList.textContent = "NO PROJECTS AVAILABLE.";
    }

    archive.content.append(projectList);

    const aboutText = document.createElement("p");

    aboutText.textContent ="Hello I'm Angus Anderson, this portfolio is a showcase of my work and skills as a developer. I have experience in web development and and software engineering. Feel free to explore my projects and get in touch if you'd like to learn more about my work.\nEmail: angusanderson@angusanderson.com\n\nGenerational email init";

    about.content.append(aboutText);

    const styleLabel = document.createElement("label");

    styleLabel.className = "retro-style-label";
    styleLabel.textContent = "STARTUP IDENTITY";

    const styleSelect = document.createElement("select");

    for (const [value, text] of [
        ["random", "RANDOM EACH VISIT"],
        ["anderson-systems", "ANDERSON SYSTEMS"],
        ["aa-os", "AA/OS"],
    ]) {
        const option = document.createElement("option");

        option.value = value;
        option.textContent = text;

        styleSelect.append(option);
    }

    styleSelect.value = getStartupPreference();
    styleLabel.append(styleSelect);

    const styleNote = document.createElement("p");

    styleNote.textContent =
        "Your choice is saved for the next page load. " +
        "Random selects a style independently on each visit.";

    styleSelect.addEventListener("change", () => {
        const value = styleSelect.value;

        if (
            value === "random" ||
            value === "anderson-systems" ||
            value === "aa-os"
        ) {
            saveStartupPreference(
                value as StartupPreference
            );
        }
    });

    appearance.content.append(styleLabel, styleNote);

    const openDialog = (
        dialog: HTMLDialogElement
    ): void => {
        if (
            menu.hidden ||
            home.hidden ||
            dialog.open ||
            document.querySelector("dialog[open]")
        ) {
            return;
        }

        dialog.showModal();
    };

    menu.addEventListener(
        "open-project-archive",
        () => openDialog(archive.dialog)
    );

    requireElement<HTMLButtonElement>(
        '[data-retro-action="about"]'
    ).addEventListener("click", () => {
        openDialog(about.dialog);
    });

    requireElement<HTMLButtonElement>(
        '[data-retro-action="appearance"]'
    ).addEventListener("click", () => {
        openDialog(appearance.dialog);
    });

    home.addEventListener("keydown", (event) => {
        if (
            event.key !== "ArrowDown" &&
            event.key !== "ArrowUp" &&
            event.key !== "Home" &&
            event.key !== "End"
        ) {
            return;
        }

        const buttons = Array.from(
            home.querySelectorAll<HTMLButtonElement>(
                ".retro-action:not(:disabled)"
            )
        );

        if (buttons.length === 0) {
            return;
        }

        event.preventDefault();

        const current = buttons.findIndex(
            (button) => button === document.activeElement
        );

        let next: number;

        if (event.key === "Home") {
            next = 0;
        } else if (event.key === "End") {
            next = buttons.length - 1;
        } else {
            const direction =
                event.key === "ArrowDown" ? 1 : -1;

            next =
                current < 0
                    ? 0
                    : (
                        current +
                        direction +
                        buttons.length
                    ) % buttons.length;
        }

        buttons[next]?.focus();
    });

    continueButton.addEventListener("click", () => {
        boot.hidden = true;
        home.hidden = false;
        primary.focus();
    });

    const prepareImage = (
        source: string
    ): Promise<boolean> => {
        return new Promise((resolve) => {
            const image = new Image();
            let finished = false;

            const finish = (success: boolean): void => {
                if (finished) {
                    return;
                }

                finished = true;

                window.clearTimeout(timeout);

                image.onload = null;
                image.onerror = null;

                resolve(success);
            };

            const timeout = window.setTimeout(
                () => finish(false),
                8000
            );

            image.onload = () => finish(true);
            image.onerror = () => finish(false);
            image.src = source;
        });
    };

        const prepare = async (): Promise<void> => {
        const sources = [
            ...new Set(
                PROJECTS.flatMap((project) =>
                    project.image ? [project.image] : []
                )
            ),
        ];

        const reducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;

        const random = (
            minimum: number,
            maximum: number
        ): number => {
            return minimum +
                Math.random() * (maximum - minimum);
        };

        const wait = (duration: number): Promise<void> => {
            return new Promise((resolve) => {
                window.setTimeout(resolve, duration);
            });
        };

        let percentage = 0;

        const setProgress = (value: number): void => {
            percentage = Math.max(
                percentage,
                Math.min(100, value)
            );

            progress.value = percentage;
            progressLabel.textContent =
                `${Math.floor(percentage)}%`;
        };

        const advanceTo = (
            target: number,
            duration: number
        ): Promise<void> => {
            const startValue = percentage;

            if (reducedMotion) {
                return wait(duration).then(() => {
                    setProgress(target);
                });
            }

            return new Promise((resolve) => {
                let startedAt: number | null = null;

                const frame = (timestamp: number): void => {
                    if (startedAt === null) {
                        startedAt = timestamp;
                    }

                    const elapsed = timestamp - startedAt;

                    const fraction = Math.min(
                        1,
                        elapsed / duration
                    );

                    const eased =
                        1 - Math.pow(1 - fraction, 2);

                    setProgress(
                        startValue +
                        (target - startValue) * eased
                    );

                    if (fraction < 1) {
                        requestAnimationFrame(frame);
                        return;
                    }

                    resolve();
                };

                requestAnimationFrame(frame);
            });
        };

        setProgress(0);

        bootStatus.textContent = "INITIALISING SYSTEM";
        systemStatus.textContent = "BOOTING";

        continueButton.disabled = true;
        continueButton.textContent = "PREPARING ARCHIVE";

        const assetsReady = Promise.all(
            sources.map((source) => prepareImage(source))
        );

        const stages = [
            {
                target: random(10, 16),
                duration: random(180, 350),
                pause: random(200, 450),
                label: "INITIALISING DISPLAY",
            },
            {
                target: random(28, 36),
                duration: random(500, 800),
                pause: random(100, 220),
                label: "READING PROJECT INDEX",
            },
            {
                target: random(54, 63),
                duration: random(160, 300),
                pause: random(450, 800),
                label: "PREPARING PROJECT ARCHIVE",
            },
            {
                target: random(76, 83),
                duration: random(450, 750),
                pause: random(180, 350),
                label: "CONFIGURING INTERFACE",
            },
            {
                target: random(92, 96),
                duration: random(600, 1000),
                pause: random(300, 600),
                label: "FINALISING STARTUP",
            },
        ];

        await wait(random(250, 500));

        for (const stage of stages) {
            bootStatus.textContent = stage.label;

            await advanceTo(
                stage.target,
                stage.duration
            );

            await wait(stage.pause);
        }

        bootStatus.textContent = "WAITING FOR ASSET PREPARATION";

        const results = await assetsReady;

        const unavailable = results.filter(
            (success) => !success
        ).length;

        bootStatus.textContent = "STARTING PERSONAL ARCHIVE";

        await advanceTo(100, random(180, 350));

        assetStatus.textContent =
            unavailable > 0
                ? "SOME IMAGES UNAVAILABLE ........ CONTINUE"
                : "PROJECT IMAGES .................... READY";

        bootStatus.textContent = "PORTFOLIO READY";
        systemStatus.textContent = "SYSTEM READY";

        continueButton.disabled = false;
        continueButton.textContent = "CONTINUE TO MAIN MENU";

        if (
            !menu.hidden &&
            !boot.hidden &&
            (
                document.activeElement === document.body ||
                document.activeElement === null
            )
        ) {
            continueButton.focus();
        }
    };

    window.setTimeout(() => {
        void prepare();
    }, 0);

    return menu;
}