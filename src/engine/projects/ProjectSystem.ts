import { TILESIZE } from "../../settings";

import { createProjectHUD } from "../../ui/projectHUD";
import { createProjectPanel } from "../../ui/projectPanel";

import { PaintingRenderer } from "./PaintingRenderer";

import type {
    ProjectPainting,
    ProjectView
} from "./types";

type ProjectSystemOptions = {
    paintings: ProjectPainting[];
    view: ProjectView;
    canvas: HTMLCanvasElement;
    isPlaying: () => boolean;
    onOpenProject: () => void;
    onCloseProject: () => void;
};

export class ProjectSystem {
    private readonly options: ProjectSystemOptions;
    private readonly renderer = new PaintingRenderer();
    private readonly hud = createProjectHUD();
    private readonly panel = createProjectPanel();

    private target: ProjectPainting | null = null;
    private cooldown = 0;

    private readonly interactionRange = TILESIZE * 2;
    private readonly jumpRange = TILESIZE * 1.1;
    private readonly jumpDepth = TILESIZE * 0.55;

    constructor(options: ProjectSystemOptions) {
        this.options = options;

        document.body.append(
            this.hud.element,
            this.panel.dialog
        );

        this.panel.dialog.addEventListener(
            "close",
            () => {
                this.cooldown = 1.5;

                this.options.onCloseProject();
            }
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

                this.openProject(target);
            }
        );
    }

    public update(): void {
        if (this.cooldown > 0) {
            this.cooldown = Math.max(
                0,
                this.cooldown - 0.016
            );
        }

        this.target = this.options.isPlaying()
            ? this.findTarget()
            : null;

        this.hud.setTarget(
            this.target?.project.title ?? null
        );

        if (
            this.options.isPlaying() &&
            !this.panel.dialog.open &&
            this.cooldown <= 0
        ) {
            const jumpTarget = this.findJumpTarget();

            if (jumpTarget) {
                this.openProject(jumpTarget);
            }
        }
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

    private openProject(
        target: ProjectPainting
    ): void {
        this.options.onOpenProject();

        this.target = null;
        this.hud.setTarget(null);

        this.panel.show(target.project);

        this.cooldown = 2;
    }

    private findTarget(): ProjectPainting | null {
        return this.findPainting(
            this.interactionRange,
            Infinity
        );
    }

    private findJumpTarget(): ProjectPainting | null {
        return this.findPainting(
            this.jumpRange,
            this.jumpDepth
        );
    }

    private findPainting(
        maximumDistance: number,
        maximumFrontDistance: number
    ): ProjectPainting | null {
        const { canvas, view } = this.options;

        const camera = view.getWorldCamera();

        const directionX = Math.cos(
            camera.rotationAngle
        );

        const directionY = Math.sin(
            camera.rotationAngle
        );

        const directionZ =
            (camera.horizonY - canvas.height / 2) /
            camera.projectionDistance;

        let nearest: ProjectPainting | null = null;
        let nearestDepth = Infinity;

        for (const painting of this.options.paintings) {
            const normalX = Math.cos(
                painting.normalAngle
            );

            const normalY = Math.sin(
                painting.normalAngle
            );

            const denominator =
                directionX * normalX +
                directionY * normalY;

            if (denominator >= -0.000001) {
                continue;
            }

            const depth =
                ((painting.x - camera.x) * normalX +
                    (painting.y - camera.y) * normalY) /
                denominator;

            if (
                depth <= 0 ||
                depth >= nearestDepth
            ) {
                continue;
            }

            const hitX =
                camera.x + directionX * depth;

            const hitY =
                camera.y + directionY * depth;

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
                    painting.bottomHeight +
                        painting.height
            ) {
                continue;
            }

            const frontDistance =
                (camera.x - painting.x) * normalX +
                (camera.y - painting.y) * normalY;

            if (frontDistance <= 0) {
                continue;
            }

            if (frontDistance > maximumFrontDistance) {
                continue;
            }

            const distance = Math.hypot(
                hitX - camera.x,
                hitY - camera.y,
                hitZ - camera.cameraHeight
            );

            if (distance > maximumDistance) {
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