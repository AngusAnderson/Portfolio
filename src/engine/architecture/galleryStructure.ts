import { TILESIZE } from "../../settings";
import type { SuspendedPlatform, SuspendedPlatformDefinition } from "../map/types";
import type { PropMaterial } from "../props/definitions";

export const DOOR_OPEN_ANGLE = Math.PI / 6;
export const DOOR_LEAF_WIDTH = 1.43;

export const GALLERY_ROOF: SuspendedPlatformDefinition = {
    name: "Gallery timber roof", x: 10, y: 3, width: 11, depth: 7,
    bottomHeight: 3, topHeight: 3.22,
};

type AddBox = (id: string, x: number, y: number, z: number, width: number, depth: number, height: number, material: PropMaterial, rotation?: number) => void;
type AddFootprint = (id: string, x: number, y: number, width: number, depth: number, bottom: number, top: number, rotation?: number) => void;

export function isGalleryRoof(platform: SuspendedPlatform): boolean {
    return Math.abs(platform.x - GALLERY_ROOF.x * TILESIZE) < 0.01 &&
        Math.abs(platform.y - GALLERY_ROOF.y * TILESIZE) < 0.01 &&
        Math.abs(platform.bottomHeight - GALLERY_ROOF.bottomHeight * TILESIZE) < 0.01 &&
        Math.abs(platform.topHeight - GALLERY_ROOF.topHeight * TILESIZE) < 0.01;
}

export function sampleRoofColour(x: number, y: number, isTop: boolean): readonly [number, number, number] {
    const tx = x / TILESIZE;
    const ty = y / TILESIZE;
    if (isTop) {
        const row = Math.floor(ty * 4);
        const u = tx * 4 + (row & 1) * 0.5;
        const joint = u - Math.floor(u) < 0.035 || ty * 4 - row < 0.035;
        const variation = Math.sin(Math.floor(u) * 7.1 + row * 3.7) * 5;
        return joint ? [34, 40, 40] : [64 + variation, 71 + variation, 72 + variation];
    }
    const u = tx * 5;
    const seam = Math.min(u - Math.floor(u), 1 - (u - Math.floor(u))) < 0.025;
    if (seam) return [42, 33, 24];
    const grain = Math.sin(tx * 108 + Math.sin(ty * 8) * 1.4) * 4;
    return [91 + grain, 70 + grain, 46 + grain];
}

export function addGalleryStructure(box: AddBox, footprint: AddFootprint): void {
    const leaf = (id: string, hingeX: number, hingeY: number, floor: number, height: number, left: boolean): void => {
        const sign = left ? 1 : -1;
        const rotation = left ? -DOOR_OPEN_ANGLE : DOOR_OPEN_ANGLE;
        const cosine = Math.cos(rotation);
        const sine = Math.sin(rotation);
        const cx = hingeX + sign * DOOR_LEAF_WIDTH * 0.5 * cosine;
        const cy = hingeY + sign * DOOR_LEAF_WIDTH * 0.5 * sine;
        const bottom = floor + 0.025;
        const thickness = 0.09;
        box(`${id}-leaf`, cx, cy, bottom, DOOR_LEAF_WIDTH, thickness, height, "door", rotation);
        footprint(id, cx, cy, DOOR_LEAF_WIDTH, thickness, bottom, bottom + height, rotation);
        const detail = (name: string, lx: number, ly: number, z: number, width: number, depth: number, h: number, material: PropMaterial): void => {
            box(`${id}-${name}`, cx + lx * cosine - ly * sine,
                cy + lx * sine + ly * cosine, z, width, depth, h, material, rotation);
        };
        for (let i = 0; i < 3; i++) {
            detail(`strap-${i}`, 0, thickness / 2 + 0.012, bottom + 0.15 + i * (height - 0.3) / 2,
                DOOR_LEAF_WIDTH - 0.08, 0.023, 0.065, "iron");
        }
        detail("handle", sign * (DOOR_LEAF_WIDTH / 2 - 0.16), thickness / 2 + 0.035,
            bottom + height * 0.43, 0.035, 0.05, 0.14, "brass");
    };
    leaf("gallery-left-door", 14, 9.05, 1, 1.8, true);
    leaf("gallery-right-door", 17, 9.05, 1, 1.8, false);
    leaf("gateway-left-door", 14, 20.95, 0, 2.65, true);
    leaf("gateway-right-door", 17, 20.95, 0, 2.65, false);
    box("gallery-door-lintel", 15.5, 9.48, 2.87, 3.12, 1.02, 0.13, "wood");
    footprint("gallery-door-lintel", 15.5, 9.48, 3.12, 1.02, 2.87, 3);
    box("gateway-door-lintel", 15.5, 20.5, 2.78, 3.12, 1.02, 0.22, "wood");
    footprint("gateway-door-lintel", 15.5, 20.5, 3.12, 1.02, 2.78, 3);
    for (const x of [12.5, 15.5, 18.5]) {
        box(`gallery-rafter-${x}`, x, 6.5, 2.9, 0.14, 5.12, 0.1, "wood");
    }
    const x = 15.5;
    const y = 6.5;
    const ring = 2.27;
    box("chandelier-chain", x, y, ring + 0.08, 0.035, 0.035, 3 - ring - 0.08, "iron");
    box("chandelier-arm-x", x, y, ring, 1.2, 0.045, 0.055, "iron");
    box("chandelier-arm-y", x, y, ring, 0.045, 1.2, 0.055, "iron");
    for (const side of [-1, 1]) {
        box(`chandelier-ring-x-${side}`, x, y + side * 0.49, ring, 1.03, 0.045, 0.055, "brass");
        box(`chandelier-ring-y-${side}`, x + side * 0.49, y, ring, 0.045, 1.03, 0.055, "brass");
    }
    for (const [index, position] of [[x - 0.49, y - 0.49], [x + 0.49, y - 0.49], [x - 0.49, y + 0.49], [x + 0.49, y + 0.49]].entries()) {
        const px = position[0]!;
        const py = position[1]!;
        box(`chandelier-cup-${index}`, px, py, ring + 0.055, 0.11, 0.11, 0.035, "brass");
        box(`chandelier-candle-${index}`, px, py, ring + 0.09, 0.05, 0.05, 0.13, "candle");
        box(`chandelier-flame-${index}`, px, py, ring + 0.22, 0.035, 0.035, 0.065, "flame");
    }
}
