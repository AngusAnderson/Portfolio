import { TILESIZE } from "../../settings";
import type { GameMap } from "../map";
import { PROP_BOXES, isPropFootprintBlocked } from "../props/definitions";
import { intersectPropBox } from "../props/PropSystem";
import { intersectRamp, intersectSuspendedPlatform } from "../raycaster/intersections";
import { CHEST } from "./data";

export type Ray = { x: number; y: number; z: number; dx: number; dy: number; dz: number; };

export function boxDistance(ray: Ray, minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number): number {
    let near = -Infinity;
    let far = Infinity;
    for (let axis = 0; axis < 3; axis++) {
        const origin = axis === 0 ? ray.x : axis === 1 ? ray.y : ray.z;
        const direction = axis === 0 ? ray.dx : axis === 1 ? ray.dy : ray.dz;
        const low = axis === 0 ? minX : axis === 1 ? minY : minZ;
        const high = axis === 0 ? maxX : axis === 1 ? maxY : maxZ;
        if (Math.abs(direction) < 0.000001) {
            if (origin < low || origin > high) return Infinity;
            continue;
        }
        const a = (low - origin) / direction;
        const b = (high - origin) / direction;
        near = Math.max(near, Math.min(a, b));
        far = Math.min(far, Math.max(a, b));
        if (near > far) return Infinity;
    }
    if (far <= 0.01) return Infinity;
    return near > 0.01 ? near : far;
}

export function traceWorld(map: GameMap, ray: Ray, maximum: number, includeChest: boolean = true): number {
    let nearest = maximum;
    if (ray.dz < -0.000001 && ray.z > 0) nearest = Math.min(nearest, -ray.z / ray.dz);
    let column = Math.floor(ray.x / TILESIZE);
    let row = Math.floor(ray.y / TILESIZE);
    const stepX = ray.dx >= 0 ? 1 : -1;
    const stepY = ray.dy >= 0 ? 1 : -1;
    const deltaX = Math.abs(ray.dx) > 0.000001 ? TILESIZE / Math.abs(ray.dx) : Infinity;
    const deltaY = Math.abs(ray.dy) > 0.000001 ? TILESIZE / Math.abs(ray.dy) : Infinity;
    let nextX = Math.abs(ray.dx) > 0.000001 ? ((column + (stepX > 0 ? 1 : 0)) * TILESIZE - ray.x) / ray.dx : Infinity;
    let nextY = Math.abs(ray.dy) > 0.000001 ? ((row + (stepY > 0 ? 1 : 0)) * TILESIZE - ray.y) / ray.dy : Infinity;
    let travelled = 0;
    for (let step = 0; step < 1024 && travelled <= nearest; step++) {
        const value = map.grid[row]?.[column];
        if (value === undefined) { nearest = Math.min(nearest, Math.max(0, travelled)); break; }
        if (value > 0) {
            nearest = Math.min(nearest, boxDistance(ray, column * TILESIZE, row * TILESIZE, 0,
                (column + 1) * TILESIZE, (row + 1) * TILESIZE, value * TILESIZE));
        }
        if (nextX < nextY) { travelled = nextX; nextX += deltaX; column += stepX; }
        else { travelled = nextY; nextY += deltaY; row += stepY; }
        if (!Number.isFinite(travelled)) break;
    }
    for (const box of PROP_BOXES) {
        const hit = intersectPropBox(box, ray.x, ray.y, ray.z, ray.dx, ray.dy, ray.dz);
        if (hit) nearest = Math.min(nearest, hit.depth);
    }
    const camera = { x: ray.x, y: ray.y, cameraHeight: ray.z, rotationAngle: 0, horizonY: 0, projectionDistance: 1 };
    for (const platform of map.suspendedPlatforms) {
        const hit = intersectSuspendedPlatform(platform, ray.dx, ray.dy, ray.dz, camera);
        if (hit) nearest = Math.min(nearest, hit.distance);
    }
    for (const ramp of map.ramps) {
        const hit = intersectRamp(ramp, ray.dx, ray.dy, ray.dz, camera);
        if (hit) nearest = Math.min(nearest, hit.distance);
    }
    if (includeChest) nearest = Math.min(nearest, boxDistance(ray,
        CHEST.x - CHEST.width / 2, CHEST.y - CHEST.depth / 2, 0,
        CHEST.x + CHEST.width / 2, CHEST.y + CHEST.depth / 2, CHEST.height));
    return nearest;
}

export function clearLine(map: GameMap, x: number, y: number, z: number, tx: number, ty: number, tz: number, includeChest: boolean = true): boolean {
    const distance = Math.hypot(tx - x, ty - y);
    if (distance < 0.01) return true;
    return traceWorld(map, { x, y, z, dx: (tx - x) / distance, dy: (ty - y) / distance, dz: (tz - z) / distance }, distance, includeChest) >= distance - 0.02;
}

export function groundClear(map: GameMap, x: number, y: number, radius: number): boolean {
    if (x < TILESIZE * 6 || x > TILESIZE * 34 || y < TILESIZE * 10 || y > TILESIZE * 42) return false;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        const px = x + sx * radius;
        const py = y + sy * radius;
        if (map.hasWallAt(px, py) !== 0 || Math.abs(map.getGroundHeightAt(px, py)) > TILESIZE * 0.02) return false;
    }
    if (isPropFootprintBlocked(x, y, radius, 0, TILESIZE * 0.76)) return false;
    for (const platform of map.suspendedPlatforms) {
        if (x + radius > platform.x && x - radius < platform.x + platform.width &&
            y + radius > platform.y && y - radius < platform.y + platform.depth &&
            platform.bottomHeight < TILESIZE * 0.76 && platform.topHeight > 0.01) return false;
    }
    const cx = Math.max(CHEST.x - CHEST.width / 2, Math.min(CHEST.x + CHEST.width / 2, x));
    const cy = Math.max(CHEST.y - CHEST.depth / 2, Math.min(CHEST.y + CHEST.depth / 2, y));
    return (x - cx) ** 2 + (y - cy) ** 2 >= radius * radius;
}
