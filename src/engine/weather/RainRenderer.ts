import type { RainIntensity } from "../audio/rainConfig";
import type { EnvironmentState } from "../environment";

import { RAIN_VISUAL_PRESETS, type RainVisualPreset } from "./rainPresents";

type RainDrop = {
    x: number;
    y: number;

    speedMultiplier: number;
    lengthMultiplier: number;
};

export class RainRenderer {
    private readonly preset: RainVisualPreset;
    private readonly drops: RainDrop[] = [];

    private width: number;
    private height: number;

    private visiblility: number = 0;

    constructor(
        intensity: RainIntensity,
        width: number,
        height: number,
    ) {
        this.preset = RAIN_VISUAL_PRESETS[intensity];

        this.width = Math.max(1, width);
        this.height = Math.max(1, height);

        this.createDrops();
    }

    public update(
		deltaTime: number,
		environment: Readonly<EnvironmentState>
	): void {
		const dt = Number.isFinite(deltaTime)
			? Math.max(0, Math.min(deltaTime, 0.05))
			: 0;

		const targetVisibility = environment.exposedToRain
			? 1
			: 0;

		const blend = 1 - Math.exp(-12 * dt);

		this.visiblility +=
			(targetVisibility - this.visiblility) * blend;

		for (const drop of this.drops) {
			drop.x +=
				this.preset.windSpeed *
				drop.speedMultiplier *
				dt;

			drop.y +=
				this.preset.fallSpeed *
				drop.speedMultiplier *
				dt;

			if (drop.y > this.height + this.margin) {
				drop.y = -this.margin;
				drop.x = Math.random() * this.width;
			}

			if (drop.x < -this.margin) {
				drop.x = this.width + this.margin;
			} else if (drop.x > this.width + this.margin) {
				drop.x = -this.margin;
			}
		}
	}

    public render(context: CanvasRenderingContext2D): void {
        if (this.visiblility < 0.01) {
            return;
        }

        context.save();

        context.globalCompositeOperation = 'source-over';
        context.globalAlpha = this.preset.opacity * this.visiblility;

        context.strokeStyle = '#b8c8d8';
        context.lineWidth = 1;
        context.lineCap = 'butt';

        context.beginPath();

        for (const drop of this.drops) {
            const length = this.preset.streakLenth * drop.lengthMultiplier;

            const horizontalLength = length * (this.preset.windSpeed / this.preset.fallSpeed);

            context.moveTo(drop.x, drop.y);
            context.lineTo(drop.x + horizontalLength, drop.y + length);
        }

        context.stroke();
        context.restore();
    }

    public resize(width: number, height: number): void {
        this.width = Math.max(1, width);
        this.height = Math.max(1, height);

        this.createDrops();
    }

    private get margin(): number {
        return this.preset.streakLenth * 2;
    }

    private createDrops(): void {
        this.drops.length = 0;

        const referenceArea = 480 * 320;
        const areaScale = (this.width * this.height) / referenceArea;

        const count = Math.min(
            600,
            Math.max(
                1,
                Math.round(
                    this.preset.dropCount * areaScale
                )
            )
        );

        for (let _ = 0; _ < count; _++) {
            this.drops.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                
                speedMultiplier: 0.75 + Math.random() * 0.5,
                lengthMultiplier: 0.7 + Math.random() * 0.6
            });
        }
    }
}