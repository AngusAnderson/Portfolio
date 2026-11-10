import { FOV, NUM_RAYS, RES, TILESIZE, WINDOW_HEIGHT } from "../../settings";
import { projectHeight } from "./camera";
import { ATMOSPHERE, fogAmount, noise, shadeColour } from "./atmosphere";
import { isCastleMasonry, isEstateMasonry } from "../map/levels/estate";
import type { WallTexture } from "./textures";
import type { CameraState, WallSegment } from "./types";

let rockTexture: HTMLCanvasElement | null = null;

function getRockTexture(): HTMLCanvasElement {
    if (rockTexture) return rockTexture;
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not create rock material");
    const image = context.createImageData(64, 64);
    for (let y = 0; y < 64; y++) {
        for (let x = 0; x < 64; x++) {
            const coarse = noise(Math.floor(x / 9), Math.floor(y / 13), 83);
            const grain = noise(x, y, 97);
            const seam = Math.abs(Math.sin(x * 0.11 + y * 0.07 + coarse * 0.7)) < 0.065;
            const moss = y > 38 && coarse > 0.55;
            const value = 82 + coarse * 33 + grain * 9 - (seam ? 23 : 0);
            const i = (y * 64 + x) * 4;
            image.data[i] = value * (moss ? 0.72 : 0.94);
            image.data[i + 1] = value * (moss ? 0.86 : 1);
            image.data[i + 2] = value * (moss ? 0.57 : 0.93);
            image.data[i + 3] = 255;
        }
    }
    context.putImageData(image, 0, 0);
    rockTexture = canvas;
    return canvas;
}

export function renderWalls(
    context: CanvasRenderingContext2D,
    columns: WallSegment[][],
    camera: CameraState,
    texture: WallTexture
): void {
    const forwardX = Math.cos(camera.rotationAngle);
    const forwardY = Math.sin(camera.rotationAngle);
    const tangent = Math.tan(FOV / 2);
    for (let column = 0; column < columns.length; column++) {
        const segments = columns[column];
        if (!segments) continue;
        const cameraX = 2 * ((column + 0.5) / NUM_RAYS) - 1;
        const dx = forwardX - forwardY * cameraX * tangent;
        const dy = forwardY + forwardX * cameraX * tangent;
        for (let index = segments.length - 1; index >= 0; index--) {
            const segment = segments[index];
            if (!segment) continue;
            const distance = Math.max(0.1, segment.entryDistance);
            const hitX = (camera.x + dx * distance) / TILESIZE;
            const hitY = (camera.y + dy * distance) / TILESIZE;
            const masonry = isCastleMasonry(hitX, hitY) || isEstateMasonry(hitX, hitY);
            const source = !masonry ? getRockTexture()
                : texture.loaded && texture.image.naturalWidth > 0 ? texture.image : null;
            const sourceWidth = source instanceof HTMLImageElement ? source.naturalWidth : source?.width ?? 0;
            const sourceHeight = source instanceof HTMLImageElement ? source.naturalHeight : source?.height ?? 0;
            const screenX = column * RES;
            const sideShade = segment.verticalSide ? 1 : 0.79;
            const brightness = ATMOSPHERE.ambient * (0.65 + 0.35 / (1 + distance / (TILESIZE * 8)));
            const fog = fogAmount(distance);
            if (camera.cameraHeight > segment.height) {
                const near = projectHeight(segment.height, distance, camera);
                const far = projectHeight(segment.height, segment.exitDistance, camera);
                const top = Math.max(0, Math.min(near, far));
                const bottom = Math.min(WINDOW_HEIGHT, Math.max(near, far));
                if (bottom > top) {
                    context.fillStyle = shadeColour(masonry ? [88, 93, 82] : [66, 82, 57], distance, 0.9);
                    context.fillRect(screenX, top, RES, bottom - top);
                }
            }
            for (let base = 0; base < segment.height; base += TILESIZE) {
                const top = projectHeight(Math.min(base + TILESIZE, segment.height), distance, camera);
                const bottom = projectHeight(base, distance, camera);
                if (bottom <= 0 || top >= WINDOW_HEIGHT || bottom <= top) continue;
                const height = bottom - top;
                if (source && sourceWidth > 0 && sourceHeight > 0) {
                    const tx = Math.max(0, Math.min(sourceWidth - 1, Math.floor(segment.texturePosition * sourceWidth)));
                    context.drawImage(source, tx, 0, 1, sourceHeight, screenX, top, RES, height);
                    const damp = base < TILESIZE ? 0.76 : 1;
                    context.fillStyle = `rgba(0,0,0,${1 - brightness * sideShade * damp})`;
                    context.fillRect(screenX, top, RES, height);
                    if (fog > 0) {
                        context.fillStyle = `rgba(${ATMOSPHERE.fog.join(",")},${fog})`;
                        context.fillRect(screenX, top, RES, height);
                    }
                } else {
                    context.fillStyle = shadeColour([118, 123, 109], distance, sideShade);
                    context.fillRect(screenX, top, RES, height);
                }
            }
        }
    }
}
