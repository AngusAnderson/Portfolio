export type ProjectHUD = {
    element: HTMLElement;
    setTarget: (title: string | null) => void;
};

export function createProjectHUD(): ProjectHUD {
    const element = document.createElement("div");

    element.className = "project-hud";
    element.hidden = true;

    const title = document.createElement("p");
    title.className = "project-hud__title";

    const prompt = document.createElement("p");
    prompt.className = "project-hud__prompt";

    prompt.innerHTML = "<kbd>E</kbd> View project";

    element.append(title, prompt);

    let previousTitle: string | null = null;

    return {
        element,

        setTarget(nextTitle: string | null): void {
            if (nextTitle === previousTitle) {
                return;
            }

            previousTitle = nextTitle;

            title.textContent = nextTitle ?? "";
            element.hidden = nextTitle === null;
        },
    };
}