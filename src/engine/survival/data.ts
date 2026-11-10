import { TILESIZE } from "../../settings";

export type WeaponDefinition = {
    id: string; name: string; damage: number; interval: number;
    magazine: number; reserve: number; reload: number; range: number;
    spread: number; pellets: number; automatic: boolean;
    price: number; weight: number; colour: string;
};

export const WEAPONS: readonly WeaponDefinition[] = [
    { id: "pistol", name: "Caretaker Pistol", damage: 32, interval: 0.28, magazine: 12, reserve: 84, reload: 1.2, range: 20, spread: 0.008, pellets: 1, automatic: false, price: 0, weight: 0, colour: "#8b918b" },
    { id: "carbine", name: "Estate Carbine", damage: 48, interval: 0.24, magazine: 16, reserve: 128, reload: 1.5, range: 24, spread: 0.009, pellets: 1, automatic: false, price: 600, weight: 18.75, colour: "#a08b67" },
    { id: "shotgun", name: "Pump Shotgun", damage: 20, interval: 0.85, magazine: 6, reserve: 48, reload: 2.2, range: 11, spread: 0.085, pellets: 6, automatic: false, price: 900, weight: 18.75, colour: "#a67950" },
    { id: "smg", name: "Compact Automatic", damage: 22, interval: 0.095, magazine: 30, reserve: 210, reload: 1.65, range: 18, spread: 0.025, pellets: 1, automatic: true, price: 1200, weight: 18.75, colour: "#78887d" },
    { id: "rifle", name: "Service Rifle", damage: 65, interval: 0.17, magazine: 24, reserve: 144, reload: 1.9, range: 26, spread: 0.014, pellets: 1, automatic: true, price: 1600, weight: 18.75, colour: "#7c8999" },
    { id: "repeater", name: "Warden Repeater", damage: 145, interval: 0.5, magazine: 8, reserve: 56, reload: 1.8, range: 28, spread: 0.005, pellets: 1, automatic: false, price: 0, weight: 10, colour: "#c3a86d" },
    { id: "double", name: "Double Barrel", damage: 30, interval: 0.32, magazine: 2, reserve: 40, reload: 1.7, range: 10, spread: 0.095, pellets: 8, automatic: false, price: 0, weight: 10, colour: "#b49a83" },
    { id: "arc", name: "Arc Relic", damage: 240, interval: 0.4, magazine: 10, reserve: 70, reload: 1.9, range: 28, spread: 0.004, pellets: 1, automatic: true, price: 0, weight: 5, colour: "#8fffe0" },
];

export function weaponById(id: string): WeaponDefinition {
    const weapon = WEAPONS.find(value => value.id === id);
    if (!weapon) throw new Error(`Unknown weapon ${id}`);
    return weapon;
}

export function rollWeapon(random: () => number = Math.random): WeaponDefinition {
    const pool = WEAPONS.filter(weapon => weapon.weight > 0);
    const total = pool.reduce((sum, weapon) => sum + weapon.weight, 0);
    let value = Math.max(0, Math.min(0.999999999, random())) * total;
    for (const weapon of pool) {
        value -= weapon.weight;
        if (value < 0) return weapon;
    }
    return pool[pool.length - 1]!;
}

export type WallBuy = { id: string; weapon: string; x: number; y: number; angle: number; };
export const WALL_BUYS: readonly WallBuy[] = [
    { id: "front-carbine", weapon: "carbine", x: 10.5 * TILESIZE, y: 21.025 * TILESIZE, angle: Math.PI / 2 },
    { id: "front-shotgun", weapon: "shotgun", x: 21.5 * TILESIZE, y: 21.025 * TILESIZE, angle: Math.PI / 2 },
    { id: "east-smg", weapon: "smg", x: 26.025 * TILESIZE, y: 16 * TILESIZE, angle: 0 },
    { id: "east-rifle", weapon: "rifle", x: 26.025 * TILESIZE, y: 11.5 * TILESIZE, angle: 0 },
];
export const CHEST = { x: 28.35 * TILESIZE, y: 29.8 * TILESIZE, width: 1.1 * TILESIZE, depth: 0.5 * TILESIZE, height: 0.44 * TILESIZE, price: 950 };
export const SURVIVAL_SPAWN = { x: 15.5 * TILESIZE, y: 23 * TILESIZE, angle: -Math.PI / 2 };
export const ENEMY_RADIUS = TILESIZE * 0.115;
export const ENEMY_HEIGHT = TILESIZE * 0.72;
