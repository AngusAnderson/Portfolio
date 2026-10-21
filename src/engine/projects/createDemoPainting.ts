import { TILESIZE } from "../../settings";

import type { GameMap } from "../map";
import type { Project } from "../../data/projects";
import type { ProjectPainting } from "./types";

type Position = {
    x: number;
    y: number;
};

export function createDemoPainting(
    map: GameMap,
    spawn: Position,
    project: Project,
    zoneId: string = "keep-gallery"
): ProjectPainting | null {
    const zone = map.environmentZones.find(
        (candidate) => candidate.id === zoneId
    );

    if (!zone) {
        console.warn(
            `Cannot place painting: environment zone "${zoneId}" was not found.`
        );

        return null;
    }

    const targetZone = zone;
    const zoneCentreX = targetZone.x + targetZone.width / 2;
    const zoneCentreY = targetZone.y + targetZone.depth / 2;

    const wallOffset = 0.75;

    const paintingWidth = TILESIZE * 0.55;
    const paintingHeight = TILESIZE * 0.6;

    let selected: ProjectPainting | null = null;
    let bestScore = Infinity;

    function isOpen(column: number, row: number): boolean {
        return map.grid[row]?.[column] === 0;
    }

    function consider(
        x: number,
        y: number,
        normalAngle: number,
        wallHeight: number
    ): void {
        const normalX = Math.cos(normalAngle);
        const normalY = Math.sin(normalAngle);

        // Sample the space in front of the wall.
        const roomX = x + normalX * TILESIZE * 0.5;
        const roomY = y + normalY * TILESIZE * 0.5;

        const groundHeight =
            map.getGroundHeightAt(roomX, roomY);

        const insideZone =
            roomX >= targetZone.x &&
            roomX < targetZone.x + targetZone.width &&
            roomY >= targetZone.y &&
            roomY < targetZone.y + targetZone.depth &&
            groundHeight >= targetZone.minElevation &&
            groundHeight < targetZone.maxElevation;

        if (!insideZone) {
            return;
        }

        const distanceFromSpawn = Math.hypot(
            x - spawn.x,
            y - spawn.y
        );

        if (distanceFromSpawn < TILESIZE * 3) {
            return;
        }

        const bottomHeight =
            groundHeight + TILESIZE * 0.2;

        if (
            bottomHeight + paintingHeight >
            wallHeight
        ) {
            return;
        }

        const score = Math.hypot(
            roomX - zoneCentreX,
            roomY - zoneCentreY
        );

        if (score >= bestScore) {
            return;
        }

        bestScore = score;

        selected = {
            id: "demo-painting",
            project,

            x,
            y,

            bottomHeight,

            width: paintingWidth * 3,
            height: paintingHeight * 3,

            normalAngle,
        };
    }

    for (let row = 0; row < map.grid.length; row++) {
        const cells = map.grid[row];

        if (!cells) {
            continue;
        }

        for (
            let column = 0;
            column < cells.length;
            column++
        ) {
            const wallValue = cells[column] ?? 0;

            if (wallValue <= 0) {
                continue;
            }

            const wallHeight = wallValue * TILESIZE;

            const left = column * TILESIZE;
            const right = left + TILESIZE;

            const top = row * TILESIZE;
            const bottom = top + TILESIZE;

            const centreX = left + TILESIZE / 2;
            const centreY = top + TILESIZE / 2;

            if (isOpen(column - 1, row)) {
                consider(
                    left - wallOffset,
                    centreY,
                    Math.PI,
                    wallHeight
                );
            }

            if (isOpen(column + 1, row)) {
                consider(
                    right + wallOffset,
                    centreY,
                    0,
                    wallHeight
                );
            }

            if (isOpen(column, row - 1)) {
                consider(
                    centreX,
                    top - wallOffset,
                    -Math.PI / 2,
                    wallHeight
                );
            }

            if (isOpen(column, row + 1)) {
                consider(
                    centreX,
                    bottom + wallOffset,
                    Math.PI / 2,
                    wallHeight
                );
            }
        }
    }

    if (!selected) {
        console.warn(
            `No suitable ground-level wall face found in "${zoneId}".`
        );
    }

    return selected;
}