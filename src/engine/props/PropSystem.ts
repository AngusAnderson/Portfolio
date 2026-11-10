import { FOV, RES, TILESIZE } from "../../settings";
import type { ProjectCamera, ProjectView } from "../projects/types";
import { noise, shadeColour, ATMOSPHERE } from "../raycaster/atmosphere";
import { PROP_BOXES, type PropBox } from "./definitions";

const ROW_STEP = 2;
const NEAR = 0.1;

type Hit = { depth: number; axis: number; };

export function intersectPropBox(
    box: PropBox,
    ox: number, oy: number, oz: number,
    dx: number, dy: number, dz: number
): Hit | null {
    let near = -Infinity;
    let far = Infinity;
    let nearAxis = 0;
    let farAxis = 0;
    const origins = [ox, oy, oz];
    const directions = [dx, dy, dz];
    const lows = [box.x - box.width / 2, box.y - box.depth / 2, box.z];
    const highs = [box.x + box.width / 2, box.y + box.depth / 2, box.z + box.height];
    for (let axis = 0; axis < 3; axis++) {
        const origin = origins[axis]!;
        const direction = directions[axis]!;
        const low = lows[axis]!;
        const high = highs[axis]!;
        if (Math.abs(direction) < 0.000001) {
            if (origin < low || origin > high) return null;
            continue;
        }
        const a = (low - origin) / direction;
        const b = (high - origin) / direction;
        const entry = Math.min(a, b);
        const exit = Math.max(a, b);
        if (entry > near) { near = entry; nearAxis = axis; }
        if (exit < far) { far = exit; farAxis = axis; }
        if (near > far) return null;
    }
    if (far < NEAR || !Number.isFinite(far)) return null;
    return near >= NEAR ? { depth: near, axis: nearAxis } : { depth: far, axis: farAxis };
}

export class PropSystem implements ProjectView {
    private readonly layer = document.createElement("canvas");
    private depths = new Float64Array(0);
    private directionsX = new Float64Array(0);
    private directionsY = new Float64Array(0);
    private rows = 0;
    private columns = 0;
    private image: ImageData | null = null;
    private camera: ProjectCamera | null = null;
    private previousPose = "";
    private readonly colours = new Map<string, readonly [number, number, number]>();

    constructor(private readonly world: ProjectView) {}

    public getWorldCamera(): ProjectCamera {
        return this.world.getWorldCamera();
    }

    public isWorldPointVisible(x: number, y: number, depth: number): boolean {
        if (!this.world.isWorldPointVisible(x, y, depth)) return false;
        const column = Math.floor(x / RES);
        const row = Math.floor(y / ROW_STEP);
        if (column < 0 || column >= this.columns || row < 0 || row >= this.rows) return true;
        const stored = this.depths[row * this.columns + column] ?? Infinity;
        return depth < stored - 0.01;
    }

    public invalidate(): void {
        this.previousPose = "";
    }

    public prepare(width: number, height: number): void {
        const current = this.world.getWorldCamera();
        const pose = [width, height, current.x, current.y, current.cameraHeight,
            current.rotationAngle, current.horizonY, current.projectionDistance].join(":");
        if (pose === this.previousPose) return;
        this.previousPose = pose;
        const columns = Math.ceil(width / RES);
        const rows = Math.ceil(height / ROW_STEP);
        if (this.columns !== columns || this.rows !== rows) {
            this.columns = columns;
            this.rows = rows;
            this.layer.width = columns;
            this.layer.height = rows;
            this.depths = new Float64Array(columns * rows);
            this.directionsX = new Float64Array(columns);
            this.directionsY = new Float64Array(columns);
            const ctx = this.layer.getContext("2d");
            if (!ctx) throw new Error("Could not create prop render layer");
            this.image = ctx.createImageData(columns, rows);
        }
        const image = this.image;
        if (!image) return;
        this.depths.fill(Infinity);
        image.data.fill(0);
        const camera = this.world.getWorldCamera();
        this.camera = camera;
        const fx = Math.cos(camera.rotationAngle);
        const fy = Math.sin(camera.rotationAngle);
        const tangent = Math.tan(FOV / 2);
        const projectionX = width / (2 * tangent);
        for (let column = 0; column < columns; column++) {
            const sx = Math.min(width - 0.5, column * RES + RES / 2);
            const cameraX = 2 * sx / width - 1;
            this.directionsX[column] = fx - fy * cameraX * tangent;
            this.directionsY[column] = fy + fx * cameraX * tangent;
        }
        for (const box of PROP_BOXES) {
            const relativeX = box.x - camera.x;
            const relativeY = box.y - camera.y;
            if (Math.hypot(relativeX, relativeY) > ATMOSPHERE.fogEnd + Math.max(box.width, box.depth)) continue;
            let left = Infinity;
            let right = -Infinity;
            let top = Infinity;
            let bottom = -Infinity;
            let crossesNear = false;
            let inFront = false;
            for (const sx of [-1, 1]) {
                for (const sy of [-1, 1]) {
                    const rx = relativeX + sx * box.width / 2;
                    const ry = relativeY + sy * box.depth / 2;
                    const depth = rx * fx + ry * fy;
                    if (depth <= NEAR) { crossesNear = true; continue; }
                    inFront = true;
                    const projectedX = width / 2 + (-rx * fy + ry * fx) * projectionX / depth;
                    left = Math.min(left, projectedX);
                    right = Math.max(right, projectedX);
                    const yTop = camera.horizonY - (box.z + box.height - camera.cameraHeight) * camera.projectionDistance / depth;
                    const yBottom = camera.horizonY - (box.z - camera.cameraHeight) * camera.projectionDistance / depth;
                    top = Math.min(top, yTop, yBottom);
                    bottom = Math.max(bottom, yTop, yBottom);
                }
            }
            if (!inFront) continue;
            if (crossesNear) { left = 0; right = width; top = 0; bottom = height; }
            const firstColumn = Math.max(0, Math.floor(left / RES));
            const lastColumn = Math.min(columns - 1, Math.floor(right / RES));
            const firstRow = Math.max(0, Math.floor(top / ROW_STEP));
            const lastRow = Math.min(rows - 1, Math.floor(bottom / ROW_STEP));
            for (let column = firstColumn; column <= lastColumn; column++) {
                const dx = this.directionsX[column]!;
                const dy = this.directionsY[column]!;
                const screenX = Math.min(width - 0.5, column * RES + RES / 2);
                for (let row = firstRow; row <= lastRow; row++) {
                    const screenY = Math.min(height - 0.5, row * ROW_STEP + ROW_STEP / 2);
                    const dz = (camera.horizonY - screenY) / camera.projectionDistance;
                    const hit = intersectPropBox(box, camera.x, camera.y, camera.cameraHeight, dx, dy, dz);
                    if (!hit) continue;
                    const index = row * columns + column;
                    if (hit.depth >= this.depths[index]!) continue;
                    if (!this.world.isWorldPointVisible(screenX, screenY, hit.depth)) continue;
                    this.depths[index] = hit.depth;
                    const colour = this.sample(box, hit, dx, dy, dz);
                    const offset = index * 4;
                    image.data[offset] = colour[0];
                    image.data[offset + 1] = colour[1];
                    image.data[offset + 2] = colour[2];
                    image.data[offset + 3] = 255;
                }
            }
        }
        const ctx = this.layer.getContext("2d");
        if (!ctx) throw new Error("Missing prop render context");
        ctx.putImageData(image, 0, 0);
    }

    public render(context: CanvasRenderingContext2D): void {
        context.save();
        context.imageSmoothingEnabled = false;
        context.globalAlpha = 1;
        context.globalCompositeOperation = "source-over";
        context.drawImage(this.layer, 0, 0, this.columns * RES, this.rows * ROW_STEP);
        context.restore();
    }

    private sample(box: PropBox, hit: Hit, dx: number, dy: number, dz: number): readonly [number, number, number] {
        const camera = this.camera;
        if (!camera) return [0, 0, 0];
        const x = (camera.x + dx * hit.depth) / TILESIZE;
        const y = (camera.y + dy * hit.depth) / TILESIZE;
        const z = (camera.cameraHeight + dz * hit.depth) / TILESIZE;
        const grain = noise(Math.floor(x * 70), Math.floor(y * 70 + z * 70), 217);
        let base: readonly [number, number, number];
        switch (box.material) {
            case "wood": {
                const along = hit.axis === 0 ? y : x;
                const across = hit.axis === 2 ? y : z;
                const line = Math.sin(across * 145 + Math.sin(along * 8) * 1.6);
                const shade = (grain - 0.5) * 10 + line * 6;
                base = [83 + shade, 62 + shade, 40 + shade];
                break;
            }
            case "fabric": {
                const localX = Math.abs((camera.x + dx * hit.depth - box.x) / TILESIZE);
                const localZ = (camera.cameraHeight + dz * hit.depth - box.z) / TILESIZE;
                const border = localX > 0.33 || localZ < 0.07 || localZ > 1.05;
                const emblem = localX + Math.abs(localZ - 0.58) * 0.55 < 0.1;
                base = border || emblem ? [132, 111, 65] : [76 + grain * 8, 37 + grain * 5, 34 + grain * 5];
                break;
            }
            case "brass": base = [136 + grain * 10, 113 + grain * 9, 64 + grain * 5]; break;
            case "book": base = hit.axis === 2 ? [66, 55, 44] : [132 + grain * 6, 124 + grain * 6, 100 + grain * 5]; break;
            default: base = [117 + grain * 13, 120 + grain * 13, 107 + grain * 11];
        }
        const light = hit.axis === 2 ? 1 : hit.axis === 0 ? 0.8 : 0.67;
        const css = shadeColour(base, hit.depth, light);
        let colour = this.colours.get(css);
        if (!colour) {
            const values = css.match(/\d+/g);
            colour = values ? [Number(values[0]), Number(values[1]), Number(values[2])] : [0, 0, 0];
            this.colours.set(css, colour);
        }
        return colour;
    }
}
