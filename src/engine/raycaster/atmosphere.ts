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

function fract(value: number): number {
    return value - Math.floor(value);
}

function mixColour(
    first: Colour,
    second: Colour,
    amount: number
): Colour {
    const blend = clamp(amount, 0, 1);

    return [
        first[0] + (second[0] - first[0]) * blend,
        first[1] + (second[1] - first[1]) * blend,
        first[2] + (second[2] - first[2]) * blend,
    ];
}

function varyColour(
    colour: Colour,
    amount: number
): Colour {
    return [
        clamp(colour[0] + amount, 0, 255),
        clamp(colour[1] + amount, 0, 255),
        clamp(colour[2] + amount, 0, 255),
    ];
}

function pavingColour(
    tileX: number,
    tileY: number,
    interior: boolean
): Colour {
    const slabWidth = interior ? 0.6 : 0.85;
    const slabDepth = interior ? 0.45 : 0.62;

    const row = Math.floor(tileY / slabDepth);
    const offset = (row & 1) * slabWidth * 0.5;

    const shiftedX = tileX + offset;
    const column = Math.floor(shiftedX / slabWidth);

    const localX = fract(shiftedX / slabWidth);
    const localY = fract(tileY / slabDepth);

    const slabSeed = noise(column, row, 7);

    const fine = noise(
        Math.floor(tileX * 48),
        Math.floor(tileY * 48),
        11
    );

    const broad = noise(
        Math.floor(tileX * 2),
        Math.floor(tileY * 2),
        17
    );

    const edgeDistance = Math.min(
        localX,
        1 - localX,
        localY,
        1 - localY
    );

    const jointWidth =
        0.008 + noise(column, row, 29) * 0.007;

    if (edgeDistance < jointWidth) {
        return interior
            ? [37, 39, 36]
            : [35, 40, 32];
    }

    let base: Colour;

    if (interior) {
        base = slabSeed < 0.35
            ? [85, 88, 81]
            : slabSeed < 0.72
                ? [105, 105, 93]
                : [118, 115, 100];
    } else {
        base = slabSeed < 0.25
            ? [77, 86, 80]
            : slabSeed < 0.55
                ? [104, 102, 86]
                : slabSeed < 0.8
                    ? [91, 95, 89]
                    : [117, 112, 96];
    }

    base = varyColour(
        base,
        (fine - 0.5) * 7 +
        (broad - 0.5) * 10
    );

    const bevel = clamp(
        edgeDistance / 0.055,
        0,
        1
    );

    base = mixColour(
        [base[0] * 0.75, base[1] * 0.75, base[2] * 0.75],
        base,
        bevel
    );

    const crackSeed = noise(column, row, 41);

    const crackPosition =
        0.2 +
        noise(column, row, 43) * 0.6;

    const crackLine =
        crackPosition +
        (localY - 0.5) *
        (noise(column, row, 47) - 0.5) *
        0.55;

    if (
        crackSeed > 0.8 &&
        localY > 0.12 &&
        localY < 0.9 &&
        Math.abs(localX - crackLine) < 0.006
    ) {
        base = mixColour(
            base,
            [37, 42, 33],
            0.65
        );
    }

    if (
        !interior &&
        edgeDistance < 0.07 &&
        slabSeed > 0.53 &&
        fine > 0.4
    ) {
        const mossAmount =
            (1 - edgeDistance / 0.07) * 0.55;

        base = mixColour(
            base,
            [48, 65, 35],
            mossAmount
        );
    }

    return base;
}

function galleryColour(
    tileX: number,
    tileY: number
): Colour {
    const x = tileX - 11;
    const y = tileY - 4;

    const edgeDistance = Math.min(
        x,
        9 - x,
        y,
        5 - y
    );

    const grain = noise(
        Math.floor(tileX * 64),
        Math.floor(tileY * 64),
        61
    );

    const wear = noise(
        Math.floor(tileX * 5),
        Math.floor(tileY * 5),
        67
    );

    if (edgeDistance < 0.16) {
        return varyColour(
            [48, 53, 51],
            (grain - 0.5) * 7
        );
    }

    if (
        edgeDistance < 0.19 ||
        (
            edgeDistance > 0.39 &&
            edgeDistance < 0.42
        )
    ) {
        return varyColour(
            [145, 123, 73],
            (grain - 0.5) * 12
        );
    }

    if (edgeDistance < 0.42) {
        const section = Math.floor(
            (
                Math.abs(x - 4.5) +
                Math.abs(y - 2.5)
            ) * 3
        );

        return varyColour(
            section % 2 === 0
                ? [71, 79, 72]
                : [91, 95, 82],
            (grain - 0.5) * 6
        );
    }

    const centreX = x - 4.5;
    const centreY = y - 2.5;

    const radius = Math.hypot(
        centreX,
        centreY
    );

    if (radius < 0.8) {
        if (
            radius > 0.72 ||
            (
                radius > 0.59 &&
                radius < 0.63
            )
        ) {
            return varyColour(
                [153, 131, 80],
                (grain - 0.5) * 10
            );
        }

        if (radius > 0.63) {
            return varyColour(
                [48, 59, 56],
                (grain - 0.5) * 5
            );
        }

        const diamond =
            Math.abs(centreX) +
            Math.abs(centreY);

        const cross =
            Math.abs(centreX) < 0.065 ||
            Math.abs(centreY) < 0.065;

        if (
            cross ||
            (
                diamond > 0.35 &&
                diamond < 0.4
            )
        ) {
            return varyColour(
                [143, 122, 76],
                (grain - 0.5) * 9
            );
        }

        return varyColour(
            [111, 119, 103],
            (grain - 0.5) * 7
        );
    }

    const diagonalSize = 0.72;

    const rotatedX =
        (centreX + centreY) / Math.SQRT2;

    const rotatedY =
        (centreY - centreX) / Math.SQRT2;

    const column = Math.floor(
        rotatedX / diagonalSize
    );

    const row = Math.floor(
        rotatedY / diagonalSize
    );

    const localX = fract(rotatedX / diagonalSize);
    const localY = fract(rotatedY / diagonalSize);

    const joint = Math.min(
        localX,
        1 - localX,
        localY,
        1 - localY
    );

    if (joint < 0.009) {
        return [62, 66, 58];
    }

    const lightTile = ((column + row) & 1) === 0;

    const tileVariation =
        (noise(column, row, 71) - 0.5) * 15;

    let base: Colour = lightTile
        ? [176, 171, 147]
        : [59, 72, 68];

    base = varyColour(
        base,
        tileVariation +
        (grain - 0.5) * 5
    );

    const vein =
        Math.sin(
            rotatedX * 14 +
            rotatedY * 6 +
            Math.sin(rotatedY * 11) * 0.65
        );

    if (Math.abs(vein) > 0.975) {
        base = mixColour(
            base,
            lightTile
                ? [108, 116, 101]
                : [102, 115, 105],
            0.22
        );
    }

    if (wear > 0.76) {
        base = mixColour(
            base,
            [104, 104, 85],
            0.1
        );
    }

    return base;
}

function countrysideColour(
    x: number,
    y: number
): Colour {
    const patch = noise(
        Math.floor(x * 3),
        Math.floor(y * 3),
        79
    );

    const detail = noise(
        Math.floor(x * 32),
        Math.floor(y * 32),
        83
    );

    const fine = noise(
        Math.floor(x * 64),
        Math.floor(y * 64),
        89
    );

    const pathCentre =
        15.5 +
        Math.sin((y - 20) * 0.45) * 0.45;

    const pathDistance =
        Math.abs(x - pathCentre);

    const edgeVariation =
        Math.sin(y * 6.7) * 0.08 +
        Math.sin(y * 13.1) * 0.035;

    const pathWidth = 1.05 + edgeVariation;

    const pathAmount = y >= 20
        ? clamp(
            (pathWidth - pathDistance) / 0.28,
            0,
            1
        )
        : 0;

    let grass: Colour = patch < 0.25
        ? [40, 47, 29]
        : patch < 0.65
            ? [38, 54, 33]
            : [49, 59, 35];

    grass = varyColour(
        grass,
        (detail - 0.5) * 12 +
        (fine - 0.5) * 4
    );

    const mud: Colour = [
        68 + detail * 12,
        59 + detail * 10,
        43 + detail * 8,
    ];

    let base = mixColour(
        grass,
        mud,
        pathAmount
    );

    if (
        pathAmount > 0.75 &&
        fine > 0.975
    ) {
        base = mixColour(
            base,
            [111, 113, 98],
            0.55
        );
    }

    if (
        pathAmount < 0.2 &&
        patch < 0.12
    ) {
        base = mixColour(
            base,
            [61, 54, 37],
            0.35
        );
    }

    return base;
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

    if (inGallery) {
        return galleryColour(x, y);
    }

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

    if (inLeftChamber || inRightChamber) {
        return pavingColour(x, y, true);
    }

    const onKeepApproach =
        x >= 14 &&
        x < 17 &&
        y >= 9 &&
        y < 16;

    if (onKeepApproach) {
        return pavingColour(x, y, true);
    }

    const inCastle =
        x >= 5 &&
        x < 26 &&
        y >= 2 &&
        y < 21;

    if (inCastle) {
        return pavingColour(x, y, false);
    }

    return countrysideColour(x, y);
}