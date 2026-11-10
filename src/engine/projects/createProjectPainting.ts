import { TILESIZE } from "../../settings";

import type { GameMap } from "../map";
import type { Project } from "../../data/projects";
import type { ProjectPainting } from "./types";

type Position = {
    x: number;
    y: number;
};

type PaintingSlot = {
    x: number;
    y: number;
    normalAngle: number;
};

export function createProjectPaintings(
    _map: GameMap,
    _spawn: Position,
    projects: readonly Project[],
    _zoneId: string = "keep-gallery",
    maximumPaintings: number = 6
): ProjectPainting[] {
    if (projects.length === 0) {
        console.warn("No projects are available for the gallery.");

        return [];
    }

    const wallOffset = 0.75;

    const slots: PaintingSlot[] = [
        {
            x: 13.5 * TILESIZE,
            y: 4 * TILESIZE + wallOffset,
            normalAngle: Math.PI / 2
        },
        {
            x: 17.5 * TILESIZE,
            y: 4 * TILESIZE + wallOffset,
            normalAngle: Math.PI / 2
        },
        {
            x: 11 * TILESIZE + wallOffset,
            y: 6.5 * TILESIZE,
            normalAngle: 0
        },
        {
            x: 20 * TILESIZE - wallOffset,
            y: 6.5 * TILESIZE,
            normalAngle: Math.PI
        },
        {
            x: 12.5 * TILESIZE,
            y: 9 * TILESIZE - wallOffset,
            normalAngle: -Math.PI / 2
        },
        {
            x: 18.5 * TILESIZE,
            y: 9 * TILESIZE - wallOffset,
            normalAngle: -Math.PI / 2
        }
    ];

    const count = Math.min(
        slots.length,
        Math.max(0, Math.floor(maximumPaintings))
    );

    const paintings: ProjectPainting[] = [];

    for (let index = 0; index < count; index++) {
        const slot = slots[index];
        const project = projects[index % projects.length];

        if (!slot || !project) {
            continue;
        }

        paintings.push({
            id: `keep-gallery-painting-${index + 1}`,
            project,
            x: slot.x,
            y: slot.y,
            bottomHeight: TILESIZE * 1.2,
            width: TILESIZE * 1.65,
            height: TILESIZE * 1.6,
            normalAngle: slot.normalAngle
        });
    }

    return paintings;
}