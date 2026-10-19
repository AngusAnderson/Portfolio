import { CASTLE_LEVEL } from "./levels/castle";
import { buildGrid } from "./gridBuilder";
import { buildEnvironmentZones } from "../environment/buildZones";
import type { EnvironmentZone } from "../environment/types";

import {
	buildGroundSurfaces,
	buildSuspendedPlatforms,
	platformToRamp,
} from "./surfaceBuilder";

import {
	hasWallAt as queryWallAt,
	getGroundHeightAt as queryGroundHeightAt,
	getSupportHeightAt as querySupportHeightAt,
	getSuspendedPlatformsAt as querySuspendedPlatformsAt,
} from "./queries";

import { renderMapDebug } from "./debugRenderer";

import type {
	LevelDefinition,
	MapGeometry,
	Platform,
	Ramp,
	SuspendedPlatform,
} from "./types";

export class GameMap implements MapGeometry {
	public grid: number[][];
	public ramps: Ramp[];
	public suspendedPlatforms: SuspendedPlatform[];

    public environmentZones: EnvironmentZone[];

	constructor(level: LevelDefinition = CASTLE_LEVEL) {
		this.grid = buildGrid(level);

		this.ramps = buildGroundSurfaces(
			level.groundSurfaces
		);

		this.suspendedPlatforms = buildSuspendedPlatforms(
			level.suspendedPlatforms
		);

        this.environmentZones = buildEnvironmentZones(
			level.environmentZones ?? []
		);
	}

	// Runtime API: platform coordinates are world units.
	public addPlatform(platform: Platform): void {
		this.ramps.push(platformToRamp(platform));
	}

	public hasWallAt(x: number, y: number): number {
		return queryWallAt(this.grid, x, y);
	}

	public getGroundHeightAt(x: number, y: number): number {
		return queryGroundHeightAt(this.ramps, x, y);
	}

	public getSupportHeightAt(
		x: number,
		y: number,
		feetHeight: number,
		maxStepUp: number = 0
	): number {
		return querySupportHeightAt(
			this,
			x,
			y,
			feetHeight,
			maxStepUp
		);
	}

	public getSuspendedPlatformsAt(
		x: number,
		y: number
	): SuspendedPlatform[] {
		return querySuspendedPlatformsAt(
			this.suspendedPlatforms,
			x,
			y
		);
	}

	public render(context: CanvasRenderingContext2D): void {
		renderMapDebug(context, this);
	}
}