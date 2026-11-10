import { FOV, RES, TILESIZE } from "../../settings";
import type { GameMap } from "../map";
import type { ProjectView } from "../projects/types";
import { ATMOSPHERE, fogAmount, noise } from "../raycaster/atmosphere";
import { eastEdge, westEdge, southEdge, ESTATE_COLUMNS } from "../map/levels/estate";

type Prop = {
    x: number;
    y: number;
    bottom: number;
    width: number;
    height: number;
    variant: number;
};

export class ScenerySystem {
    private readonly props: Prop[] = [];
    private readonly originals: HTMLCanvasElement[] = [];
    private readonly shaded = new Map<string, HTMLCanvasElement>();

    constructor(map: GameMap) {
        for (let variant = 0; variant < 4; variant++) {
            this.originals.push(this.createTree(variant));
        }
        const addTree = (column: number, row: number, seed: number): void => {
            const value = map.grid[row]?.[column] ?? 0;
            if (value <= 0) return;
            const size = 0.85 + noise(column, row, 131) * 0.35;
            this.props.push({
                x: (column + 0.5) * TILESIZE,
                y: (row + 0.5) * TILESIZE,
                bottom: value * TILESIZE - TILESIZE * 0.08,
                width: TILESIZE * 2.7 * size,
                height: TILESIZE * 4.4 * size,
                variant: seed % 4,
            });
        };
        for (let row = 23; row <= 41; row += 3) {
            addTree(westEdge(row), row, row);
            addTree(westEdge(row) - 1, row + 1, row + 1);
        }
        for (let row = 4; row <= 40; row += 3) {
            addTree(eastEdge(row), row, row + 2);
            addTree(eastEdge(row) + 1, row + 1, row + 3);
        }
        for (let column = 5; column < ESTATE_COLUMNS - 13; column += 3) {
            addTree(column, southEdge(column), column + 1);
        }
    }

    public render(context: CanvasRenderingContext2D, view: ProjectView): void {
        const camera = view.getWorldCamera();
        const forwardX = Math.cos(camera.rotationAngle);
        const forwardY = Math.sin(camera.rotationAngle);
        const width = context.canvas.width;
        const height = context.canvas.height;
        const projectionX = width / (2 * Math.tan(FOV / 2));
        const visible = this.props.map(prop => {
            const dx = prop.x - camera.x;
            const dy = prop.y - camera.y;
            return { prop, depth: dx * forwardX + dy * forwardY, side: -dx * forwardY + dy * forwardX };
        }).filter(item => item.depth > TILESIZE * 0.15 && item.depth < ATMOSPHERE.fogEnd)
            .sort((a, b) => b.depth - a.depth);
        context.save();
        context.imageSmoothingEnabled = false;
        context.globalAlpha = 1;
        context.globalCompositeOperation = "source-over";
        for (const { prop, depth, side } of visible) {
            const projectedWidth = prop.width * projectionX / depth;
            const centre = width / 2 + side * projectionX / depth;
            const left = centre - projectedWidth / 2;
            const right = centre + projectedWidth / 2;
            if (right <= 0 || left >= width) continue;
            const top = camera.horizonY - (prop.bottom + prop.height - camera.cameraHeight) * camera.projectionDistance / depth;
            const bottom = camera.horizonY - (prop.bottom - camera.cameraHeight) * camera.projectionDistance / depth;
            if (bottom <= 0 || top >= height || bottom <= top) continue;
            const texture = this.getTexture(prop.variant, depth);
            const startColumn = Math.max(0, Math.floor(left / RES));
            const endColumn = Math.min(Math.ceil(width / RES) - 1, Math.floor(right / RES));
            const firstY = Math.max(0, Math.ceil(top));
            const endY = Math.min(height, Math.floor(bottom));
            for (let column = startColumn; column <= endColumn; column++) {
                const x = Math.max(left, column * RES);
                const endX = Math.min(right, (column + 1) * RES, width);
                if (endX <= x) continue;
                const sampleX = (x + endX) / 2;
                const u = (sampleX - left) / projectedWidth;
                const tx = Math.max(0, Math.min(texture.width - 1, Math.floor(u * texture.width)));
                let run = -1;
                const draw = (end: number): void => {
                    if (run < 0 || end <= run) return;
                    context.drawImage(texture, tx, (run - top) / (bottom - top) * texture.height,
                        1, (end - run) / (bottom - top) * texture.height,
                        x, run, endX - x, end - run);
                };
                for (let y = firstY; y < endY; y += 2) {
                    const visible = view.isWorldPointVisible(sampleX, y, depth);
                    if (visible && run < 0) run = y;
                    if (!visible && run >= 0) { draw(y); run = -1; }
                }
                draw(endY);
            }
        }
        context.restore();
    }

    private getTexture(variant: number, depth: number): HTMLCanvasElement {
        const bucket = Math.min(15, Math.floor(depth / ATMOSPHERE.fogEnd * 16));
        const key = `${variant}:${bucket}`;
        const cached = this.shaded.get(key);
        if (cached) return cached;
        const original = this.originals[variant];
        if (!original) throw new Error("Missing scenery texture");
        const texture = document.createElement("canvas");
        texture.width = original.width;
        texture.height = original.height;
        const ctx = texture.getContext("2d");
        if (!ctx) throw new Error("Could not shade scenery");
        ctx.drawImage(original, 0, 0);
        const distance = (bucket + 0.5) / 16 * ATMOSPHERE.fogEnd;
        const brightness = ATMOSPHERE.ambient * (0.65 + 0.35 / (1 + distance / (TILESIZE * 8)));
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = `rgba(0,0,0,${1 - brightness})`;
        ctx.fillRect(0, 0, texture.width, texture.height);
        ctx.fillStyle = `rgba(${ATMOSPHERE.fog.join(",")},${fogAmount(distance)})`;
        ctx.fillRect(0, 0, texture.width, texture.height);
        this.shaded.set(key, texture);
        return texture;
    }

    private createTree(variant: number): HTMLCanvasElement {
        const canvas = document.createElement("canvas");
        canvas.width = 96;
        canvas.height = 160;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not create tree artwork");
        ctx.fillStyle = "#3c352a";
        ctx.fillRect(44, 62, 8, 98);
        ctx.fillStyle = "#5a5040";
        ctx.fillRect(48, 75, 2, 85);
        if (variant % 2 === 0) {
            for (let layer = 0; layer < 9; layer++) {
                const y = 8 + layer * 13;
                const half = 6 + layer * 4;
                ctx.fillStyle = layer % 2 === 0 ? "#293c2b" : "#344b32";
                ctx.beginPath();
                ctx.moveTo(48, y - 7);
                ctx.lineTo(48 + half, y + 31);
                ctx.lineTo(48 - half, y + 31);
                ctx.closePath();
                ctx.fill();
            }
        } else {
            for (let i = 0; i < 52; i++) {
                const angle = noise(i, variant, 151) * Math.PI * 2;
                const radius = Math.sqrt(noise(i, variant, 157));
                const x = 48 + Math.cos(angle) * radius * 32;
                const y = 61 + Math.sin(angle) * radius * 40;
                ctx.fillStyle = i % 3 === 0 ? "#405336" : i % 3 === 1 ? "#2b402c" : "#344b30";
                ctx.beginPath();
                ctx.ellipse(x, y, 10 + noise(i, 0, 163) * 7, 12, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        const pixels = ctx.getImageData(0, 0, 96, 160);
        for (let y = 0; y < 160; y++) {
            for (let x = 0; x < 96; x++) {
                const i = (y * 96 + x) * 4;
                if (!pixels.data[i + 3]) continue;
                const shift = (noise(x, y, variant + 173) - 0.5) * 12;
                pixels.data[i] = (pixels.data[i] ?? 0) + shift;
                pixels.data[i + 1] = (pixels.data[i + 1] ?? 0) + shift;
                pixels.data[i + 2] = (pixels.data[i + 2] ?? 0) + shift;
            }
        }
        ctx.putImageData(pixels, 0, 0);
        return canvas;
    }
}
