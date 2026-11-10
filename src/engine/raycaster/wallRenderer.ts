import {
    RES,
    TILESIZE,
    WINDOW_HEIGHT,
} from "../../settings";

import { projectHeight } from "./camera";

import {
    ATMOSPHERE,
    fogAmount,
    shadeColour,
} from "./atmosphere";

import type { WallTexture } from "./textures";
import type { CameraState, WallSegment } from "./types";

export function renderWalls(
    context: CanvasRenderingContext2D,
    columns: WallSegment[][],
    camera: CameraState,
    texture: WallTexture
): void {
    for (
        let column = 0;
        column < columns.length;
        column++
    ) {
        const segments = columns[column];

        if (!segments) {
            continue;
        }

        const screenX = column * RES;

        for (
            let index = segments.length - 1;
            index >= 0;
            index--
        ) {
            const segment = segments[index];

            if (!segment) {
                continue;
            }

            renderWallSegment(
                context,
                screenX,
                segment,
                camera,
                texture
            );
        }
    }
}

function renderWallSegment(
    context: CanvasRenderingContext2D,
    screenX: number,
    segment: WallSegment,
    camera: CameraState,
    texture: WallTexture
): void {
    const distance = Math.max(
        0.1,
        segment.entryDistance
    );

    const brightness =
        ATMOSPHERE.ambient *
        (
            0.65 +
            0.35 /
            (1 + distance / (TILESIZE * 8))
        );

    const sideShade =
        segment.verticalSide ? 1 : 0.79;

    const fog = fogAmount(distance);

    if (camera.cameraHeight > segment.height) {
        const nearTop = projectHeight(
            segment.height,
            segment.entryDistance,
            camera
        );

        const farTop = projectHeight(
            segment.height,
            segment.exitDistance,
            camera
        );

        const top = Math.max(
            0,
            Math.min(nearTop, farTop)
        );

        const bottom = Math.min(
            WINDOW_HEIGHT,
            Math.max(nearTop, farTop)
        );

        if (bottom > top) {
            context.fillStyle = shadeColour(
                [88, 93, 82],
                distance,
                0.9
            );

            context.fillRect(
                screenX,
                top,
                RES,
                bottom - top
            );
        }
    }

    for (
        let baseHeight = 0;
        baseHeight < segment.height;
        baseHeight += TILESIZE
    ) {
        const upperHeight = Math.min(
            baseHeight + TILESIZE,
            segment.height
        );

        const top = projectHeight(
            upperHeight,
            distance,
            camera
        );

        const bottom = projectHeight(
            baseHeight,
            distance,
            camera
        );

        if (
            bottom <= 0 ||
            top >= WINDOW_HEIGHT
        ) {
            continue;
        }

        const height = bottom - top;

        if (height <= 0) {
            continue;
        }

        const damp =
            baseHeight < TILESIZE ? 0.76 : 1;

        if (
            texture.loaded &&
            texture.image.naturalWidth > 0 &&
            texture.image.naturalHeight > 0
        ) {
            const textureWidth =
                texture.image.naturalWidth;

            const textureHeight =
                texture.image.naturalHeight;

            const textureX = Math.max(
                0,
                Math.min(
                    textureWidth - 1,
                    Math.floor(
                        segment.texturePosition *
                        textureWidth
                    )
                )
            );

            context.drawImage(
                texture.image,
                textureX,
                0,
                1,
                textureHeight,
                screenX,
                top,
                RES,
                height
            );

            context.fillStyle =
                "rgba(36, 49, 40, 0.12)";

            context.fillRect(
                screenX,
                top,
                RES,
                height
            );

            const darkness =
                1 - brightness * sideShade * damp;

            context.fillStyle =
                `rgba(0, 0, 0, ${darkness})`;

            context.fillRect(
                screenX,
                top,
                RES,
                height
            );

            if (fog > 0) {
                context.fillStyle =
                    `rgba(${ATMOSPHERE.fog[0]}, ` +
                    `${ATMOSPHERE.fog[1]}, ` +
                    `${ATMOSPHERE.fog[2]}, ${fog})`;

                context.fillRect(
                    screenX,
                    top,
                    RES,
                    height
                );
            }
        } else {
            context.fillStyle = shadeColour(
                [118, 123, 109],
                distance,
                sideShade * damp
            );

            context.fillRect(
                screenX,
                top,
                RES,
                height
            );
        }
    }
}