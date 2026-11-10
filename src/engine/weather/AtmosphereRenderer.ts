import {
    FOV,
    NUM_RAYS,
    RES,
} from "../../settings";

import { ATMOSPHERE } from "../raycaster/atmosphere";

const PANORAMA_WIDTH = 1536;
const PANORAMA_HEIGHT = 512;
const PANORAMA_HORIZON = 365;
const VERTICAL_SCALE = 190;
const TWO_PI = Math.PI * 2;

type BackgroundCamera = {
    rotationAngle: number;
    horizonY: number;
    projectionDistance: number;
};

type RGB = readonly [number, number, number];

function clamp(
    value: number,
    minimum: number,
    maximum: number
): number {
    return Math.max(minimum, Math.min(maximum, value));
}

function wrap(value: number, length: number): number {
    return ((value % length) + length) % length;
}

function smooth(value: number): number {
    return value * value * (3 - 2 * value);
}

function hash(
    x: number,
    y: number,
    seed: number
): number {
    let value =
        Math.imul(x, 374761393) ^
        Math.imul(y, 668265263) ^
        Math.imul(seed, 1442695041);

    value = Math.imul(
        value ^ (value >>> 13),
        1274126177
    );

    return ((value ^ (value >>> 16)) >>> 0) /
        4294967295;
}

function periodicNoise(
    u: number,
    v: number,
    cells: number,
    seed: number
): number {
    const x = u * cells;
    const y = v * cells;

    const cellX = Math.floor(x);
    const cellY = Math.floor(y);

    const fractionX = smooth(x - cellX);
    const fractionY = smooth(y - cellY);

    const left = wrap(cellX, cells);
    const right = wrap(cellX + 1, cells);

    const a = hash(left, cellY, seed);
    const b = hash(right, cellY, seed);
    const c = hash(left, cellY + 1, seed);
    const d = hash(right, cellY + 1, seed);

    const top = a + (b - a) * fractionX;
    const bottom = c + (d - c) * fractionX;

    return top + (bottom - top) * fractionY;
}

function mix(
    first: RGB,
    second: RGB,
    amount: number
): RGB {
    const fraction = clamp(amount, 0, 1);

    return [
        first[0] + (second[0] - first[0]) * fraction,
        first[1] + (second[1] - first[1]) * fraction,
        first[2] + (second[2] - first[2]) * fraction,
    ];
}

function css(colour: RGB): string {
    return `rgb(${colour[0]}, ${colour[1]}, ${colour[2]})`;
}

export class AtmosphereRenderer {
    private readonly panorama =
        document.createElement("canvas");

    private readonly vignette =
        document.createElement("canvas");

    private readonly rayAngles =
        new Float64Array(NUM_RAYS);

    private width = 0;
    private height = 0;

    constructor() {
        this.panorama.width = PANORAMA_WIDTH;
        this.panorama.height = PANORAMA_HEIGHT;

        const tangent = Math.tan(FOV / 2);

        for (
            let column = 0;
            column < NUM_RAYS;
            column++
        ) {
            const cameraX =
                2 * ((column + 0.5) / NUM_RAYS) - 1;

            this.rayAngles[column] = Math.atan(
                cameraX * tangent
            );
        }

        this.buildPanorama();
    }

    public renderBackground(
        context: CanvasRenderingContext2D,
        camera: BackgroundCamera
    ): void {
        this.resize(
            context.canvas.width,
            context.canvas.height
        );

        context.save();

        context.globalAlpha = 1;
        context.globalCompositeOperation = "source-over";
        context.imageSmoothingEnabled = false;

        context.fillStyle = css(ATMOSPHERE.fog);
        context.fillRect(0, 0, this.width, this.height);

        if (
            !Number.isFinite(camera.projectionDistance) ||
            camera.projectionDistance <= 0
        ) {
            context.restore();
            return;
        }

        const horizon = camera.horizonY;

        const skyBottom = Math.min(
            this.height,
            Math.max(0, Math.ceil(horizon))
        );

        if (skyBottom <= 0) {
            context.restore();
            return;
        }

        context.fillStyle = css(ATMOSPHERE.skyTop);
        context.fillRect(0, 0, this.width, skyBottom);

        const pixelsPerSourcePixel =
            camera.projectionDistance / VERTICAL_SCALE;

        const panoramaTop =
            horizon -
            PANORAMA_HORIZON * pixelsPerSourcePixel;

        const panoramaBottom =
            panoramaTop +
            PANORAMA_HEIGHT * pixelsPerSourcePixel;

        const destinationTop = Math.max(
            0,
            panoramaTop
        );

        const destinationBottom = Math.min(
            skyBottom,
            panoramaBottom
        );

        if (destinationBottom <= destinationTop) {
            context.restore();
            return;
        }

        const sourceY =
            (destinationTop - panoramaTop) /
            pixelsPerSourcePixel;

        const sourceHeight =
            (destinationBottom - destinationTop) /
            pixelsPerSourcePixel;

        for (
            let column = 0;
            column < NUM_RAYS;
            column++
        ) {
            const screenX = column * RES;

            if (screenX >= this.width) {
                break;
            }

            const angle =
                camera.rotationAngle +
                (this.rayAngles[column] ?? 0);

            const u = wrap(angle, TWO_PI) / TWO_PI;

            const sourceX = Math.min(
                PANORAMA_WIDTH - 1,
                Math.floor(u * PANORAMA_WIDTH)
            );

            context.drawImage(
                this.panorama,
                sourceX,
                sourceY,
                1,
                sourceHeight,
                screenX,
                destinationTop,
                Math.min(RES, this.width - screenX),
                destinationBottom - destinationTop
            );
        }

        context.restore();
    }

    public renderOverlay(
        context: CanvasRenderingContext2D
    ): void {
        this.resize(
            context.canvas.width,
            context.canvas.height
        );

        context.save();

        context.globalAlpha = 1;
        context.globalCompositeOperation = "source-over";

        context.drawImage(this.vignette, 0, 0);

        context.restore();
    }

    private buildPanorama(): void {
        const context = this.panorama.getContext("2d");

        if (!context) {
            throw new Error(
                "Could not create countryside panorama"
            );
        }

        const image = context.createImageData(
            PANORAMA_WIDTH,
            PANORAMA_HEIGHT
        );

        const data = image.data;

        for (
            let y = 0;
            y < PANORAMA_HEIGHT;
            y++
        ) {
            const vertical = clamp(
                y / PANORAMA_HORIZON,
                0,
                1
            );

            const base = mix(
                ATMOSPHERE.skyTop,
                ATMOSPHERE.skyHorizon,
                Math.pow(vertical, 1.35)
            );

            const horizonBlend = smooth(
                clamp(
                    (y - (PANORAMA_HORIZON - 45)) / 45,
                    0,
                    1
                )
            );

            for (
                let x = 0;
                x < PANORAMA_WIDTH;
                x++
            ) {
                const u = x / PANORAMA_WIDTH;
                const v = y / PANORAMA_HEIGHT;

                const cloud =
                    periodicNoise(u, v * 0.8, 8, 13) * 0.58 +
                    periodicNoise(u, v * 0.8, 16, 29) * 0.29 +
                    periodicNoise(u, v * 0.8, 32, 47) * 0.13;

                const band =
                    Math.sin(
                        v * 29 +
                        periodicNoise(u, v, 8, 71) * 5
                    ) * 3;

                const cloudShade =
                    (cloud - 0.5) * 38 + band;

                const cloudColour: RGB = [
                    clamp(base[0] + cloudShade, 0, 255),
                    clamp(base[1] + cloudShade, 0, 255),
                    clamp(base[2] + cloudShade * 1.05, 0, 255),
                ];

                const colour = mix(
                    cloudColour,
                    ATMOSPHERE.fog,
                    horizonBlend
                );

                const index =
                    (y * PANORAMA_WIDTH + x) * 4;

                data[index] = Math.round(colour[0]);
                data[index + 1] = Math.round(colour[1]);
                data[index + 2] = Math.round(colour[2]);
                data[index + 3] = 255;
            }
        }

        context.putImageData(image, 0, 0);

        this.drawHills(
            context,
            [54, 65, 65],
            32,
            17,
            0.7
        );

        this.drawHills(
            context,
            [45, 58, 55],
            19,
            11,
            2.1
        );

        this.drawHills(
            context,
            [35, 49, 43],
            8,
            6,
            3.4
        );

        this.drawWoodland(context);

        const haze = context.createLinearGradient(
            0,
            PANORAMA_HORIZON - 30,
            0,
            PANORAMA_HORIZON
        );

        const fog = ATMOSPHERE.fog;

        haze.addColorStop(
            0,
            `rgba(${fog[0]}, ${fog[1]}, ${fog[2]}, 0)`
        );

        haze.addColorStop(
            1,
            `rgba(${fog[0]}, ${fog[1]}, ${fog[2]}, 1)`
        );

        context.fillStyle = haze;

        context.fillRect(
            0,
            PANORAMA_HORIZON - 30,
            PANORAMA_WIDTH,
            30
        );

        context.fillStyle = css(ATMOSPHERE.fog);

        context.fillRect(
            0,
            PANORAMA_HORIZON,
            PANORAMA_WIDTH,
            PANORAMA_HEIGHT - PANORAMA_HORIZON
        );
    }

    private drawHills(
        context: CanvasRenderingContext2D,
        colour: RGB,
        elevation: number,
        amplitude: number,
        phase: number
    ): void {
        context.fillStyle = css(colour);
        context.beginPath();
        context.moveTo(0, PANORAMA_HEIGHT);

        for (
            let x = 0;
            x <= PANORAMA_WIDTH;
            x += 2
        ) {
            const angle =
                (x / PANORAMA_WIDTH) * TWO_PI;

            const profile =
                Math.sin(angle * 2 + phase) * 0.52 +
                Math.sin(angle * 5 + phase * 2) * 0.28 +
                Math.sin(angle * 9 + phase * 3) * 0.14 +
                Math.sin(angle * 17 + phase) * 0.06;

            const y =
                PANORAMA_HORIZON -
                elevation -
                profile * amplitude;

            context.lineTo(x, y);
        }

        context.lineTo(
            PANORAMA_WIDTH,
            PANORAMA_HEIGHT
        );

        context.closePath();
        context.fill();
    }

    private drawWoodland(
        context: CanvasRenderingContext2D
    ): void {
        const count = 180;
        const spacing = PANORAMA_WIDTH / count;

        for (
            let index = -2;
            index < count + 2;
            index++
        ) {
            const id = wrap(index, count);

            const variation = hash(id, 0, 113);
            const shape = hash(id, 0, 127);

            const x =
                index * spacing +
                (variation - 0.5) * spacing * 0.7;

            const angle =
                (x / PANORAMA_WIDTH) * TWO_PI;

            const groundY =
                PANORAMA_HORIZON -
                5 -
                Math.sin(angle * 3 + 0.8) * 3 -
                Math.sin(angle * 7) * 2;

            const treeHeight = 7 + variation * 12;
            const treeWidth = 4 + shape * 7;

            context.fillStyle = shape > 0.5
                ? "rgb(33, 47, 39)"
                : "rgb(39, 52, 43)";

            if (shape > 0.45) {
                context.beginPath();

                context.moveTo(
                    x,
                    groundY - treeHeight
                );

                context.lineTo(
                    x + treeWidth / 2,
                    groundY
                );

                context.lineTo(
                    x - treeWidth / 2,
                    groundY
                );

                context.closePath();
                context.fill();
            } else {
                context.beginPath();

                context.ellipse(
                    x,
                    groundY - treeHeight * 0.52,
                    treeWidth * 0.6,
                    treeHeight * 0.48,
                    0,
                    0,
                    TWO_PI
                );

                context.fill();

                context.fillRect(
                    x - 1,
                    groundY - treeHeight * 0.45,
                    2,
                    treeHeight * 0.45
                );
            }
        }
    }

    private resize(
        width: number,
        height: number
    ): void {
        if (
            width === this.width &&
            height === this.height
        ) {
            return;
        }

        this.width = width;
        this.height = height;

        this.vignette.width = width;
        this.vignette.height = height;

        const context = this.vignette.getContext("2d");

        if (!context) {
            throw new Error(
                "Could not create atmosphere vignette"
            );
        }

        const radius = Math.hypot(
            width / 2,
            height / 2
        );

        const gradient = context.createRadialGradient(
            width / 2,
            height / 2,
            radius * 0.3,
            width / 2,
            height / 2,
            radius
        );

        gradient.addColorStop(
            0,
            "rgba(0, 0, 0, 0)"
        );

        gradient.addColorStop(
            0.7,
            "rgba(0, 0, 0, 0.05)"
        );

        gradient.addColorStop(
            1,
            "rgba(0, 0, 0, 0.28)"
        );

        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
    }
}