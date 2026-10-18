// MARK: - Runtime Geometry
// Note: The coordinates and heights are measured in world units.

export type Ramp = {
	x: number;
	y: number;
	width: number;
	depth: number;
	startHeight: number;
	endHeight: number;
	direction: "north" | "south" | "east" | "west";
};

export type Platform = {
	x: number;
	y: number;
	width: number;
	depth: number;
	height: number;
};

export type SuspendedPlatform = {
	x: number;
	y: number;
	width: number;
	depth: number;
	bottomHeight: number;
	topHeight: number;
};

export type MapGeometry = {
	grid: number[][];
	ramps: Ramp[];
	suspendedPlatforms: SuspendedPlatform[];
};

// MARK: - Level Definitions
// Positions, dimensions, and heights are in tile units.

export type WallDefinition = {
	kind: "fill" | "outline";
	name: string;
	x: number;
	y: number;
	width: number;
	depth: number;
	value: number;
};

export type RampDefinition = {
	kind: "ramp";
	name: string;
	x: number;
	y: number;
	width: number;
	depth: number;
	startHeight: number;
	endHeight: number;
	direction: Ramp["direction"];
};

export type PlatformDefinition = {
	kind: "platform";
	name: string;
	x: number;
	y: number;
	width: number;
	depth: number;
	height: number;
};

export type GroundSurfaceDefinition =
	| RampDefinition
	| PlatformDefinition;

export type SuspendedPlatformDefinition = {
	name: string;
	x: number;
	y: number;
	width: number;
	depth: number;
	bottomHeight: number;
	topHeight: number;
};

export type LevelDefinition = {
	name: string;
	columns: number;
	rows: number;

	spawn: {
		x: number;
		y: number;
		rotationAngle: number;
	};

	walls: WallDefinition[];
	groundSurfaces: GroundSurfaceDefinition[];
	suspendedPlatforms: SuspendedPlatformDefinition[];
};