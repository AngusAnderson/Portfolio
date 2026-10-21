export type Project = {
    id: string;
    title: string;
    description: string;

    technologies: string[];

    image?: string;
    projectUrl?: string;
    sourceUrl?: string;
};

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
        // image: `${import.meta.env.BASE_URL}assets/projects/example.jpg`,
        // projectUrl: "",
        // sourceUrl: "",
    },
];