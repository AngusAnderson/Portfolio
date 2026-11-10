import { TILESIZE } from "../../settings";
import { addOutdoorProps } from "./outdoorDefinitions";

export type PropMaterial = "wood" | "stone" | "fabric" | "brass" | "book";
export type PropBox = {
    id: string; x: number; y: number; z: number;
    width: number; depth: number; height: number;
    material: PropMaterial;
};
export type PropFootprint = {
    id: string; x: number; y: number; width: number; depth: number;
    bottom: number; top: number;
};

const boxes: PropBox[] = [];
const footprints: PropFootprint[] = [];

function box(id: string, x: number, y: number, z: number, width: number, depth: number, height: number, material: PropMaterial): void {
    boxes.push({ id, x: x * TILESIZE, y: y * TILESIZE, z: z * TILESIZE,
        width: width * TILESIZE, depth: depth * TILESIZE, height: height * TILESIZE, material });
}

function footprint(id: string, x: number, y: number, width: number, depth: number, bottom: number, top: number): void {
    footprints.push({ id, x: x * TILESIZE, y: y * TILESIZE,
        width: width * TILESIZE, depth: depth * TILESIZE,
        bottom: bottom * TILESIZE, top: top * TILESIZE });
}

function bench(id: string, x: number, y: number, floor: number): void {
    const width = 1.65;
    box(`${id}-seat`, x, y, floor + 0.2, width, 0.44, 0.055, "wood");
    box(`${id}-back`, x, y + 0.19, floor + 0.28, width, 0.07, 0.18, "wood");
    for (const side of [-1, 1]) {
        box(`${id}-support-${side}`, x + side * 0.63, y, floor, 0.13, 0.38, 0.2, "wood");
        box(`${id}-backpost-${side}`, x + side * 0.72, y + 0.18, floor + 0.22, 0.07, 0.09, 0.24, "wood");
    }
    footprint(id, x, y, width, 0.46, floor, floor + 0.46);
}

function urn(id: string, x: number, y: number, floor: number): void {
    box(`${id}-base`, x, y, floor, 0.52, 0.52, 0.08, "stone");
    box(`${id}-pedestal`, x, y, floor + 0.08, 0.33, 0.33, 0.27, "stone");
    box(`${id}-cap`, x, y, floor + 0.35, 0.49, 0.49, 0.06, "stone");
    const profile = [0.18, 0.29, 0.37, 0.4, 0.36, 0.26, 0.2, 0.3];
    for (let i = 0; i < profile.length; i++) {
        const size = profile[i];
        if (size === undefined) continue;
        box(`${id}-urn-${i}`, x, y, floor + 0.41 + i * 0.0375, size, size, 0.0375, "stone");
    }
    footprint(id, x, y, 0.52, 0.52, floor, floor + 0.71);
}

function desk(id: string, x: number, y: number, floor: number): void {
    box(`${id}-top`, x, y, floor + 0.35, 1.05, 0.55, 0.055, "wood");
    for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
            box(`${id}-leg-${sx}-${sy}`, x + sx * 0.43, y + sy * 0.19, floor, 0.09, 0.09, 0.35, "wood");
        }
    }
    box(`${id}-book-one`, x - 0.21, y + 0.05, floor + 0.405, 0.25, 0.29, 0.03, "book");
    box(`${id}-book-two`, x - 0.19, y + 0.05, floor + 0.435, 0.21, 0.26, 0.025, "book");
    footprint(id, x, y, 1.05, 0.55, floor, floor + 0.405);
}

bench("gallery-west-bench", 13.1, 7.55, 1);
bench("gallery-east-bench", 17.9, 7.55, 1);
urn("gallery-urn", 11.65, 4.75, 1);
desk("study-desk", 8, 6.7, 0);
box("gallery-banner", 15.5, 4.035, 1.65, 0.78, 0.025, 1.12, "fabric");
box("gallery-banner-rod", 15.5, 4.045, 2.8, 0.94, 0.045, 0.045, "brass");
box("study-chest", 8.1, 8.15, 0, 0.82, 0.43, 0.3, "wood");
box("study-chest-band-left", 7.87, 8.15, 0.285, 0.045, 0.45, 0.025, "brass");
box("study-chest-band-right", 8.33, 8.15, 0.285, 0.045, 0.45, 0.025, "brass");
footprint("study-chest", 8.1, 8.15, 0.82, 0.43, 0, 0.31);
for (let i = 0; i < 6; i++) {
    const x = 19.15 + Math.sin(i * 2.1) * 0.28;
    const y = 8.45 + Math.cos(i * 1.7) * 0.18;
    box(`gallery-rubble-${i}`, x, y, 1, 0.12 + (i % 3) * 0.06, 0.11 + (i % 2) * 0.07, 0.055 + (i % 3) * 0.035, "stone");
}

addOutdoorProps(box, footprint);

export const PROP_BOXES: readonly PropBox[] = boxes;
export const PROP_FOOTPRINTS: readonly PropFootprint[] = footprints;

function overlapsCircle(prop: PropFootprint, x: number, y: number, radius: number): boolean {
    const nx = Math.max(prop.x - prop.width / 2, Math.min(prop.x + prop.width / 2, x));
    const ny = Math.max(prop.y - prop.depth / 2, Math.min(prop.y + prop.depth / 2, y));
    return (x - nx) ** 2 + (y - ny) ** 2 < radius * radius;
}

export function isPropFootprintBlocked(
    x: number, y: number, radius: number,
    feet: number = -Infinity, head: number = Infinity,
    tolerance: number = 0.01
): boolean {
    return PROP_FOOTPRINTS.some(prop => overlapsCircle(prop, x, y, radius) &&
        feet < prop.top - tolerance && head > prop.bottom + tolerance);
}

export function getPropSupportHeight(x: number, y: number, feet: number, maxStepUp: number): number {
    let support = -Infinity;
    for (const prop of PROP_FOOTPRINTS) {
        const inside = x >= prop.x - prop.width / 2 && x <= prop.x + prop.width / 2 &&
            y >= prop.y - prop.depth / 2 && y <= prop.y + prop.depth / 2;
        if (inside && prop.top <= feet + maxStepUp) support = Math.max(support, prop.top);
    }
    return support;
}

export function getPropSlabsAt(x: number, y: number): PropFootprint[] {
    return PROP_FOOTPRINTS.filter(prop =>
        x >= prop.x - prop.width / 2 && x <= prop.x + prop.width / 2 &&
        y >= prop.y - prop.depth / 2 && y <= prop.y + prop.depth / 2
    );
}
