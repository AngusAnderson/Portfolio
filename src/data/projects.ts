import type { Project } from "../types/project";

export type { Project } from "../types/project";

const image = `${import.meta.env.BASE_URL}assets/projects/test.jpeg`;

export const PROJECTS: Project[] = [
    {
        id: "first-project",
        title: "Raycast Portfolio",
        description: "Full raycast engine built in TypeScript, featuring elevation changes, jumping, and a 3D gallery to showcase my projects.",
        technologies: ["TypeScript", "HTML", "CSS"],
        image,
        sourceUrl: "https://github.com/AngusAnderson/Portfolio"
    },
    {
        id: "placeholder-two",
        title: "Placeholder",
        description: "iOS app built using SwiftUI and MapKit, featuring a custom map view with annotations and overlays. Casual group fitness app. UofG year 4 project.",
        technologies: ["Swift", "SwiftUI", "MapKit"],
        image,
        sourceUrl: "https://github.com/AngusAnderson/Placeholder"
    },
    {
        id: "placeholder-three",
        title: "Offline Survival Agent",
        description: "Offline local survival agent running natively on iOS devices using Apple Foundation Models and Core ML.",
        technologies: ["Swift", "SwiftUI", "Core ML"],
        image,
        sourceUrl: "https://github.com/AngusAnderson/Survival-Agent"
    },
    {
        id: "placeholder-four",
        title: "Poly Weather",
        description: "Simple weather app built using SwiftUI and Open-Meteo API for weather data.",
        technologies: ["Swift", "SwiftUI", "Observation framework"],
        image,
        sourceUrl: "https://github.com/AngusAnderson/Poly-Weather"
    },
    {
        id: "placeholder-five",
        title: "Simple Browser",
        description: "Local, private, and secure web browser built using SwiftUI and WebKit. Features a custom tab bar, bookmarks, and a privacy-focused design.",
        technologies: ["Swift", "SwiftUI", "WebKit"],
        image,
        sourceUrl: "https://github.com/AngusAnderson/Simple-Browser"
    },
    {
        id: "placeholder-six",
        title: "iOS Music App",
        description: "Music app built using SwiftUI and MusicKit, featuring a custom music player, playlists, and a library of songs. Users can organise their music via a folder structure.",
        technologies: ["Swift", "SwiftUI", "MusicKit"],
        image,
        sourceUrl: "https://github.com/AngusAnderson/IOS-Music-App"
    }
];

export function getProjectById(
    id: Project["id"]
): Project | undefined {
    return PROJECTS.find((project) => project.id === id);
}