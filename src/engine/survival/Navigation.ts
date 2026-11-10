import { TILESIZE } from "../../settings";
import type { GameMap } from "../map";
import { groundClear } from "./world";
import { ENEMY_RADIUS } from "./data";

export class Navigation {
    public readonly cell = TILESIZE * 0.2;
    public readonly columns: number;
    public readonly rows: number;
    public readonly walkable: Uint8Array;
    public readonly distance: Int32Array;
    private readonly queue: Int32Array;
    private target = -1;

    constructor(private readonly map: GameMap) {
        this.columns = Math.ceil((map.grid[0]?.length ?? 0) * TILESIZE / this.cell);
        this.rows = Math.ceil(map.grid.length * TILESIZE / this.cell);
        this.walkable = new Uint8Array(this.columns * this.rows);
        this.distance = new Int32Array(this.walkable.length);
        this.queue = new Int32Array(this.walkable.length);
        this.distance.fill(-1);
        for (let row = 0; row < this.rows; row++) for (let column = 0; column < this.columns; column++) {
            const x = (column + 0.5) * this.cell;
            const y = (row + 0.5) * this.cell;
            if (groundClear(map, x, y, ENEMY_RADIUS)) this.walkable[row * this.columns + column] = 1;
        }
    }
    public index(x: number, y: number): number {
        const column = Math.floor(x / this.cell);
        const row = Math.floor(y / this.cell);
        if (column < 0 || column >= this.columns || row < 0 || row >= this.rows) return -1;
        return row * this.columns + column;
    }
    public point(index: number): readonly [number, number] {
        return [(index % this.columns + 0.5) * this.cell, (Math.floor(index / this.columns) + 0.5) * this.cell];
    }
    public rebuild(x: number, y: number, force: boolean = false): void {
        let target = this.index(x, y);
        if (target < 0 || !this.walkable[target]) {
            let nearest = Infinity;
            target = -1;
            for (let i = 0; i < this.walkable.length; i++) {
                if (!this.walkable[i]) continue;
                const [px, py] = this.point(i);
                const d = (px - x) ** 2 + (py - y) ** 2;
                if (d < nearest) { nearest = d; target = i; }
            }
        }
        if (target < 0 || (!force && target === this.target)) return;
        this.target = target;
        this.distance.fill(-1);
        let head = 0;
        let tail = 0;
        this.queue[tail++] = target;
        this.distance[target] = 0;
        while (head < tail) {
            const i = this.queue[head++]!;
            for (const next of this.neighbours(i)) {
                if (!this.walkable[next] || this.distance[next]! >= 0) continue;
                this.distance[next] = this.distance[i]! + 1;
                this.queue[tail++] = next;
            }
        }
    }
    public neighbours(index: number): number[] {
        const result: number[] = [];
        const column = index % this.columns;
        const row = Math.floor(index / this.columns);
        if (column > 0) result.push(index - 1);
        if (column < this.columns - 1) result.push(index + 1);
        if (row > 0) result.push(index - this.columns);
        if (row < this.rows - 1) result.push(index + this.columns);
        return result;
    }
    public steer(x: number, y: number): readonly [number, number] {
        const i = this.index(x, y);
        if (i < 0 || this.distance[i]! < 0) return [x, y];
        let best = i;
        for (const next of this.neighbours(i)) {
            if (this.distance[next]! >= 0 && this.distance[next]! < this.distance[best]!) best = next;
        }
        return this.point(best);
    }
    public reachable(x: number, y: number): boolean {
        const i = this.index(x, y);
        return i >= 0 && this.distance[i]! >= 0;
    }
    public clear(x: number, y: number, radius: number = ENEMY_RADIUS): boolean {
        return groundClear(this.map, x, y, radius);
    }
}
