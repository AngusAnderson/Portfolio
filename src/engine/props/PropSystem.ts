import { FOV, RES, TILESIZE } from "../../settings";
import type { ProjectCamera, ProjectView } from "../projects/types";
import { noise, shadeColour, ATMOSPHERE, fogAmount } from "../raycaster/atmosphere";
import { PROP_BOXES, type PropBox } from "./definitions";

const ROW_STEP = 2;
const NEAR = 0.1;
type Hit = { depth: number; axis: number; };

export function intersectPropBox(
    box: PropBox, ox: number, oy: number, oz: number,
    dx: number, dy: number, dz: number,
    cosine: number = Math.cos(box.rotation ?? 0),
    sine: number = Math.sin(box.rotation ?? 0)
): Hit | null {
    const relativeX = ox - box.x;
    const relativeY = oy - box.y;
    const lx = relativeX * cosine + relativeY * sine;
    const ly = -relativeX * sine + relativeY * cosine;
    const ldx = dx * cosine + dy * sine;
    const ldy = -dx * sine + dy * cosine;
    let near = -Infinity;
    let far = Infinity;
    let nearAxis = 0;
    let farAxis = 0;
    for (let axis = 0; axis < 3; axis++) {
        const origin = axis === 0 ? lx : axis === 1 ? ly : oz;
        const direction = axis === 0 ? ldx : axis === 1 ? ldy : dz;
        const low = axis === 0 ? -box.width / 2 : axis === 1 ? -box.depth / 2 : box.z;
        const high = axis === 0 ? box.width / 2 : axis === 1 ? box.depth / 2 : box.z + box.height;
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

    public getWorldCamera(): ProjectCamera { return this.world.getWorldCamera(); }

    public isWorldPointVisible(x: number, y: number, depth: number): boolean {
        if (!this.world.isWorldPointVisible(x, y, depth)) return false;
        const column = Math.floor(x / RES);
        const row = Math.floor(y / ROW_STEP);
        if (column < 0 || column >= this.columns || row < 0 || row >= this.rows) return true;
        return depth < (this.depths[row * this.columns + column] ?? Infinity) - 0.01;
    }
    public invalidate(): void { this.previousPose = ""; }

    public prepare(width: number, height: number): void {
        const camera = this.world.getWorldCamera();
        const pose = [width, height, camera.x, camera.y, camera.cameraHeight,
            camera.rotationAngle, camera.horizonY, camera.projectionDistance].join(":");
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
            const rx = box.x - camera.x;
            const ry = box.y - camera.y;
            if (Math.hypot(rx, ry) > ATMOSPHERE.fogEnd + Math.max(box.width, box.depth)) continue;
            const cosine = Math.cos(box.rotation ?? 0);
            const sine = Math.sin(box.rotation ?? 0);
            let left = Infinity;
            let right = -Infinity;
            let top = Infinity;
            let bottom = -Infinity;
            let crossesNear = false;
            let inFront = false;
            for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
                const lx = sx * box.width / 2;
                const ly = sy * box.depth / 2;
                const vx = rx + lx * cosine - ly * sine;
                const vy = ry + lx * sine + ly * cosine;
                const depth = vx * fx + vy * fy;
                if (depth <= NEAR) { crossesNear = true; continue; }
                inFront = true;
                const px = width / 2 + (-vx * fy + vy * fx) * projectionX / depth;
                left = Math.min(left, px);
                right = Math.max(right, px);
                const yTop = camera.horizonY - (box.z + box.height - camera.cameraHeight) * camera.projectionDistance / depth;
                const yBottom = camera.horizonY - (box.z - camera.cameraHeight) * camera.projectionDistance / depth;
                top = Math.min(top, yTop, yBottom);
                bottom = Math.max(bottom, yTop, yBottom);
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
                    const hit = intersectPropBox(box, camera.x, camera.y, camera.cameraHeight, dx, dy, dz, cosine, sine);
                    if (!hit) continue;
                    const index = row * columns + column;
                    if (hit.depth >= this.depths[index]!) continue;
                    if (!this.world.isWorldPointVisible(screenX, screenY, hit.depth)) continue;
                    this.depths[index] = hit.depth;
                    const colour = this.sample(box, hit, dx, dy, dz, cosine, sine);
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

    private sample(box: PropBox, hit: Hit, dx: number, dy: number, dz: number, cosine: number, sine: number): readonly [number, number, number] {
        const camera = this.camera;
        if (!camera) return [0, 0, 0];
        const wx = camera.x + dx * hit.depth;
        const wy = camera.y + dy * hit.depth;
        const wz = camera.cameraHeight + dz * hit.depth;
        const x = ((wx - box.x) * cosine + (wy - box.y) * sine) / TILESIZE;
        const y = (-(wx - box.x) * sine + (wy - box.y) * cosine) / TILESIZE;
        const z = wz / TILESIZE;
        const grain = noise(Math.floor(wx / TILESIZE * 70), Math.floor(wy / TILESIZE * 70 + z * 70), 217);
        let base: readonly [number, number, number];
        switch (box.material) {
            case "door": {
                const plank = (x / (box.width / TILESIZE) + 0.5) * 7;
                const local = plank - Math.floor(plank);
                const joint = local < 0.025 || local > 0.975;
                const stripe = Math.sin(x * 195 + Math.sin(z * 5) * 0.9) * 5;
                base = joint ? [37, 28, 19] : [91 + stripe + grain * 6, 61 + stripe + grain * 5, 34 + stripe + grain * 4];
                break;
            }
            case "wood": {
                const along = hit.axis === 0 ? y : x;
                const across = hit.axis === 2 ? y : z;
                const variation = (grain - 0.5) * 10 + Math.sin(across * 145 + Math.sin(along * 8) * 1.6) * 6;
                base = [83 + variation, 62 + variation, 40 + variation];
                break;
            }
            case "fabric": {
                const localZ = (wz - box.z) / TILESIZE;
                const border = Math.abs(x) > 0.33 || localZ < 0.07 || localZ > 1.05;
                const emblem = Math.abs(x) + Math.abs(localZ - 0.58) * 0.55 < 0.1;
                base = border || emblem ? [132, 111, 65] : [76 + grain * 8, 37 + grain * 5, 34 + grain * 5];
                break;
            }
            case "brass": base = [136 + grain * 10, 113 + grain * 9, 64 + grain * 5]; break;
            case "iron": base = [57 + grain * 6, 55 + grain * 6, 47 + grain * 5]; break;
            case "candle": base = [192 + grain * 8, 170 + grain * 8, 119 + grain * 6]; break;
            case "flame": {
                const fog = fogAmount(hit.depth);
                return [255 * (1 - fog) + ATMOSPHERE.fog[0] * fog,
                    194 * (1 - fog) + ATMOSPHERE.fog[1] * fog,
                    82 * (1 - fog) + ATMOSPHERE.fog[2] * fog];
            }
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
