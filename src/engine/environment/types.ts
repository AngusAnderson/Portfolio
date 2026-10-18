export type EnvironmentKind = "outdoor" | "indoor";

export type ShelterSource =
	| "none"
	| "zone"
	| "suspended-platform";


export type EnvironmentZoneDefinition = {
	id: string;
	name: string;

	x: number;
	y: number;
	width: number;
	depth: number;

	kind: EnvironmentKind;
	sheltered: boolean;

	priority: number;

	minElevation?: number;
	maxElevation?: number;
};

export type EnvironmentZone = {
	id: string;
	name: string;

	x: number;
	y: number;
	width: number;
	depth: number;

	kind: EnvironmentKind;
	sheltered: boolean;
	priority: number;

	minElevation: number;
	maxElevation: number;
};

export type EnvironmentState = {
	zoneId: string;
	zoneName: string;

	kind: EnvironmentKind;
	indoors: boolean;

	sheltered: boolean;
	exposedToRain: boolean;
	shelterSource: ShelterSource;
};