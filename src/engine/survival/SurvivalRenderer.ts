import { FOV, NUM_RAYS, RES, TILESIZE } from "../../settings";
import type { ProjectView } from "../projects/types";
import { ATMOSPHERE, fogAmount } from "../raycaster/atmosphere";
import { CHEST, WALL_BUYS, weaponById, type WeaponDefinition, type WallBuy } from "./data";
import type { Enemy } from "./model";

type Sprite = { x: number; y: number; bottom: number; width: number; height: number; texture: HTMLCanvasElement; };

export class SurvivalRenderer {
    private readonly enemies: HTMLCanvasElement[] = [];
    private readonly shaded = new Map<string, HTMLCanvasElement>();
    private readonly boards = new Map<string, HTMLCanvasElement>();
    private readonly chest: HTMLCanvasElement;
    constructor() {
        for (let frame = 0; frame < 4; frame++) this.enemies.push(this.makeEnemy(frame));
        this.chest = this.makeChest();
    }
    private canvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
        const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not create survival artwork");
        return [canvas, ctx];
    }
    private makeEnemy(frame: number): HTMLCanvasElement {
        const [canvas, ctx] = this.canvas(48, 80);
        const skin = frame === 2 ? "#b47762" : "#819365";
        const stride = frame === 1 ? 4 : -4;
        ctx.fillStyle = "#292f26";
        ctx.fillRect(12, 47, 10, 29 + stride);
        ctx.fillRect(27, 47, 9, 29 - stride);
        ctx.fillStyle = "#484332";
        ctx.fillRect(10, 23, 27, 30);
        ctx.fillStyle = "#665c41";
        ctx.fillRect(11, 25, 7, 21);
        ctx.fillStyle = skin;
        ctx.fillRect(15, 4, 19, 21);
        ctx.fillRect(frame === 3 ? 0 : 3, frame === 3 ? 21 : 29, 9, frame === 3 ? 9 : 26);
        ctx.fillRect(frame === 3 ? 38 : 37, frame === 3 ? 21 : 28, 8, frame === 3 ? 9 : 26);
        ctx.fillStyle = "#273326"; ctx.fillRect(15, 4, 19, 5);
        ctx.fillStyle = "#e8c976"; ctx.fillRect(18, 12, 3, 2); ctx.fillRect(28, 12, 3, 2);
        ctx.fillStyle = "#303428"; ctx.fillRect(21, 20, 8, 3);
        ctx.fillStyle = "#767458"; ctx.fillRect(19, 30, 4, 12);
        return canvas;
    }
    private makeChest(): HTMLCanvasElement {
        const [canvas, ctx] = this.canvas(112, 48);
        ctx.fillStyle = "#59452d"; ctx.fillRect(2, 9, 108, 37);
        ctx.fillStyle = "#887049"; ctx.fillRect(2, 5, 108, 12);
        ctx.fillStyle = "#302f25"; ctx.fillRect(14, 5, 7, 41); ctx.fillRect(91, 5, 7, 41);
        ctx.fillRect(2, 18, 108, 3);
        ctx.fillStyle = "#a8d1a5"; ctx.font = "bold 25px monospace"; ctx.textAlign = "center"; ctx.fillText("?", 56, 38);
        return canvas;
    }
    private tint(texture: HTMLCanvasElement, id: string, depth: number): HTMLCanvasElement {
        const bucket = Math.max(0, Math.min(15, Math.floor(depth / ATMOSPHERE.fogEnd * 16)));
        const key = `${id}:${bucket}`;
        const cached = this.shaded.get(key); if (cached) return cached;
        const [canvas, ctx] = this.canvas(texture.width, texture.height);
        ctx.drawImage(texture, 0, 0);
        const distance = (bucket + 0.5) / 16 * ATMOSPHERE.fogEnd;
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = `rgba(${ATMOSPHERE.fog.join(",")},${fogAmount(distance)})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        this.shaded.set(key, canvas); return canvas;
    }
    public world(context: CanvasRenderingContext2D, view: ProjectView, enemies: readonly Enemy[]): void {
        const camera = view.getWorldCamera();
        for (const buy of WALL_BUYS) this.wallBuy(context, view, buy);
        const sprites: Sprite[] = [{ x: CHEST.x, y: CHEST.y, bottom: 0, width: CHEST.width, height: CHEST.height, texture: this.chest }];
        for (const enemy of enemies) {
            const frame = enemy.hurt > 0 ? 2 : enemy.attackWindup > 0 ? 3 : Math.floor(enemy.walkPhase) % 2;
            const texture = this.enemies[frame]!;
            sprites.push({ x: enemy.x, y: enemy.y, bottom: 0, width: TILESIZE * (enemy.hp <= 0 ? 0.6 : 0.36),
                height: TILESIZE * (enemy.hp <= 0 ? 0.13 : 0.72), texture });
        }
        const fx = Math.cos(camera.rotationAngle), fy = Math.sin(camera.rotationAngle);
        sprites.sort((a, b) => (b.x - a.x) * fx + (b.y - a.y) * fy);
        const projectionX = context.canvas.width / (2 * Math.tan(FOV / 2));
        context.save(); context.imageSmoothingEnabled = false;
        for (const sprite of sprites) {
            const dx = sprite.x - camera.x, dy = sprite.y - camera.y;
            const depth = dx * fx + dy * fy;
            if (depth <= 0.1 || depth > ATMOSPHERE.fogEnd) continue;
            const centre = context.canvas.width / 2 + (-dx * fy + dy * fx) * projectionX / depth;
            const width = sprite.width * projectionX / depth;
            const left = centre - width / 2;
            const top = camera.horizonY - (sprite.bottom + sprite.height - camera.cameraHeight) * camera.projectionDistance / depth;
            const bottom = camera.horizonY - (sprite.bottom - camera.cameraHeight) * camera.projectionDistance / depth;
            const id = sprite.texture === this.chest ? "chest" : `enemy-${this.enemies.indexOf(sprite.texture)}`;
            const texture = this.tint(sprite.texture, id, depth);
            this.strips(context, view, texture, left, left + width, top, bottom, depth);
        }
        context.restore();
    }
    private strips(context: CanvasRenderingContext2D, view: ProjectView, texture: HTMLCanvasElement,
        left: number, right: number, top: number, bottom: number, depth: number): void {
        const first = Math.max(0, Math.floor(left / RES));
        const last = Math.min(NUM_RAYS - 1, Math.floor(right / RES));
        const firstY = Math.max(0, Math.ceil(top));
        const endY = Math.min(context.canvas.height, Math.floor(bottom));
        if (bottom <= top || right <= left) return;
        for (let column = first; column <= last; column++) {
            const x = Math.max(left, column * RES);
            const endX = Math.min(right, (column + 1) * RES, context.canvas.width);
            if (endX <= x) continue;
            const sampleX = (x + endX) / 2;
            const tx = Math.max(0, Math.min(texture.width - 1, Math.floor((sampleX - left) / (right - left) * texture.width)));
            let run = -1;
            const draw = (end: number): void => {
                if (run < 0 || end <= run) return;
                context.drawImage(texture, tx, (run - top) / (bottom - top) * texture.height,
                    1, (end - run) / (bottom - top) * texture.height, x, run, endX - x, end - run);
            };
            for (let y = firstY; y < endY; y += 2) {
                const visible = view.isWorldPointVisible(sampleX, y, depth);
                if (visible && run < 0) run = y;
                if (!visible && run >= 0) { draw(y); run = -1; }
            }
            draw(endY);
        }
    }
    private wallBuy(context: CanvasRenderingContext2D, view: ProjectView, buy: WallBuy): void {
        const weapon = weaponById(buy.weapon);
        let texture = this.boards.get(weapon.id);
        if (!texture) {
            const [canvas, ctx] = this.canvas(144, 72);
            ctx.fillStyle = "#18241d"; ctx.fillRect(0, 0, 144, 72);
            ctx.strokeStyle = "#879980"; ctx.strokeRect(2, 2, 140, 68);
            ctx.fillStyle = "#d2d4b3"; ctx.fillRect(31, 27, 72, 8); ctx.fillRect(50, 34, 12, 16); ctx.fillRect(101, 29, 18, 3);
            ctx.font = "10px monospace"; ctx.textAlign = "center"; ctx.fillText(weapon.name, 72, 16, 132); ctx.fillText(`${weapon.price} POINTS`, 72, 63);
            texture = canvas; this.boards.set(weapon.id, texture);
        }
        const camera = view.getWorldCamera();
        const nx = Math.cos(buy.angle), ny = Math.sin(buy.angle);
        const front = (camera.x - buy.x) * nx + (camera.y - buy.y) * ny;
        if (front <= 0) return;
        const fx = Math.cos(camera.rotationAngle), fy = Math.sin(camera.rotationAngle);
        const tangent = Math.tan(FOV / 2);
        for (let column = 0; column < NUM_RAYS; column++) {
            const cx = 2 * ((column + 0.5) / NUM_RAYS) - 1;
            const dx = fx - fy * cx * tangent, dy = fy + fx * cx * tangent;
            const denominator = dx * nx + dy * ny;
            if (denominator >= -0.000001) continue;
            const depth = -front / denominator;
            if (depth <= 0.1 || depth > ATMOSPHERE.fogEnd) continue;
            const side = (camera.x + dx * depth - buy.x) * -ny + (camera.y + dy * depth - buy.y) * nx;
            const u = 0.5 - side / TILESIZE;
            if (u < 0 || u >= 1) continue;
            const top = camera.horizonY - (TILESIZE * 1.05 - camera.cameraHeight) * camera.projectionDistance / depth;
            const bottom = camera.horizonY - (TILESIZE * 0.55 - camera.cameraHeight) * camera.projectionDistance / depth;
            const slice = this.tint(texture, `board-${weapon.id}`, depth);
            const tx = Math.min(slice.width - 1, Math.floor(u * slice.width));
            const firstY = Math.max(0, Math.ceil(top)), endY = Math.min(context.canvas.height, Math.floor(bottom));
            let run = -1;
            const draw = (end: number): void => {
                if (run < 0 || end <= run) return;
                context.drawImage(slice, tx, (run - top) / (bottom - top) * slice.height, 1,
                    (end - run) / (bottom - top) * slice.height, column * RES, run, RES, end - run);
            };
            for (let y = firstY; y < endY; y += 2) {
                const visible = view.isWorldPointVisible(column * RES + RES / 2, y, depth);
                if (visible && run < 0) run = y;
                if (!visible && run >= 0) { draw(y); run = -1; }
            }
            draw(endY);
        }
    }
    public overlay(context: CanvasRenderingContext2D, weapon: WeaponDefinition, flash: number, hit: number, damage: number, reloading: boolean): void {
        const width = context.canvas.width, height = context.canvas.height;
        context.save(); context.imageSmoothingEnabled = false;
        const scale = height * 0.27 / 80;
        context.translate(width * 0.57, height + (reloading ? height * 0.12 : flash * height));
        context.scale(scale, scale);
        context.fillStyle = "#272c28"; context.fillRect(-17, -57, 34, 57);
        context.fillStyle = weapon.colour; context.fillRect(-14, -78, 28, 41);
        context.fillStyle = "#171c18"; context.fillRect(-8, -83, 16, 20);
        context.fillStyle = "#b0aaa0"; context.fillRect(-3, -78, 6, 12);
        context.fillStyle = "#6a5542"; context.fillRect(-12, -31, 24, 31);
        if (flash > 0) {
            context.fillStyle = weapon.id === "arc" ? "#9dffe9" : "#ffe1a2";
            context.beginPath(); context.moveTo(0, -110); context.lineTo(9, -92); context.lineTo(21, -96);
            context.lineTo(11, -83); context.lineTo(0, -77); context.lineTo(-13, -86); context.lineTo(-20, -99); context.lineTo(-7, -94); context.closePath(); context.fill();
        }
        context.restore();
        context.save();
        context.fillStyle = hit > 0 ? "#dbf4ad" : "#e1e0ce";
        context.fillRect(width / 2 - 5, height / 2, 3, 1); context.fillRect(width / 2 + 3, height / 2, 3, 1);
        context.fillRect(width / 2, height / 2 - 5, 1, 3); context.fillRect(width / 2, height / 2 + 3, 1, 3);
        if (damage > 0) { context.strokeStyle = `rgba(155,38,27,${Math.min(0.8, damage * 2)})`; context.lineWidth = Math.max(8, width * 0.015); context.strokeRect(0, 0, width, height); }
        context.restore();
    }
}
