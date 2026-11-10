export type Project = {
    id: string;
    
    title: string;
    description: string;

    technologies: string[];

    image?: string;

    projectUrl?: string;
    sourceUrl?: string;
};