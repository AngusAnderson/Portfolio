import { weaponById, type WeaponDefinition } from "./data";

export type WeaponState = { id: string; magazine: number; reserve: number; };

export class Inventory {
    public slots: WeaponState[] = [];
    public selected = 0;
    public cooldown = 0;
    public reloadRemaining = 0;
    public reset(): void {
        this.slots = [];
        this.selected = 0;
        this.cooldown = 0;
        this.reloadRemaining = 0;
        this.give("pistol");
    }
    public get current(): WeaponState { return this.slots[this.selected]!; }
    public get definition(): WeaponDefinition { return weaponById(this.current.id); }
    public owns(id: string): boolean { return this.slots.some(slot => slot.id === id); }
    public give(id: string): void {
        const definition = weaponById(id);
        const owned = this.slots.findIndex(slot => slot.id === id);
        const slot = { id, magazine: definition.magazine, reserve: definition.reserve };
        if (owned >= 0) { this.slots[owned] = slot; this.selected = owned; }
        else if (this.slots.length < 2) { this.slots.push(slot); this.selected = this.slots.length - 1; }
        else this.slots[this.selected] = slot;
        this.reloadRemaining = 0;
        this.cooldown = Math.max(this.cooldown, 0.2);
    }
    public select(index: number): void {
        if (index < 0 || index >= this.slots.length || index === this.selected) return;
        this.selected = index;
        this.reloadRemaining = 0;
        this.cooldown = Math.max(this.cooldown, 0.15);
    }
    public reload(): void {
        if (this.reloadRemaining > 0 || this.current.reserve <= 0 || this.current.magazine >= this.definition.magazine) return;
        this.reloadRemaining = this.definition.reload;
    }
    public tick(dt: number): void {
        this.cooldown = Math.max(0, this.cooldown - dt);
        if (this.reloadRemaining <= 0) return;
        this.reloadRemaining = Math.max(0, this.reloadRemaining - dt);
        if (this.reloadRemaining === 0) {
            const count = Math.min(this.definition.magazine - this.current.magazine, this.current.reserve);
            this.current.magazine += count;
            this.current.reserve -= count;
        }
    }
    public takeShot(): boolean {
        if (this.reloadRemaining > 0 || this.cooldown > 0) return false;
        if (this.current.magazine <= 0) { this.reload(); return false; }
        this.current.magazine--;
        this.cooldown = this.definition.interval;
        return true;
    }
    public refill(id: string): boolean {
        const slot = this.slots.find(value => value.id === id);
        if (!slot) return false;
        const definition = weaponById(id);
        if (slot.reserve >= definition.reserve) return false;
        slot.reserve = definition.reserve;
        return true;
    }
}
