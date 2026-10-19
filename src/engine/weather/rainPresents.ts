import type { RainIntensity } from "../audio/rainConfig";

export type RainVisualPreset = {
    dropCount: number;
    fallSpeed: number;
    windSpeed: number;
    streakLenth: number;
    opacity: number;
};

export const RAIN_VISUAL_PRESETS: Record<RainIntensity, RainVisualPreset> = {
    light: {
        dropCount: 45,
        fallSpeed: 160,
        windSpeed: -30,
        streakLenth: 5,
        opacity: 0.25
    },

    medium: {
        dropCount: 100,
        fallSpeed: 220,
        windSpeed: -55,
        streakLenth: 8,
        opacity: 0.35
    },

    high: {
        dropCount: 190,
        fallSpeed: 290,
        windSpeed: -85,
        streakLenth: 12,
        opacity: 0.45
    }
};