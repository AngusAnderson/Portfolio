import { TILESIZE } from "../../settings";

import type {
	GroundSurfaceDefinition,
	Platform,
	Ramp,
	SuspendedPlatform,
	SuspendedPlatformDefinition,
} from "./types";

export function platformToRamp(platform: Platform): Ramp {
	return {
		x: platform.x,
		y: platform.y,
		width: platform.width,
		depth: platform.depth,
		startHeight: platform.height,
		endHeight: platform.height,
		direction: "north",
	};
}

export function buildGroundSurfaces(
	definitions: GroundSurfaceDefinition[]
): Ramp[] {
	return definitions.map((definition): Ramp => {
		const bounds = {
			x: definition.x * TILESIZE,
			y: definition.y * TILESIZE,
			width: definition.width * TILESIZE,
			depth: definition.depth * TILESIZE,
		};

		if (definition.kind === "platform") {
			return platformToRamp({
				...bounds,
				height: definition.height * TILESIZE,
			});
		}

		return {
			...bounds,
			startHeight: definition.startHeight * TILESIZE,
			endHeight: definition.endHeight * TILESIZE,
			direction: definition.direction,
		};
	});
}

export function buildSuspendedPlatforms(
	definitions: SuspendedPlatformDefinition[]
): SuspendedPlatform[] {
	return definitions.map((definition) => {
		return {
			x: definition.x * TILESIZE,
			y: definition.y * TILESIZE,
			width: definition.width * TILESIZE,
			depth: definition.depth * TILESIZE,
			bottomHeight:
				definition.bottomHeight * TILESIZE,
			topHeight:
				definition.topHeight * TILESIZE,
		};
	});
}