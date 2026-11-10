import { FOV, NUM_RAYS, RES, WINDOW_HEIGHT } from "../../settings";
import type { GameMap } from "../map";
import { intersectRamp, intersectSuspendedPlatform } from "./intersections";
import { wallBlocksSurface } from "./visibility";
import { sampleGroundColour, shadeColour } from "./atmosphere";
import { isGalleryRoof, sampleRoofColour } from "../architecture/galleryStructure";
import type { CameraState, SurfaceHit, WallSegment } from "./types";

export function renderSurfaces(
    context: CanvasRenderingContext2D, map: GameMap,
    columns: WallSegment[][], camera: CameraState
): void {
    if (map.ramps.length === 0 && map.suspendedPlatforms.length === 0) return;
    const fx = Math.cos(camera.rotationAngle);
    const fy = Math.sin(camera.rotationAngle);
    const tangent = Math.tan(FOV / 2);
    const roofs = new Set(map.suspendedPlatforms.filter(isGalleryRoof));
    for (let column = 0; column < NUM_RAYS; column++) {
        const cameraX = 2 * ((column + 0.5) / NUM_RAYS) - 1;
        const dx = fx - fy * cameraX * tangent;
        const dy = fy + fx * cameraX * tangent;
        const walls = columns[column] ?? [];
        for (let screenY = 0; screenY < WINDOW_HEIGHT; screenY++) {
            const dz = (camera.horizonY - (screenY + 0.5)) / camera.projectionDistance;
            let nearest: SurfaceHit | null = null;
            let roofHit = false;
            for (const platform of map.suspendedPlatforms) {
                const hit = intersectSuspendedPlatform(platform, dx, dy, dz, camera);
                if (hit && (!nearest || hit.distance < nearest.distance)) {
                    nearest = hit;
                    roofHit = roofs.has(platform);
                }
            }
            for (const ramp of map.ramps) {
                const hit = intersectRamp(ramp, dx, dy, dz, camera);
                if (hit && (!nearest || hit.distance < nearest.distance)) {
                    nearest = hit;
                    roofHit = false;
                }
            }
            if (!nearest || wallBlocksSurface(walls, nearest.distance, dz, camera.cameraHeight)) continue;
            const colour = roofHit
                ? sampleRoofColour(nearest.x, nearest.y, nearest.isTop)
                : sampleGroundColour(nearest.x, nearest.y, nearest.isTop);
            context.fillStyle = shadeColour(colour, nearest.distance, nearest.isTop ? 1 : roofHit ? 0.95 : 0.75);
            context.fillRect(column * RES, screenY, RES, 1);
        }
    }
}
