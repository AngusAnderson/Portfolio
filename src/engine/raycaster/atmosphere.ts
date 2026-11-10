import { TILESIZE } from "../../settings";

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

function clamp(
    value: number,
    minimum: number,
    maximum: number
): number {
    return Math.max(minimum, Math.min(maximum, value));
}

export function noise(
    x: number,
    y: number,
    seed: number = 0
): number {
    let value =
        Math.imul(x | 0, 374761393) ^
        Math.imul(y | 0, 668265263) ^
        Math.imul(seed | 0, 1442695041);

    value = Math.imul(
        value ^ (value >>> 13),
        1274126177
    );

    return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

export function fogAmount(distance: number): number {
    const fraction = clamp(
        (distance - ATMOSPHERE.fogStart) /
        (ATMOSPHERE.fogEnd - ATMOSPHERE.fogStart),
        0,
        1
    );

    return fraction * fraction * (3 - 2 * fraction);
}

function cssColour(
    red: number,
    green: number,
    blue: number
): string {
    const r = clamp(Math.round(red / 4) * 4, 0, 255);
    const g = clamp(Math.round(green / 4) * 4, 0, 255);
    const b = clamp(Math.round(blue / 4) * 4, 0, 255);

    const key = `${r},${g},${b}`;

    let cached = palette.get(key);

    if (!cached) {
        cached = `rgb(${r}, ${g}, ${b})`;
        palette.set(key, cached);
    }

    return cached;
}

export function shadeColour(
    colour: Colour,
    distance: number,
    light: number = 1
): string {
    const illumination =
        ATMOSPHERE.ambient *
        light *
        (
            0.65 +
            0.35 /
            (1 + Math.max(0, distance) / (TILESIZE * 8))
        );

    const fog = fogAmount(distance);

    return cssColour(
        colour[0] * illumination * (1 - fog) +
            ATMOSPHERE.fog[0] * fog,
        colour[1] * illumination * (1 - fog) +
            ATMOSPHERE.fog[1] * fog,
        colour[2] * illumination * (1 - fog) +
            ATMOSPHERE.fog[2] * fog
    );
}

function pavingColour(
    tileX: number,
    tileY: number,
    interior: boolean
): Colour {
    const slabWidth = 0.8;
    const slabDepth = 0.58;

    const row = Math.floor(tileY / slabDepth);
    const offset = (row & 1) * slabWidth * 0.5;

    const shiftedX = tileX + offset;

    const column = Math.floor(shiftedX / slabWidth);

    const localX =
        shiftedX / slabWidth -
        Math.floor(shiftedX / slabWidth);

    const localY =
        tileY / slabDepth -
        Math.floor(tileY / slabDepth);

    const joint =
        localX < 0.025 ||
        localY < 0.035 ||
        localX > 0.975 ||
        localY > 0.965;

    const variation = noise(column, row, 7);
    const grain =
        noise(
            Math.floor(tileX * 42),
            Math.floor(tileY * 42),
            11
        ) * 6 - 3;

    if (joint) {
        return interior
            ? [37, 39, 35]
            : [31, 38, 29];
    }

    const base = (interior ? 100 : 84) +
        variation * 18 +
        grain;

    const moss = !interior &&
        (
            localX < 0.1 ||
            localY < 0.13
        ) &&
        variation > 0.58;

    if (moss) {
        return [base * 0.53, base * 0.65, base * 0.43];
    }

    return [base, base * 0.99, base * 0.9];
}

export function sampleGroundColour(
    worldX: number,
    worldY: number,
    isTop: boolean = true
): Colour {
    if (!isTop) {
        return [67, 69, 61];
    }

    const x = worldX / TILESIZE;
    const y = worldY / TILESIZE;

    const inGallery =
        x >= 11 &&
        x < 20 &&
        y >= 4 &&
        y < 9;

    const inLeftChamber =
        x >= 7 &&
        x < 9 &&
        y >= 6 &&
        y < 9;

    const inRightChamber =
        x >= 22 &&
        x < 24 &&
        y >= 6 &&
        y < 9;

    const inCastle =
        x >= 5 &&
        x < 26 &&
        y >= 2 &&
        y < 21;

    if (
        inGallery ||
        inLeftChamber ||
        inRightChamber
    ) {
        return pavingColour(x, y, true);
    }

    if (inCastle) {
        return pavingColour(x, y, false);
    }

    const coarse = noise(
        Math.floor(x * 5),
        Math.floor(y * 5),
        19
    );

    const fine = noise(
        Math.floor(x * 48),
        Math.floor(y * 48),
        23
    );

    const pathCentre =
        15.5 +
        Math.sin((y - 20) * 0.45) * 0.45;

    const pathWidth =
        1.1 +
        (noise(0, Math.floor(y * 4), 31) - 0.5) * 0.3;

    const onPath =
        y >= 20 &&
        Math.abs(x - pathCentre) < pathWidth;

    if (onPath) {
        const shade = coarse * 15 + fine * 5;

        return [
            66 + shade,
            58 + shade,
            43 + shade * 0.8,
        ];
    }

    const shade = coarse * 16 + fine * 8;

    return [
        34 + shade * 0.65,
        45 + shade,
        30 + shade * 0.6,
    ];
}