import type { Project } from "../types/project";

export type { Project } from "../types/project";

export const PROJECTS: Project[] = [
    {
        id: "first-project",
        title: "Test",

        description:
            "Replace this with a short description of your project, " +
            "what you built, and your contribution.",

        technologies: [
            "TypeScript",
            "HTML",
            "CSS",
        ],

        // Optional:
        image: `${import.meta.env.BASE_URL}assets/projects/test.jpeg`,
        // projectUrl: "",
        sourceUrl: "https://github.com/AngusAnderson/Portfolio",
    },
];

export function getProjectById(id: Project["id"]): Project | undefined {
    return PROJECTS.find((project) => project.id === id);
}