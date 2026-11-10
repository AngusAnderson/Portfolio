import type { Project } from "../data/projects";
import { createMenuDialog } from "./menuDialog";

export type ProjectPanel = {
    dialog: HTMLDialogElement;
    show: (project: Project) => void;
};

export function createProjectPanel(): ProjectPanel {
    const { dialog, content } = createMenuDialog(
        "project-panel",
        "Project",
        "Explore the work behind this painting."
    );

    const heading =
        dialog.querySelector<HTMLHeadingElement>("h2");

    const backButton =
        dialog.querySelector<HTMLButtonElement>(
            'button[type="submit"]'
        );

    if (backButton) {
        backButton.textContent = "Back to exploring";
    }

    return {
        dialog,

        show(project: Project): void {
            if (heading) {
                heading.textContent = project.title;
            }

            content.replaceChildren();

            const description = document.createElement("p");

            description.className = "project-panel__description";
            description.textContent = project.description;

            const technologies = document.createElement("ul");
            technologies.className = "project-panel__technologies";

            for (const technology of project.technologies) {
                const item = document.createElement("li");

                item.textContent = technology;
                technologies.append(item);
            }

            const links = document.createElement("div");
            links.className = "project-panel__links";

            const addLink = (
                label: string,
                url: string | undefined
            ): void => {
                if (!url) {
                    return;
                }

                const link = document.createElement("a");

                link.className =
                    "start-menu__button start-menu__button--secondary";

                link.textContent = label;
                link.href = url;

                link.target = "_blank";
                link.rel = "noopener noreferrer";

                links.append(link);
            };

            addLink("Visit project ↗", project.projectUrl);
            addLink("View source ↗", project.sourceUrl);

            content.append(
                description,
                technologies,
                links
            );

            if (!dialog.open) {
                dialog.showModal();
            }
        },
    };
}