import type { Project } from "../../data/projects";

export type ProjectPainting = {
    id: string;
    project: Project;

    x: number;
    y: number;

    bottomHeight: number;

    width: number;
    height: number;

    normalAngle: number;
};

export type ProjectCamera = {
    x: number;
    y: number;

    rotationAngle: number;
    cameraHeight: number;

    horizonY: number;
    projectionDistance: number;
};

export type ProjectView = {
    getWorldCamera(): ProjectCamera;

    isWorldPointVisible(
        screenX: number,
        screenY: number,
        depth: number
    ): boolean;
};