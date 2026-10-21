import { TILESIZE } from "../../settings";

import { createProjectHUD } from "../../ui/projectHUD";
import { createProjectPanel } from "../../ui/projectPanel";

import { PaintingRenderer } from "./PaintingRenderer";

import type {
    ProjectPainting,
    ProjectView,
} from "./types";

type ProjectSystemOptions = {
    paintings: ProjectPainting[];

    view: ProjectView;
    canvas: HTMLCanvasElement;

    isPlaying: () => boolean;
    onOpenProject: () => void;
};

export class ProjectSystem {
    private readonly options: ProjectSystemOptions;

    private readonly renderer = new PaintingRenderer();

    private readonly hud = createProjectHUD();
    private readonly panel = createProjectPanel();

    private target: ProjectPainting | null = null;

    private readonly interactionRange = TILESIZE * 2;

    constructor(options: ProjectSystemOptions) {
        this.options = options;

        document.body.append(
            this.hud.element,
            this.panel.dialog
        );

        window.addEventListener(
            "keydown",
            (event: KeyboardEvent) => {
                if (
                    event.code !== "KeyE" ||
                    event.repeat ||
                    !this.options.isPlaying() ||
                    this.panel.dialog.open
                ) {
                    return;
                }

                const target = this.findTarget();

                if (!target) {
                    return;
                }

                event.preventDefault();

                this.options.onOpenProject();

                this.target = null;
                this.hud.setTarget(null);

                this.panel.show(target.project);
            }
        );
    }

    public update(): void {
        this.target = this.options.isPlaying()
            ? this.findTarget()
            : null;

        this.hud.setTarget(
            this.target?.project.title ?? null
        );
    }

    public render(
        context: CanvasRenderingContext2D
    ): void {
        this.renderer.render(
            context,
            this.options.paintings,
            this.options.view
        );
    }

    private findTarget(): ProjectPainting | null {
        const { canvas, view } = this.options;

        const camera = view.getWorldCamera();

        const directionX = Math.cos(camera.rotationAngle);
        const directionY = Math.sin(camera.rotationAngle);

        const directionZ =
            (camera.horizonY - canvas.height / 2) /
            camera.projectionDistance;

        let nearest: ProjectPainting | null = null;
        let nearestDepth = Infinity;

        for (const painting of this.options.paintings) {
            const normalX = Math.cos(painting.normalAngle);
            const normalY = Math.sin(painting.normalAngle);

            const denominator =
                directionX * normalX +
                directionY * normalY;

            if (denominator >= -0.000001) {
                continue;
            }

            const depth =
                (
                    (painting.x - camera.x) * normalX +
                    (painting.y - camera.y) * normalY
                ) / denominator;

            if (
                depth <= 0 ||
                depth >= nearestDepth
            ) {
                continue;
            }

            const hitX = camera.x + directionX * depth;
            const hitY = camera.y + directionY * depth;

            const hitZ =
                camera.cameraHeight +
                directionZ * depth;

            const tangentX = -normalY;
            const tangentY = normalX;

            const horizontalOffset =
                (hitX - painting.x) * tangentX +
                (hitY - painting.y) * tangentY;

            if (
                Math.abs(horizontalOffset) >
                    painting.width / 2 ||
                hitZ < painting.bottomHeight ||
                hitZ >
                    painting.bottomHeight + painting.height
            ) {
                continue;
            }

            const distance = Math.hypot(
                hitX - camera.x,
                hitY - camera.y,
                hitZ - camera.cameraHeight
            );

            if (distance > this.interactionRange) {
                continue;
            }

            if (
                !view.isWorldPointVisible(
                    canvas.width / 2,
                    canvas.height / 2,
                    depth
                )
            ) {
                continue;
            }

            nearest = painting;
            nearestDepth = depth;
        }

        return nearest;
    }
}