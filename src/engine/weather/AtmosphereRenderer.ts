import { ATMOSPHERE } from "../raycaster/atmosphere";

export class AtmosphereRenderer {
    private readonly sky =
        document.createElement("canvas");

    private readonly vignette =
        document.createElement("canvas");

    private width = 0;
    private height = 0;

    public renderBackground(
        context: CanvasRenderingContext2D,
        horizonY: number
    ): void {
        this.resize(
            context.canvas.width,
            context.canvas.height
        );

        const horizon = Math.max(
            0,
            Math.min(this.height, horizonY)
        );

        context.save();

        context.globalAlpha = 1;
        context.globalCompositeOperation = "source-over";

        context.fillStyle =
            `rgb(${ATMOSPHERE.fog.join(",")})`;

        context.fillRect(
            0,
            0,
            this.width,
            this.height
        );

        if (horizon > 0) {
            context.drawImage(
                this.sky,
                0,
                0,
                this.width,
                this.height,
                0,
                0,
                this.width,
                horizon
            );
        }

        context.restore();
    }

    public renderOverlay(
        context: CanvasRenderingContext2D
    ): void {
        this.resize(
            context.canvas.width,
            context.canvas.height
        );

        context.save();

        context.globalAlpha = 1;
        context.globalCompositeOperation = "source-over";

        context.drawImage(
            this.vignette,
            0,
            0
        );

        context.restore();
    }

    private resize(
        width: number,
        height: number
    ): void {
        if (
            width === this.width &&
            height === this.height
        ) {
            return;
        }

        this.width = width;
        this.height = height;

        this.sky.width = width;
        this.sky.height = height;

        this.vignette.width = width;
        this.vignette.height = height;

        const skyContext = this.sky.getContext("2d");

        const vignetteContext =
            this.vignette.getContext("2d");

        if (!skyContext || !vignetteContext) {
            throw new Error(
                "Could not create atmosphere canvases"
            );
        }

        const skyGradient =
            skyContext.createLinearGradient(
                0,
                0,
                0,
                height
            );

        skyGradient.addColorStop(
            0,
            `rgb(${ATMOSPHERE.skyTop.join(",")})`
        );

        skyGradient.addColorStop(
            0.65,
            "rgb(36, 45, 51)"
        );

        skyGradient.addColorStop(
            1,
            `rgb(${ATMOSPHERE.skyHorizon.join(",")})`
        );

        skyContext.fillStyle = skyGradient;

        skyContext.fillRect(
            0,
            0,
            width,
            height
        );

        const radius = Math.hypot(
            width / 2,
            height / 2
        );

        const vignetteGradient =
            vignetteContext.createRadialGradient(
                width / 2,
                height / 2,
                radius * 0.3,
                width / 2,
                height / 2,
                radius
            );

        vignetteGradient.addColorStop(
            0,
            "rgba(0, 0, 0, 0)"
        );

        vignetteGradient.addColorStop(
            0.7,
            "rgba(0, 0, 0, 0.05)"
        );

        vignetteGradient.addColorStop(
            1,
            "rgba(0, 0, 0, 0.28)"
        );

        vignetteContext.fillStyle =
            vignetteGradient;

        vignetteContext.fillRect(
            0,
            0,
            width,
            height
        );
    }
}