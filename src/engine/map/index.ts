import { TILESIZE } from "../../settings";
import { CASTLE_LEVEL } from "./levels/castle";

export { GameMap } from "./GameMap";
export { CASTLE_LEVEL } from "./levels/castle";

export type {
	Ramp,
	Platform,
	SuspendedPlatform,
	MapGeometry,
	WallDefinition,
	RampDefinition,
	PlatformDefinition,
	GroundSurfaceDefinition,
	SuspendedPlatformDefinition,
	LevelDefinition,
} from "./types";

export const LEVEL_COLS = CASTLE_LEVEL.columns;
export const LEVEL_ROWS = CASTLE_LEVEL.rows;

export const PLAYER_SPAWN = {
	x: CASTLE_LEVEL.spawn.x * TILESIZE,
	y: CASTLE_LEVEL.spawn.y * TILESIZE,
	rotationAngle: CASTLE_LEVEL.spawn.rotationAngle,
};