import type { LevelDefinition, WallDefinition } from "../types";
import {
    ESTATE_COLUMNS, ESTATE_ROWS, ESTATE_MASONRY,
    approachCentre, buildLandscapeWalls,
} from "./estate";

type WallRow = [WallDefinition["kind"], string, number, number, number, number, number];

const castleWalls: WallRow[] = [
    ["outline", "Castle perimeter", 5, 2, 21, 19, 3],
    ["fill", "Main gateway opening", 14, 20, 3, 1, 0],
    ["fill", "Front left tower", 5, 18, 3, 3, 4],
    ["fill", "Front right tower", 23, 18, 3, 3, 4],
    ["fill", "Rear left tower", 5, 2, 3, 3, 4],
    ["fill", "Rear right tower", 23, 2, 3, 3, 4],
    ["outline", "Keep enclosure", 10, 3, 11, 7, 3],
    ["fill", "Keep doorway opening", 14, 9, 3, 1, 0],
    ["outline", "Left side chamber", 6, 5, 4, 5, 2],
    ["fill", "Left chamber doorway", 7, 9, 2, 1, 0],
    ["outline", "Right side chamber", 21, 5, 4, 5, 2],
    ["fill", "Right chamber doorway", 22, 9, 2, 1, 0],
];

export const CASTLE_LEVEL: LevelDefinition = {
    name: "The Forgotten Estate",
    columns: ESTATE_COLUMNS,
    rows: ESTATE_ROWS,
    spawn: {
        x: approachCentre(38.5),
        y: 38.5,
        rotationAngle: -Math.PI / 2 - 0.22,
    },
    walls: [
        ...buildLandscapeWalls(),
        ...castleWalls.map(([kind, name, x, y, width, depth, value]) => ({
            kind, name, x, y, width, depth, value,
        })),
        ...ESTATE_MASONRY,
    ],
    groundSurfaces: [
        { kind: "ramp", name: "Main keep ramp", x: 14, y: 12, width: 3, depth: 4, startHeight: 0, endHeight: 1, direction: "north" },
        { kind: "platform", name: "Keep approach landing", x: 14, y: 9, width: 3, depth: 3, height: 1 },
        { kind: "platform", name: "Keep interior floor", x: 11, y: 4, width: 9, depth: 5, height: 1 },
        { kind: "ramp", name: "Left bridge access ramp", x: 8, y: 13, width: 2, depth: 4, startHeight: 0, endHeight: 1.25, direction: "south" },
        { kind: "ramp", name: "Right bridge access ramp", x: 21, y: 13, width: 2, depth: 4, startHeight: 0, endHeight: 1.25, direction: "south" },
    ],
    suspendedPlatforms: [
        { name: "Courtyard bridge", x: 8, y: 17, width: 15, depth: 2, bottomHeight: 1, topHeight: 1.25 },
    ],
    environmentZones: [
        { id: "castle-courtyard", name: "Castle Courtyard", x: 5, y: 2, width: 21, depth: 19, kind: "outdoor", sheltered: false, priority: 1 },
        { id: "gate-vestibule", name: "Gate Vestibule", x: 14, y: 19, width: 3, depth: 2, kind: "indoor", sheltered: true, priority: 10, maxElevation: 1 },
        { id: "keep-gallery", name: "Keep Gallery", x: 11, y: 4, width: 9, depth: 5, kind: "indoor", sheltered: true, priority: 10 },
        { id: "left-chamber", name: "Left Chamber", x: 7, y: 6, width: 2, depth: 3, kind: "indoor", sheltered: true, priority: 10 },
        { id: "right-chamber", name: "Right Chamber", x: 22, y: 6, width: 2, depth: 3, kind: "indoor", sheltered: true, priority: 10 },
    ],
};
