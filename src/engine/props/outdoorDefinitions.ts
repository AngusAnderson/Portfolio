import { approachCentre } from "../map/levels/estate";
import type { PropMaterial } from "./definitions";

type AddBox = (id: string, x: number, y: number, z: number, width: number, depth: number, height: number, material: PropMaterial) => void;
type AddFootprint = (id: string, x: number, y: number, width: number, depth: number, bottom: number, top: number) => void;

export function addOutdoorProps(box: AddBox, footprint: AddFootprint): void {
    const solid = (id: string, x: number, y: number, z: number, width: number, depth: number, height: number, material: PropMaterial): void => {
        box(id, x, y, z, width, depth, height, material);
        footprint(id, x, y, width, depth, z, z + height);
    };
    const gateY = 32;
    const gateX = approachCentre(gateY);
    for (const side of [-1, 1]) {
        const x = gateX + side * 1.85;
        const height = side < 0 ? 1.05 : 0.83;
        solid(`estate-gatepost-${side}`, x, gateY, 0, 0.48, 0.48, height, "stone");
        solid(`estate-gatecap-${side}`, x, gateY, height, 0.59, 0.59, 0.1, "stone");
    }
    const wellX = 11.5;
    const wellY = 11.4;
    solid("well-north", wellX, wellY - 0.45, 0, 1.2, 0.3, 0.54, "stone");
    solid("well-south", wellX, wellY + 0.45, 0, 1.2, 0.3, 0.54, "stone");
    solid("well-west", wellX - 0.45, wellY, 0, 0.3, 0.6, 0.54, "stone");
    solid("well-east", wellX + 0.45, wellY, 0, 0.3, 0.6, 0.54, "stone");
    box("well-board", wellX - 0.22, wellY, 0.55, 0.16, 1.16, 0.045, "wood");
    footprint("well-centre-safety", wellX, wellY, 0.6, 0.6, 0, 0.54);
    solid("storehouse-west", 26.8, 29.4, 0, 0.3, 2.6, 0.94, "stone");
    solid("storehouse-north", 28.35, 28.25, 0, 3.4, 0.3, 1.18, "stone");
    solid("storehouse-east-remnant", 29.9, 28.85, 0, 0.3, 1.5, 0.63, "stone");
    solid("storehouse-west-buttress", 26.8, 28.45, 0, 0.42, 0.48, 1.31, "stone");
    solid("storehouse-east-broken-end", 29.9, 29.85, 0, 0.38, 0.48, 0.28, "stone");
    solid("storehouse-door-left", 27.15, 30.55, 0, 0.9, 0.28, 0.72, "stone");
    solid("storehouse-door-right", 29.45, 30.55, 0, 1.1, 0.28, 0.4, "stone");
    solid("storehouse-timber", 28.4, 28.6, 1.22, 2.9, 0.14, 0.14, "wood");
    for (let i = 0; i < 4; i++) {
        solid(`old-fence-post-${i}`, 9.8 + i * 0.85, 32.8, 0, 0.11, 0.13, i === 3 ? 0.32 : 0.59, "wood");
    }
    solid("old-fence-lower-rail", 10.65, 32.8, 0.17, 1.7, 0.07, 0.065, "wood");
    solid("old-fence-upper-rail", 10.65, 32.8, 0.41, 1.7, 0.07, 0.065, "wood");
    solid("old-fence-broken-rail", 11.95, 32.8, 0.18, 0.7, 0.07, 0.065, "wood");
    box("old-fence-fallen-board", 12.25, 33.15, 0.015, 0.9, 0.12, 0.055, "wood");
    for (let i = 0; i < 10; i++) {
        const cluster = i < 5 ? 0 : 1;
        const j = i % 5;
        const x = (cluster === 0 ? 29.95 : 26.45) + Math.sin(j * 2.1) * 0.45;
        const y = (cluster === 0 ? 30.15 : 28.05) + Math.cos(j * 1.7) * 0.35;
        box(`outdoor-rubble-${i}`, x, y, 0, 0.14 + (j % 3) * 0.07, 0.13 + (j % 2) * 0.08, 0.07 + (j % 3) * 0.055, "stone");
    }
    box("storehouse-fallen-beam", 28.2, 29.2, 0.02, 1.35, 0.17, 0.13, "wood");
}
