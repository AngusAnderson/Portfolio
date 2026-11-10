import { TILESIZE } from "../../settings";
import { approachCentre } from "../map/levels/estate";

export type Colour = readonly [number, number, number];

export const ATMOSPHERE = {
    skyTop: [18, 24, 30] as Colour,
    skyHorizon: [67, 76, 79] as Colour,
    fog: [49, 59, 60] as Colour,
    fogStart: TILESIZE * 3,
    fogEnd: TILESIZE * 24,
    ambient: 0.88,
};

const palette = new Map<string, string>();

function clamp(v: number, a: number, b: number): number {
    return Math.max(a, Math.min(b, v));
}

export function noise(x: number, y: number, seed: number = 0): number {
    let v = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1442695041);
    v = Math.imul(v ^ (v >>> 13), 1274126177);
    return ((v ^ (v >>> 16)) >>> 0) / 4294967295;
}

export function fogAmount(distance: number): number {
    const t = clamp((distance - ATMOSPHERE.fogStart) / (ATMOSPHERE.fogEnd - ATMOSPHERE.fogStart), 0, 1);
    return t * t * (3 - 2 * t);
}

function cssColour(r: number, g: number, b: number): string {
    const key = [r, g, b].map(v => clamp(Math.round(v / 4) * 4, 0, 255)).join(",");
    let colour = palette.get(key);
    if (!colour) {
        colour = `rgb(${key})`;
        palette.set(key, colour);
    }
    return colour;
}

export function shadeColour(colour: Colour, distance: number, light: number = 1): string {
    const illumination = ATMOSPHERE.ambient * light * (0.65 + 0.35 / (1 + Math.max(0, distance) / (TILESIZE * 8)));
    const fog = fogAmount(distance);
    return cssColour(
        colour[0] * illumination * (1 - fog) + ATMOSPHERE.fog[0] * fog,
        colour[1] * illumination * (1 - fog) + ATMOSPHERE.fog[1] * fog,
        colour[2] * illumination * (1 - fog) + ATMOSPHERE.fog[2] * fog,
    );
}

function fract(v: number): number { return v - Math.floor(v); }

function mixColour(a: Colour, b: Colour, amount: number): Colour {
    const t = clamp(amount, 0, 1);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function varyColour(c: Colour, amount: number): Colour {
    return [clamp(c[0] + amount, 0, 255), clamp(c[1] + amount, 0, 255), clamp(c[2] + amount, 0, 255)];
}

function pavingColour(x: number, y: number, interior: boolean): Colour {
    const width = interior ? 0.6 : 0.85;
    const depth = interior ? 0.45 : 0.62;
    const row = Math.floor(y / depth);
    const shiftedX = x + (row & 1) * width * 0.5;
    const column = Math.floor(shiftedX / width);
    const lx = fract(shiftedX / width);
    const ly = fract(y / depth);
    const seed = noise(column, row, 7);
    const fine = noise(Math.floor(x * 48), Math.floor(y * 48), 11);
    const broad = noise(Math.floor(x * 2), Math.floor(y * 2), 17);
    const edge = Math.min(lx, 1 - lx, ly, 1 - ly);
    if (edge < 0.008 + noise(column, row, 29) * 0.007) return interior ? [37, 39, 36] : [35, 40, 32];
    let base: Colour = interior
        ? seed < 0.35 ? [85, 88, 81] : seed < 0.72 ? [105, 105, 93] : [118, 115, 100]
        : seed < 0.25 ? [77, 86, 80] : seed < 0.55 ? [104, 102, 86] : seed < 0.8 ? [91, 95, 89] : [117, 112, 96];
    base = varyColour(base, (fine - 0.5) * 7 + (broad - 0.5) * 10);
    base = mixColour([base[0] * 0.75, base[1] * 0.75, base[2] * 0.75], base, clamp(edge / 0.055, 0, 1));
    const crack = 0.2 + noise(column, row, 43) * 0.6 + (ly - 0.5) * (noise(column, row, 47) - 0.5) * 0.55;
    if (noise(column, row, 41) > 0.8 && ly > 0.12 && ly < 0.9 && Math.abs(lx - crack) < 0.006) base = mixColour(base, [37, 42, 33], 0.65);
    if (!interior && edge < 0.07 && seed > 0.53 && fine > 0.4) base = mixColour(base, [48, 65, 35], (1 - edge / 0.07) * 0.55);
    return base;
}

function galleryColour(tileX: number, tileY: number): Colour {
    const x = tileX - 11;
    const y = tileY - 4;
    const edge = Math.min(x, 9 - x, y, 5 - y);
    const grain = noise(Math.floor(tileX * 64), Math.floor(tileY * 64), 61);
    const wear = noise(Math.floor(tileX * 5), Math.floor(tileY * 5), 67);
    if (edge < 0.16) return varyColour([48, 53, 51], (grain - 0.5) * 7);
    if (edge < 0.19 || (edge > 0.39 && edge < 0.42)) return varyColour([145, 123, 73], (grain - 0.5) * 12);
    if (edge < 0.42) {
        const section = Math.floor((Math.abs(x - 4.5) + Math.abs(y - 2.5)) * 3);
        return varyColour(section % 2 === 0 ? [71, 79, 72] : [91, 95, 82], (grain - 0.5) * 6);
    }
    const cx = x - 4.5;
    const cy = y - 2.5;
    const radius = Math.hypot(cx, cy);
    if (radius < 0.8) {
        if (radius > 0.72 || (radius > 0.59 && radius < 0.63)) return varyColour([153, 131, 80], (grain - 0.5) * 10);
        if (radius > 0.63) return varyColour([48, 59, 56], (grain - 0.5) * 5);
        const diamond = Math.abs(cx) + Math.abs(cy);
        if (Math.abs(cx) < 0.065 || Math.abs(cy) < 0.065 || (diamond > 0.35 && diamond < 0.4)) return varyColour([143, 122, 76], (grain - 0.5) * 9);
        return varyColour([111, 119, 103], (grain - 0.5) * 7);
    }
    const rx = (cx + cy) / Math.SQRT2;
    const ry = (cy - cx) / Math.SQRT2;
    const column = Math.floor(rx / 0.72);
    const row = Math.floor(ry / 0.72);
    const lx = fract(rx / 0.72);
    const ly = fract(ry / 0.72);
    if (Math.min(lx, 1 - lx, ly, 1 - ly) < 0.009) return [62, 66, 58];
    const light = ((column + row) & 1) === 0;
    let base = varyColour(light ? [176, 171, 147] : [59, 72, 68], (noise(column, row, 71) - 0.5) * 15 + (grain - 0.5) * 5);
    const vein = Math.sin(rx * 14 + ry * 6 + Math.sin(ry * 11) * 0.65);
    if (Math.abs(vein) > 0.975) base = mixColour(base, light ? [108, 116, 101] : [102, 115, 105], 0.22);
    if (wear > 0.76) base = mixColour(base, [104, 104, 85], 0.1);
    return base;
}

function countrysideColour(x: number, y: number): Colour {
    const patch = noise(Math.floor(x * 3), Math.floor(y * 3), 79);
    const detail = noise(Math.floor(x * 32), Math.floor(y * 32), 83);
    const fine = noise(Math.floor(x * 64), Math.floor(y * 64), 89);
    const distance = Math.abs(x - approachCentre(y));
    const width = 1.05 + Math.sin(y * 6.7) * 0.08 + Math.sin(y * 13.1) * 0.035;
    const amount = y >= 20 ? clamp((width - distance) / 0.28, 0, 1) : 0;
    let grass: Colour = patch < 0.25 ? [40, 47, 29] : patch < 0.65 ? [38, 54, 33] : [49, 59, 35];
    grass = varyColour(grass, (detail - 0.5) * 12 + (fine - 0.5) * 4);
    let base = mixColour(grass, [68 + detail * 12, 59 + detail * 10, 43 + detail * 8], amount);
    if (amount > 0.75 && fine > 0.975) base = mixColour(base, [111, 113, 98], 0.55);
    if (amount < 0.2 && patch < 0.12) base = mixColour(base, [61, 54, 37], 0.35);
    return base;
}

export function sampleGroundColour(worldX: number, worldY: number, isTop: boolean = true): Colour {
    if (!isTop) return [67, 69, 61];
    const x = worldX / TILESIZE;
    const y = worldY / TILESIZE;
    if (x >= 11 && x < 20 && y >= 4 && y < 9) return galleryColour(x, y);
    if ((x >= 7 && x < 9 && y >= 6 && y < 9) || (x >= 22 && x < 24 && y >= 6 && y < 9)) return pavingColour(x, y, true);
    if (x >= 14 && x < 17 && y >= 9 && y < 16) return pavingColour(x, y, true);
    if (x >= 5 && x < 26 && y >= 2 && y < 21) return pavingColour(x, y, false);
    return countrysideColour(x, y);
}
