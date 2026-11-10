import type { WallDefinition } from "../types";

export const ESTATE_COLUMNS = 51;
export const ESTATE_ROWS = 49;

export function approachCentre(y: number): number {
    if (y <= 22) return 15.5;
    const t = Math.min(1, Math.max(0, (y - 22) / 17));
    return 15.5 + 6 * t * t * (3 - 2 * t);
}

export function westEdge(y: number): number {
    return y < 22 ? 1 : 3 + Math.floor(1.4 + Math.sin(y * 0.31) * 1.4);
}

export function eastEdge(y: number): number {
    return Math.floor(36 + Math.sin(y * 0.24) * 2 + Math.sin(y * 0.63));
}

export function southEdge(x: number): number {
    return Math.floor(44 + Math.sin(x * 0.25) * 1.3);
}

export const ESTATE_MASONRY: WallDefinition[] = [
    { kind: "fill", name: "West estate remnant", x: 9, y: 25, width: 3, depth: 1, value: 0.65 },
    { kind: "fill", name: "West surviving pier", x: 9, y: 25, width: 1, depth: 1, value: 1.35 },
    { kind: "fill", name: "West collapsed end", x: 12, y: 25, width: 1, depth: 1, value: 0.25 },
    { kind: "fill", name: "East estate remnant", x: 20, y: 25, width: 5, depth: 1, value: 0.7 },
    { kind: "fill", name: "East surviving pier", x: 24, y: 25, width: 1, depth: 1, value: 1.45 },
    { kind: "fill", name: "East collapsed end", x: 19, y: 25, width: 1, depth: 1, value: 0.3 },
    { kind: "fill", name: "Southwest remnant", x: 10, y: 34, width: 1, depth: 4, value: 0.55 },
    { kind: "fill", name: "Southwest pier", x: 10, y: 34, width: 1, depth: 1, value: 1.1 },
    { kind: "fill", name: "East isolated remnant", x: 29, y: 32, width: 1, depth: 3, value: 0.8 },
];

export function isEstateMasonry(x: number, y: number): boolean {
    return ESTATE_MASONRY.some((wall) =>
        x >= wall.x - 0.04 && x <= wall.x + wall.width + 0.04 &&
        y >= wall.y - 0.04 && y <= wall.y + wall.depth + 0.04
    );
}

export function isCastleMasonry(x: number, y: number): boolean {
    return x >= 4.96 && x <= 26.04 && y >= 1.96 && y <= 21.04;
}

export function buildLandscapeWalls(): WallDefinition[] {
    const walls: WallDefinition[] = [];
    for (let y = 0; y < ESTATE_ROWS; y++) {
        for (let x = 0; x < ESTATE_COLUMNS; x++) {
            const west = westEdge(y);
            const east = eastEdge(y);
            const south = southEdge(x);
            const blocked = x <= west || x >= east || y <= 0 || y >= south;
            if (!blocked) continue;
            const inset = Math.max(west - x, x - east, y - south, -y);
            const variation = (Math.sin(x * 1.37 + y * 0.91) + 1) * 0.35;
            const height = 1.6 + Math.min(2.5, Math.max(0, inset) * 0.7) + variation;
            walls.push({
                kind: "fill", name: `Landscape bank ${x}:${y}`,
                x, y, width: 1, depth: 1, value: height,
            });
        }
    }
    return walls;
}
