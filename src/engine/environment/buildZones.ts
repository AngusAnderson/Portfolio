import { TILESIZE } from "../../settings";

import type {
	EnvironmentZone,
	EnvironmentZoneDefinition,
} from "./types";

export function buildEnvironmentZones(
	definitions: EnvironmentZoneDefinition[]
): EnvironmentZone[] {
	return definitions.map((definition) => {
		return {
			id: definition.id,
			name: definition.name,

			x: definition.x * TILESIZE,
			y: definition.y * TILESIZE,
			width: definition.width * TILESIZE,
			depth: definition.depth * TILESIZE,

			kind: definition.kind,
			sheltered: definition.sheltered,
			priority: definition.priority,

			minElevation:
				definition.minElevation === undefined
					? -Infinity
					: definition.minElevation * TILESIZE,

			maxElevation:
				definition.maxElevation === undefined
					? Infinity
					: definition.maxElevation * TILESIZE,
		};
	});
}