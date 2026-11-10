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
import { renderMapDebug } from "./debugRenderer";
import type { LevelDefinition, MapGeometry, Platform, Ramp, SuspendedPlatform } from "./types";

export class GameMap implements MapGeometry {
    public grid: number[][];
    public ramps: Ramp[];
    public suspendedPlatforms: SuspendedPlatform[];
    public environmentZones: EnvironmentZone[];
    private readonly castlePropsEnabled: boolean;

    constructor(level: LevelDefinition = CASTLE_LEVEL) {
        this.grid = buildGrid(level);
        this.ramps = buildGroundSurfaces(level.groundSurfaces);
        this.suspendedPlatforms = buildSuspendedPlatforms(level.suspendedPlatforms);
        this.environmentZones = buildEnvironmentZones(level.environmentZones ?? []);
        this.castlePropsEnabled = level === CASTLE_LEVEL;
    }

    public addPlatform(platform: Platform): void {
        this.ramps.push(platformToRamp(platform));
    }

    public hasWallAt(x: number, y: number): number {
        return queryWallAt(this.grid, x, y);
    }

    public getGroundHeightAt(x: number, y: number): number {
        return queryGroundHeightAt(this.ramps, x, y);
    }

    public getSupportHeightAt(x: number, y: number, feetHeight: number, maxStepUp: number = 0): number {
        const ground = querySupportHeightAt(this, x, y, feetHeight, maxStepUp);
        if (!this.castlePropsEnabled) return ground;
        return Math.max(ground, getPropSupportHeight(x, y, feetHeight, maxStepUp));
    }

    public getSuspendedPlatformsAt(x: number, y: number): SuspendedPlatform[] {
        const platforms = querySuspendedPlatformsAt(this.suspendedPlatforms, x, y);
        if (!this.castlePropsEnabled) return platforms;
        return platforms.concat(getPropSlabsAt(x, y).map(prop => ({
            x: prop.x - prop.width / 2,
            y: prop.y - prop.depth / 2,
            width: prop.width,
            depth: prop.depth,
            bottomHeight: prop.bottom,
            topHeight: prop.top,
        })));
    }

    public get usesCastleProps(): boolean {
        return this.castlePropsEnabled;
    }

    public render(context: CanvasRenderingContext2D): void {
        renderMapDebug(context, this);
    }
}
