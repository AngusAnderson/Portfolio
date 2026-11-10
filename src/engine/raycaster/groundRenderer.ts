import {
    FOV,
    NUM_RAYS,
    RES,
} from "../../settings";

import type { CameraState } from "./types";

import {
    sampleGroundColour,
    shadeColour,
} from "./atmosphere";

const ROW_STEP = 2;

export function renderGround(
    context: CanvasRenderingContext2D,
    camera: CameraState
): void {
    if (camera.cameraHeight <= 0) {
        return;
    }

    const width = context.canvas.width;
    const height = context.canvas.height;

    const forwardX = Math.cos(camera.rotationAngle);
    const forwardY = Math.sin(camera.rotationAngle);

    const rightX = -forwardY;
    const rightY = forwardX;

    const halfFovTangent = Math.tan(FOV / 2);

    const firstY = Math.max(
        0,
        Math.floor(camera.horizonY) + 1
    );

    for (
        let screenY = firstY;
        screenY < height;
        screenY += ROW_STEP
    ) {
        const sampleY = screenY + ROW_STEP / 2;

        const depth =
            camera.cameraHeight *
            camera.projectionDistance /
            (sampleY - camera.horizonY);

        if (
            !Number.isFinite(depth) ||
            depth <= 0
        ) {
            continue;
        }

        for (
            let column = 0;
            column < NUM_RAYS;
            column++
        ) {
            const screenX = column * RES;

            if (screenX >= width) {
                break;
            }

            const cameraX =
                2 * ((column + 0.5) / NUM_RAYS) - 1;

            const directionX =
                forwardX +
                rightX * cameraX * halfFovTangent;

            const directionY =
                forwardY +
                rightY * cameraX * halfFovTangent;

            const worldX =
                camera.x + directionX * depth;

            const worldY =
                camera.y + directionY * depth;

            context.fillStyle = shadeColour(
                sampleGroundColour(worldX, worldY),
                depth
            );

            context.fillRect(
                screenX,
                screenY,
                Math.min(RES, width - screenX),
                Math.min(ROW_STEP, height - screenY)
            );
        }
    }
}