import {
    FOV,
    NUM_RAYS,
    RES,
} from "../../settings";

import type { Project } from "../../data/projects";

import type {
    ProjectPainting,
    ProjectView,
} from "./types";

type CameraEdge = {
    depth: number;
    sideways: number;
};

const NEAR_DEPTH = 0.1;

export class PaintingRenderer {
    private readonly textures =
        new Map<string, HTMLCanvasElement>();

    public render(
        context: CanvasRenderingContext2D,
        paintings: readonly ProjectPainting[],
        view: ProjectView
    ): void {
        const camera = view.getWorldCamera();

        const screenWidth = context.canvas.width;
        const screenHeight = context.canvas.height;

        const forwardX = Math.cos(camera.rotationAngle);
        const forwardY = Math.sin(camera.rotationAngle);

        const rightX = -forwardY;
        const rightY = forwardX;

        const halfFovTangent = Math.tan(FOV / 2);

        const horizontalProjection =
            screenWidth / (2 * halfFovTangent);

        const sorted = [...paintings].sort((a, b) => {
            const distanceA =
                (a.x - camera.x) ** 2 +
                (a.y - camera.y) ** 2;

            const distanceB =
                (b.x - camera.x) ** 2 +
                (b.y - camera.y) ** 2;

            return distanceB - distanceA;
        });

        context.save();

        context.globalAlpha = 1;
        context.globalCompositeOperation = "source-over";
        context.imageSmoothingEnabled = false;

        for (const painting of sorted) {
            const normalX = Math.cos(painting.normalAngle);
            const normalY = Math.sin(painting.normalAngle);

            const tangentX = -normalY;
            const tangentY = normalX;

            const frontDistance =
                (camera.x - painting.x) * normalX +
                (camera.y - painting.y) * normalY;

            if (frontDistance <= 0) {
                continue;
            }

            // ----------------------------------------
            // Project and clip the horizontal edges
            // ----------------------------------------

            const getCameraEdge = (
                side: number
            ): CameraEdge => {
                const worldX =
                    painting.x + tangentX * side;

                const worldY =
                    painting.y + tangentY * side;

                const relativeX = worldX - camera.x;
                const relativeY = worldY - camera.y;

                return {
                    depth:
                        relativeX * forwardX +
                        relativeY * forwardY,

                    sideways:
                        relativeX * rightX +
                        relativeY * rightY,
                };
            };

            let edgeA = getCameraEdge(
                -painting.width / 2
            );

            let edgeB = getCameraEdge(
                painting.width / 2
            );

            if (
                edgeA.depth < NEAR_DEPTH &&
                edgeB.depth < NEAR_DEPTH
            ) {
                continue;
            }

            if (edgeA.depth < NEAR_DEPTH) {
                edgeA = this.clipEdge(edgeA, edgeB);
            }

            if (edgeB.depth < NEAR_DEPTH) {
                edgeB = this.clipEdge(edgeB, edgeA);
            }

            const projectedEdgeA =
                screenWidth / 2 +
                (edgeA.sideways / edgeA.depth) *
                    horizontalProjection;

            const projectedEdgeB =
                screenWidth / 2 +
                (edgeB.sideways / edgeB.depth) *
                    horizontalProjection;

            const firstX = Math.max(
                0,
                Math.floor(
                    Math.min(
                        projectedEdgeA,
                        projectedEdgeB
                    )
                )
            );

            const lastX = Math.min(
                screenWidth - 1,
                Math.ceil(
                    Math.max(
                        projectedEdgeA,
                        projectedEdgeB
                    )
                )
            );

            const texture = this.getTexture(
                painting.project
            );

            // ----------------------------------------
            // Render vertical strips
            // ----------------------------------------

            for (let x = firstX; x <= lastX; x++) {
                const column = Math.floor(x / RES);

                if (
                    column < 0 ||
                    column >= NUM_RAYS
                ) {
                    continue;
                }

                const cameraX = 2 * ((column + 0.5) / NUM_RAYS) - 1;

                const directionX = forwardX + rightX * cameraX * halfFovTangent;

                const directionY =
                    forwardY +
                    rightY * cameraX * halfFovTangent;

                const denominator =
                    directionX * normalX +
                    directionY * normalY;

                if (denominator >= -0.000001) {
                    continue;
                }

                const depth =
                    -frontDistance / denominator;

                if (depth < NEAR_DEPTH) {
                    continue;
                }

                const worldX =
                    camera.x + directionX * depth;

                const worldY =
                    camera.y + directionY * depth;

                const sideways =
                    (worldX - painting.x) * tangentX +
                    (worldY - painting.y) * tangentY;

                const u =
                    0.5 - sideways / painting.width;

                if (u < 0 || u >= 1) {
                    continue;
                }

                const topY =
                    camera.horizonY -
                    (
                        (
                            painting.bottomHeight +
                            painting.height -
                            camera.cameraHeight
                        ) / depth
                    ) * camera.projectionDistance;

                const bottomY =
                    camera.horizonY -
                    (
                        (
                            painting.bottomHeight -
                            camera.cameraHeight
                        ) / depth
                    ) * camera.projectionDistance;

                const projectedHeight =
                    bottomY - topY;

                if (projectedHeight <= 0) {
                    continue;
                }

                const firstY = Math.max(
                    0,
                    Math.ceil(topY)
                );

                const endY = Math.min(
                    screenHeight,
                    Math.floor(bottomY)
                );

                if (firstY >= endY) {
                    continue;
                }

                const textureX = Math.min(
                    texture.width - 1,
                    Math.floor(u * texture.width)
                );

                let runStart: number | null = null;

                const drawRun = (end: number): void => {
                    if (
                        runStart === null ||
                        end <= runStart
                    ) {
                        return;
                    }

                    const sourceY =
                        (
                            (runStart - topY) /
                            projectedHeight
                        ) * texture.height;

                    const sourceHeight =
                        (
                            (end - runStart) /
                            projectedHeight
                        ) * texture.height;

                    context.drawImage(
                        texture,

                        textureX,
                        sourceY,
                        1,
                        sourceHeight,

                        x,
                        runStart,
                        1,
                        end - runStart
                    );
                };

                for (let y = firstY; y < endY; y++) {
                    const visible =
                        view.isWorldPointVisible(
                            x,
                            y,
                            depth
                        );

                    if (visible) {
                        if (runStart === null) {
                            runStart = y;
                        }
                    } else if (runStart !== null) {
                        drawRun(y);
                        runStart = null;
                    }
                }

                drawRun(endY);
            }
        }

        context.restore();
    }

    private clipEdge(
        behind: CameraEdge,
        ahead: CameraEdge
    ): CameraEdge {
        const progress =
            (NEAR_DEPTH - behind.depth) /
            (ahead.depth - behind.depth);

        return {
            depth: NEAR_DEPTH,

            sideways:
                behind.sideways +
                (ahead.sideways - behind.sideways) *
                    progress,
        };
    }

    private getTexture(
        project: Project
    ): HTMLCanvasElement {
        const cached = this.textures.get(project.id);

        if (cached) {
            return cached;
        }

        const texture = document.createElement("canvas");

        texture.width = 160;
        texture.height = 160;

        const context = texture.getContext("2d");

        if (!context) {
            throw new Error(
                "Could not create painting texture"
            );
        }

        // Outer frame.
        context.fillStyle = "#b3975e";
        context.fillRect(0, 0, 160, 160);

        // Inner frame.
        context.fillStyle = "#453824";
        context.fillRect(5, 5, 150, 150);

        // Picture background.
        context.fillStyle = "#182029";
        context.fillRect(10, 10, 140, 140);

        // Fallback title when no image is supplied.
        context.fillStyle = "#e4d3ac";
        context.font = "16px Georgia";
        context.textAlign = "center";
        context.textBaseline = "middle";

        context.fillText(
            project.title,
            80,
            80,
            125
        );

        this.textures.set(project.id, texture);

        if (project.image) {
            const image = new Image();

            image.addEventListener("load", () => {
                context.drawImage(
                    image,
                    10,
                    10,
                    140,
                    140
                );
            });

            image.addEventListener("error", () => {
                console.warn(
                    `Could not load painting image for "${project.title}"`
                );
            });

            image.src = project.image;
        }

        return texture;
    }
}