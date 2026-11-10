import { FOV, TILESIZE } from "../../settings";
import type { Player } from "../player";
import type { GameMap } from "../map";
import type { ProjectView } from "../projects/types";
import { Inventory } from "./Inventory";
import { Navigation } from "./Navigation";
import { SurvivalRenderer } from "./SurvivalRenderer";
import { SurvivalUI } from "../../ui/survival/SurvivalUI";
import { CHEST, ENEMY_RADIUS, ENEMY_HEIGHT, WALL_BUYS, WEAPONS, SURVIVAL_SPAWN, weaponById, rollWeapon, type WallBuy, type WeaponDefinition } from "./data";
import { boxDistance, clearLine, traceWorld } from "./world";
import type { Enemy } from "./model";

type Options = {
    canvas: HTMLCanvasElement; player: Player; map: GameMap; view: ProjectView;
    isPlaying: () => boolean; onDefeat: () => void; onRestart: () => void; onExit: () => void;
};
type Target = { kind: "wall"; buy: WallBuy; } | { kind: "chest"; };

export class SurvivalSystem {
    public active = false;
    public defeated = false;
    private readonly inventory = new Inventory();
    private readonly renderer = new SurvivalRenderer();
    private readonly ui: SurvivalUI;
    private navigation: Navigation | null = null;
    private enemies: Enemy[] = [];
    private nextEnemyId = 1;
    private health = 100;
    private points = 500;
    private earned = 0;
    private kills = 0;
    private round = 0;
    private stage: "preparation" | "combat" = "preparation";
    private preparation = 5;
    private pending = 0;
    private spawnTimer = 0;
    private flowTimer = 0;
    private clock = 0;
    private lastDamage = -100;
    private grace = 0;
    private flash = 0;
    private hit = 0;
    private damageFlash = 0;
    private held = false;
    private queued = false;
    private message = "";
    private messageTime = 0;
    private boxState: "idle" | "rolling" | "offer" = "idle";
    private boxTimer = 0;
    private offer: WeaponDefinition | null = null;

    constructor(private readonly options: Options) {
        this.ui = new SurvivalUI(options.onRestart, options.onExit);
        this.bindInput();
    }
    public start(): void {
        this.ui.hide();
        this.active = true; this.defeated = false;
        this.health = 100; this.points = 500; this.earned = 0; this.kills = 0;
        this.round = 0; this.stage = "preparation"; this.preparation = 5;
        this.pending = 0; this.spawnTimer = 0; this.flowTimer = 0;
        this.clock = 0; this.lastDamage = -100; this.grace = 0;
        this.flash = 0; this.hit = 0; this.damageFlash = 0;
        this.held = false; this.queued = false; this.enemies = []; this.nextEnemyId = 1;
        this.boxState = "idle"; this.boxTimer = 0; this.offer = null;
        this.inventory.reset();
        const player = this.options.player;
        player.x = SURVIVAL_SPAWN.x; player.y = SURVIVAL_SPAWN.y;
        player.elevation = 0; player.jumpHeight = 0; player.grounded = true;
        player.pitch = 0; player.rotationAngle = SURVIVAL_SPAWN.angle;
        this.navigation ??= new Navigation(this.options.map);
        if (!this.navigation.clear(player.x, player.y, player.radius)) {
            this.active = false;
            throw new Error("Survival spawn is blocked. Check the survival placement data against the current level.");
        }
        this.navigation.rebuild(player.x, player.y, true);
        document.body.dataset.experienceMode = "survival";
        this.say("SURVIVAL: Courtyard and ground-level approach. Gallery and elevated routes are sealed.", 6);
        this.ui.show();
    }
    public stop(): void {
        this.active = false; this.defeated = false; this.enemies = [];
        this.held = false; this.queued = false; this.offer = null;
        this.ui.hide(); document.body.dataset.experienceMode = "portfolio";
    }
    public constrainPlayer(previous: { x: number; y: number; elevation: number; grounded: boolean; jumpHeight: number }): void {
        if (!this.active || !this.navigation) return;
        const player = this.options.player;
        const enemyBlocked = this.enemies.some(enemy => enemy.hp > 0 &&
            Math.hypot(player.x - enemy.x, player.y - enemy.y) < player.radius + ENEMY_RADIUS &&
            Math.hypot(player.x - enemy.x, player.y - enemy.y) < Math.hypot(previous.x - enemy.x, previous.y - enemy.y));
        if (enemyBlocked || !this.navigation.clear(player.x, player.y, player.radius) || !this.navigation.reachable(player.x, player.y)) {
            player.x = previous.x; player.y = previous.y; player.elevation = previous.elevation;
            player.grounded = previous.grounded; player.jumpHeight = previous.jumpHeight;
            this.say("ARENA BOUNDARY / OBSTACLE — use the courtyard and ground-level approach.", 1.2);
        }
    }
    private playable(): boolean {
        return this.active && !this.defeated && this.options.isPlaying() && !document.hidden && document.hasFocus() && !document.querySelector("dialog[open]");
    }
    private say(text: string, duration: number = 2): void { this.message = text; this.messageTime = duration; }
    public update(dt: number): void {
        if (!this.active) return;
        if (!this.playable()) { this.held = false; this.queued = false; this.refreshHUD(true); return; }
        this.clock += dt;
        this.inventory.tick(dt);
        this.flash = Math.max(0, this.flash - dt);
        this.hit = Math.max(0, this.hit - dt);
        this.damageFlash = Math.max(0, this.damageFlash - dt);
        this.grace = Math.max(0, this.grace - dt);
        this.messageTime = Math.max(0, this.messageTime - dt);
        if (this.clock - this.lastDamage > 5) this.health = Math.min(100, this.health + dt * 6);
        this.flowTimer -= dt;
        if (this.flowTimer <= 0) {
            this.navigation!.rebuild(this.options.player.x, this.options.player.y);
            this.flowTimer = 0.3;
        }
        if (this.boxState !== "idle") {
            this.boxTimer = Math.max(0, this.boxTimer - dt);
            if (this.boxTimer === 0) {
                if (this.boxState === "rolling") {
                    this.boxState = "offer"; this.boxTimer = 12;
                    this.say(`CHEST OFFERS: ${this.offer!.name} — return and press E to accept.`, 5);
                } else { this.boxState = "idle"; this.offer = null; this.say("The chest offer expired."); }
            }
        }
        const requested = this.queued || (this.held && this.inventory.definition.automatic);
        this.queued = false;
        if (requested && this.inventory.takeShot()) this.shoot();
        if (this.stage === "preparation") {
            this.preparation = Math.max(0, this.preparation - dt);
            if (this.preparation === 0) {
                this.round++; this.pending = Math.min(60, 5 + (this.round - 1) * 2);
                this.stage = "combat"; this.spawnTimer = 0.2;
                this.say(`ROUND ${this.round}`, 2.5);
            }
        } else {
            this.spawnTimer -= dt;
            const alive = this.enemies.filter(enemy => enemy.hp > 0).length;
            if (this.pending > 0 && alive < 10 && this.spawnTimer <= 0) {
                if (this.spawn()) this.pending--;
                this.spawnTimer = Math.max(0.45, 1.1 - this.round * 0.035);
            }
        }
        this.updateEnemies(dt);
        this.enemies = this.enemies.filter(enemy => enemy.hp > 0 || enemy.deadTime < 0.8);
        if (!this.defeated && this.stage === "combat" && this.pending === 0 && !this.enemies.some(enemy => enemy.hp > 0)) {
            this.stage = "preparation"; this.preparation = 8;
            this.say(`ROUND ${this.round} COMPLETE — resupply.`, 4);
        }
        this.refreshHUD(false);
    }
    private spawn(): boolean {
        const navigation = this.navigation!;
        const player = this.options.player;
        let fallback = -1;
        let farthest = 0;
        for (let attempt = 0; attempt < 160; attempt++) {
            const index = Math.floor(Math.random() * navigation.distance.length);
            if (navigation.distance[index]! < 22) continue;
            const [x, y] = navigation.point(index);
            const distance = Math.hypot(x - player.x, y - player.y);
            if (distance < TILESIZE * 4 || this.enemies.some(enemy => enemy.hp > 0 && Math.hypot(enemy.x - x, enemy.y - y) < TILESIZE * 0.6)) continue;
            if (distance > farthest) { farthest = distance; fallback = index; }
            const angle = Math.atan2(y - player.y, x - player.x);
            const difference = Math.atan2(Math.sin(angle - player.rotationAngle), Math.cos(angle - player.rotationAngle));
            if (Math.abs(difference) > FOV / 2 + 0.2 || !clearLine(this.options.map, player.x, player.y, TILESIZE * 0.5, x, y, TILESIZE * 0.4)) {
                fallback = index; break;
            }
        }
        if (fallback < 0) {
            for (let i = 0; i < navigation.distance.length; i++) {
                if (navigation.distance[i]! < 22) continue;
                const [x, y] = navigation.point(i);
                const distance = Math.hypot(x - player.x, y - player.y);
                if (distance > farthest && !this.enemies.some(enemy => enemy.hp > 0 && Math.hypot(enemy.x - x, enemy.y - y) < TILESIZE * 0.6)) { fallback = i; farthest = distance; }
            }
        }
        if (fallback < 0) return false;
        const [x, y] = navigation.point(fallback);
        const health = Math.round(80 * Math.pow(1.14, Math.min(40, this.round - 1)));
        this.enemies.push({ id: this.nextEnemyId++, x, y, hp: health, maximum: health,
            attackWindup: 0, attackCooldown: 0.4, hurt: 0, deadTime: 0, walkPhase: Math.random() * 2,
            stuckTime: 0, lastX: x, lastY: y });
        return true;
    }
    private updateEnemies(dt: number): void {
        const player = this.options.player;
        const navigation = this.navigation!;
        for (const enemy of this.enemies) {
            if (enemy.hp <= 0) { enemy.deadTime += dt; continue; }
            enemy.hurt = Math.max(0, enemy.hurt - dt);
            enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
            const distance = Math.hypot(player.x - enemy.x, player.y - enemy.y);
            const canAttack = (): boolean => Math.hypot(player.x - enemy.x, player.y - enemy.y) < TILESIZE * 0.65 &&
                player.elevation < TILESIZE * 0.4 && clearLine(this.options.map, enemy.x, enemy.y, TILESIZE * 0.38,
                    player.x, player.y, player.elevation + TILESIZE * 0.38);
            if (enemy.attackWindup > 0) {
                enemy.attackWindup = Math.max(0, enemy.attackWindup - dt);
                if (enemy.attackWindup === 0) {
                    if (canAttack() && this.grace <= 0) {
                        this.health = Math.max(0, this.health - 20); this.lastDamage = this.clock;
                        this.grace = 0.55; this.damageFlash = 0.45;
                        if (this.health === 0) { this.defeat(); return; }
                    }
                    enemy.attackCooldown = 1;
                }
                continue;
            }
            if (distance < TILESIZE * 0.65 && enemy.attackCooldown === 0 && canAttack()) { enemy.attackWindup = 0.38; continue; }
            let [tx, ty] = navigation.steer(enemy.x, enemy.y);
            if (distance < TILESIZE * 5 && clearLine(this.options.map, enemy.x, enemy.y, TILESIZE * 0.38,
                player.x, player.y, TILESIZE * 0.38) && navigation.clear((enemy.x + player.x) / 2, (enemy.y + player.y) / 2)) {
                tx = player.x; ty = player.y;
            }
            let dx = tx - enemy.x, dy = ty - enemy.y;
            const length = Math.hypot(dx, dy);
            if (length > 0.01) { dx /= length; dy /= length; }
            for (const other of this.enemies) {
                if (other === enemy || other.hp <= 0) continue;
                const ox = enemy.x - other.x, oy = enemy.y - other.y;
                const separation = Math.hypot(ox, oy);
                if (separation > 0.01 && separation < ENEMY_RADIUS * 2.4) {
                    dx += ox / separation * 0.35; dy += oy / separation * 0.35;
                }
            }
            const normal = Math.hypot(dx, dy);
            const step = Math.min(length, TILESIZE * Math.min(2.1, 0.8 + this.round * 0.045) * dt);
            if (normal > 0.01) {
                const nx = enemy.x + dx / normal * step;
                const ny = enemy.y + dy / normal * step;
                const clear = (x: number, y: number): boolean => navigation.clear(x, y) &&
                    Math.hypot(x - player.x, y - player.y) >= ENEMY_RADIUS + player.radius + 0.5;
                if (clear(nx, enemy.y)) enemy.x = nx;
                if (clear(enemy.x, ny)) enemy.y = ny;
            }
            enemy.walkPhase += dt * 5;
            const moved = Math.hypot(enemy.x - enemy.lastX, enemy.y - enemy.lastY);
            enemy.stuckTime = moved < TILESIZE * 0.015 && distance > TILESIZE ? enemy.stuckTime + dt : 0;
            if (moved >= TILESIZE * 0.015) { enemy.lastX = enemy.x; enemy.lastY = enemy.y; }
            if (enemy.stuckTime > 14) {
                enemy.hp = 0; enemy.deadTime = 1; this.pending++;
                this.say("A straggler was rerouted.", 1);
            }
        }
    }
    private shoot(): void {
        const player = this.options.player;
        const weapon = this.inventory.definition;
        this.flash = 0.075;
        let damaged = false;
        for (let pellet = 0; pellet < weapon.pellets; pellet++) {
            const angle = player.rotationAngle + (Math.random() - 0.5) * weapon.spread * 2;
            const ray = { x: player.x, y: player.y, z: player.elevation + TILESIZE / 2,
                dx: Math.cos(angle), dy: Math.sin(angle), dz: Math.tan(player.pitch) + (Math.random() - 0.5) * weapon.spread };
            let nearest = traceWorld(this.options.map, ray, weapon.range * TILESIZE);
            let target: Enemy | null = null;
            for (const enemy of this.enemies) {
                if (enemy.hp <= 0) continue;
                const distance = boxDistance(ray, enemy.x - ENEMY_RADIUS, enemy.y - ENEMY_RADIUS, 0,
                    enemy.x + ENEMY_RADIUS, enemy.y + ENEMY_RADIUS, ENEMY_HEIGHT);
                if (distance < nearest) { nearest = distance; target = enemy; }
            }
            if (!target) continue;
            damaged = true; target.hurt = 0.14; this.hit = 0.13;
            const head = ray.z + ray.dz * nearest > ENEMY_HEIGHT * 0.78;
            target.hp = Math.max(0, target.hp - weapon.damage * (head ? 1.5 : 1));
            if (target.hp === 0) { this.kills++; this.award(100); target.deadTime = 0; }
        }
        if (damaged) this.award(10);
    }
    private award(points: number): void { this.points += points; this.earned += points; }
    private defeat(): void {
        this.defeated = true; this.held = false; this.queued = false;
        this.options.onDefeat(); this.ui.defeat(this.round, this.kills, this.earned);
    }
    private findTarget(): Target | null {
        const player = this.options.player;
        let nearest = TILESIZE * 2;
        let target: Target | null = null;
        const consider = (x: number, y: number, z: number, candidate: Target): void => {
            const dx = x - player.x, dy = y - player.y;
            const distance = Math.hypot(dx, dy);
            if (distance >= nearest || distance < 0.01) return;
            const facing = (dx * Math.cos(player.rotationAngle) + dy * Math.sin(player.rotationAngle)) / distance;
            if (facing < 0.7 || !clearLine(this.options.map, player.x, player.y, player.elevation + TILESIZE / 2, x, y, z, false)) return;
            nearest = distance; target = candidate;
        };
        for (const buy of WALL_BUYS) {
            const front = (player.x - buy.x) * Math.cos(buy.angle) + (player.y - buy.y) * Math.sin(buy.angle);
            if (front > 0) consider(buy.x, buy.y, TILESIZE * 0.8, { kind: "wall", buy });
        }
        consider(CHEST.x, CHEST.y, CHEST.height * 0.7, { kind: "chest" });
        return target;
    }
    private interact(): void {
        const target = this.findTarget(); if (!target) return;
        if (target.kind === "wall") {
            const weapon = weaponById(target.buy.weapon);
            const owned = this.inventory.owns(weapon.id);
            const price = owned ? Math.ceil(weapon.price * 0.4) : weapon.price;
            if (this.points < price) { this.say("Not enough points."); return; }
            if (owned) {
                if (!this.inventory.refill(weapon.id)) { this.say("Reserve ammunition is already full."); return; }
            } else this.inventory.give(weapon.id);
            this.points -= price; this.say(owned ? "Ammunition replenished." : `${weapon.name} equipped.`);
            return;
        }
        if (this.boxState === "rolling") return;
        if (this.boxState === "offer" && this.offer) {
            const weapon = this.offer; this.inventory.give(weapon.id);
            this.offer = null; this.boxState = "idle"; this.boxTimer = 0;
            this.say(`${weapon.name} accepted.`); return;
        }
        if (this.points < CHEST.price) { this.say("Not enough points."); return; }
        this.points -= CHEST.price;
        this.offer = rollWeapon(); this.boxState = "rolling"; this.boxTimer = 2.5;
        this.say("The relic chest is choosing...", 2.5);
    }
    private prompt(): string {
        const target = this.findTarget(); if (!target) return "";
        if (target.kind === "wall") {
            const weapon = weaponById(target.buy.weapon);
            const owned = this.inventory.owns(weapon.id);
            return owned ? `${weapon.name}
E — AMMUNITION ${Math.ceil(weapon.price * 0.4)} POINTS`
                : `${weapon.name}
E — BUY ${weapon.price} POINTS${this.inventory.slots.length === 2 ? " / REPLACES EQUIPPED WEAPON" : ""}`;
        }
        if (this.boxState === "rolling") {
            const pool = WEAPONS.filter(weapon => weapon.weight > 0);
            return `CHEST ROLLING... ${pool[Math.floor(this.clock * 12) % pool.length]!.name}`;
        }
        if (this.boxState === "offer" && this.offer) return `${this.offer.name}
E — ACCEPT / ${Math.ceil(this.boxTimer)}s${this.inventory.slots.length === 2 ? " / REPLACES EQUIPPED WEAPON" : ""}`;
        return `RELIC CHEST
E — ROLL ${CHEST.price} POINTS`;
    }
    private refreshHUD(paused: boolean): void {
        const weapon = this.inventory.definition;
        this.ui.update(this.options.canvas, {
            health: this.health, points: this.points, round: this.round,
            enemies: this.pending + this.enemies.filter(enemy => enemy.hp > 0).length,
            stage: this.defeated ? "RUN ENDED" : paused ? "PAUSED" : this.stage === "preparation" ? `NEXT ROUND IN ${Math.ceil(this.preparation)}` : "SURVIVE",
            weapon: weapon.name,
            ammunition: this.inventory.reloadRemaining > 0 ? `RELOADING ${this.inventory.reloadRemaining.toFixed(1)}s` : `${this.inventory.current.magazine} / ${this.inventory.current.reserve}`,
            slots: this.inventory.slots.map((slot, i) => `${i + 1}: ${weaponById(slot.id).name}${i === this.inventory.selected ? " *" : ""}`).join(" | "),
            prompt: paused || this.defeated ? "" : this.prompt(),
            message: this.messageTime > 0 ? this.message : "",
        });
    }
    public renderWorld(context: CanvasRenderingContext2D): void {
        if (this.active) this.renderer.world(context, this.options.view, this.enemies);
    }
    public renderOverlay(context: CanvasRenderingContext2D): void {
        if (this.active && !this.defeated) this.renderer.overlay(context, this.inventory.definition, this.flash, this.hit, this.damageFlash, this.inventory.reloadRemaining > 0);
    }
    private bindInput(): void {
        this.options.canvas.addEventListener("pointerdown", event => {
            if (event.button !== 0 || !this.playable() || document.pointerLockElement !== this.options.canvas) return;
            event.preventDefault(); this.held = true; this.queued = true;
        });
        window.addEventListener("pointerup", () => { this.held = false; });
        window.addEventListener("blur", () => { this.held = false; this.queued = false; });
        document.addEventListener("pointerlockchange", () => {
            if (document.pointerLockElement !== this.options.canvas) { this.held = false; this.queued = false; }
        });
        window.addEventListener("keydown", event => {
            if (!this.playable()) return;
            if (!["KeyR", "KeyE", "Digit1", "Digit2"].includes(event.code)) return;
            event.preventDefault(); event.stopImmediatePropagation();
            if (event.repeat) return;
            if (event.code === "KeyR") this.inventory.reload();
            if (event.code === "KeyE") this.interact();
            if (event.code === "Digit1") this.inventory.select(0);
            if (event.code === "Digit2") this.inventory.select(1);
        }, { capture: true });
        this.options.canvas.addEventListener("wheel", event => {
            if (!this.playable()) return;
            event.preventDefault();
            if (event.deltaY !== 0 && this.inventory.slots.length > 1) this.inventory.select(1 - this.inventory.selected);
        }, { passive: false });
    }
}
