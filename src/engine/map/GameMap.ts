import { CASTLE_LEVEL } from "./levels/castle";
import { buildGrid } from "./gridBuilder";
import { buildEnvironmentZones } from "../environment/buildZones";
import type { EnvironmentZone } from "../environment/types";
import { buildGroundSurfaces, buildSuspendedPlatforms, platformToRamp } from "./surfaceBuilder";
import {
    hasWallAt as queryWallAt,
    getGroundHeightAt as queryGroundHeightAt,
    getSupportHeightAt as querySupportHeightAt,
    getSuspendedPlatformsAt as querySuspendedPlatformsAt,
} from "./queries";
import { getPropSupportHeight, getPropSlabsAt } from "../props/definitions";
import { GALLERY_ROOF } from "../architecture/galleryStructure";
import { renderMapDebug } from "./debugRenderer";
import type { LevelDefinition, MapGeometry, Platform, Ramp, SuspendedPlatform } from "./types";

export class GameMap implements MapGeometry {
    public grid: number[][];
    public ramps: Ramp[];
    public suspendedPlatforms: SuspendedPlatform[];
    public environmentZones: EnvironmentZone[];
    private readonly castlePropsEnabled: boolean;

    constructor(level: LevelDefinition = CASTLE_LEVEL) {
        this.castlePropsEnabled = level === CASTLE_LEVEL;
        this.grid = buildGrid(level);
        this.ramps = buildGroundSurfaces(level.groundSurfaces);
        const surfaces = [...level.suspendedPlatforms];
        if (this.castlePropsEnabled) surfaces.push(GALLERY_ROOF);
        this.suspendedPlatforms = buildSuspendedPlatforms(surfaces);
        this.environmentZones = buildEnvironmentZones(level.environmentZones ?? []);
    }
    public addPlatform(platform: Platform): void { this.ramps.push(platformToRamp(platform)); }
    public hasWallAt(x: number, y: number): number { return queryWallAt(this.grid, x, y); }
    public getGroundHeightAt(x: number, y: number): number { return queryGroundHeightAt(this.ramps, x, y); }
    public getSupportHeightAt(x: number, y: number, feetHeight: number, maxStepUp: number = 0): number {
        const ground = querySupportHeightAt(this, x, y, feetHeight, maxStepUp);
        return this.castlePropsEnabled ? Math.max(ground, getPropSupportHeight(x, y, feetHeight, maxStepUp)) : ground;
    }
    public getSuspendedPlatformsAt(x: number, y: number): SuspendedPlatform[] {
        const platforms = querySuspendedPlatformsAt(this.suspendedPlatforms, x, y);
        if (!this.castlePropsEnabled) return platforms;
        return platforms.concat(getPropSlabsAt(x, y).map(prop => {
            const cosine = Math.abs(Math.cos(prop.rotation ?? 0));
            const sine = Math.abs(Math.sin(prop.rotation ?? 0));
            const width = prop.width * cosine + prop.depth * sine;
            const depth = prop.width * sine + prop.depth * cosine;
            return { x: prop.x - width / 2, y: prop.y - depth / 2, width, depth,
                bottomHeight: prop.bottom, topHeight: prop.top };
        }));
    }
    public get usesCastleProps(): boolean { return this.castlePropsEnabled; }
    public render(context: CanvasRenderingContext2D): void { renderMapDebug(context, this); }
}
