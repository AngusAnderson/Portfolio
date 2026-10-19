import { TILESIZE } from "../../settings";

type IndoorOpening = {
    x: number;
    y: number;

    fadeDistance: number;
};

export type RainIntensity = 'light' | 'medium' | 'high';

export type RainTrack = {
    source: string;
    intensity: RainIntensity;
};

export const  RAIN_CONFIG = {
    sources: [
		{
			source:
				`${import.meta.env.BASE_URL}assets/audio/Rain/1.mp3`,
			intensity: "high",
		},
		{
			source:
				`${import.meta.env.BASE_URL}assets/audio/Rain/2.mp3`,
			intensity: "high",
		},
		{
			source:
				`${import.meta.env.BASE_URL}assets/audio/Rain/3.mp3`,
			intensity: "medium",
		},
		{
			source:
				`${import.meta.env.BASE_URL}assets/audio/Rain/4.mp3`,
			intensity: "light",
		},
	] satisfies RainTrack[],

    initialMasterVolume: 0.4,

    TransitionTime: 0.3,

    outdoor: {
        gain: 0.85,
        cutoff: 16000,
    },

    shelteredOutdoor: {
        gain: 0.5,
        cutoff: 65000,
    },

    indoor: {
        nearGain: 0.3,
        farGain: 0.025,

        nearCutoff: 2200,
        farCutoff: 650,

        defaultFadeDistance: 5 * TILESIZE
    },
};

export const INDOOR_OPENINGS: Record<string, IndoorOpening> = {
    "gate-vestibule": {
        x: 15.5 * TILESIZE,
        y: 20.5 * TILESIZE,
        fadeDistance: 3 * TILESIZE
    },

    "keep-gallery": {
        x: 15.5 * TILESIZE,
        y: 9.5 * TILESIZE,
        fadeDistance: 6 * TILESIZE
    },

    "left-chamber": {
        x: 8 * TILESIZE,
        y: 9.5 * TILESIZE,
        fadeDistance: 4 * TILESIZE
    },

    "right-chamber": {
        x: 23 * TILESIZE,
        y: 9.5 * TILESIZE,
        fadeDistance: 4 * TILESIZE
    }
};