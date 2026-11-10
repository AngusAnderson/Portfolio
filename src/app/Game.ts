import { GameMap } from "../engine/map";
import { Player } from "../engine/player";
import { Raycaster } from "../engine/raycaster";
import { EnvironmentSystem } from "../engine/environment";
import { RainAudio } from "../engine/audio";
import { RainRenderer } from "../engine/weather";
import { AtmosphereRenderer } from "../engine/weather/AtmosphereRenderer";
import { ScenerySystem } from "../engine/scenery/ScenerySystem";
import { PropSystem } from "../engine/props/PropSystem";
import { createGameCanvas } from "./createCanvas";
import { AppSettings } from "./AppSettings";
import { SessionController } from "./SessionController";
import { PROJECTS } from "../data/projects";
import { createProjectPaintings } from "../engine/projects/createProjectPainting";
import { ProjectSystem } from "../engine/projects/ProjectSystem";

export class Game {
    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;
    private readonly map: GameMap;
    private readonly player: Player;
    private readonly raycaster: Raycaster;
    private readonly environment: EnvironmentSystem;
    private readonly rainAudio: RainAudio;
    private readonly rainRenderer: RainRenderer;
    private readonly settings: AppSettings;
    private readonly session: SessionController;
    private readonly projects: ProjectSystem;
    private readonly scenery: ScenerySystem;
    private readonly props: PropSystem;
    private readonly atmosphere = new AtmosphereRenderer();
    private previousTime: number | null = null;
    private frameId: number | null = null;

    constructor() {
        const { canvas, context } = createGameCanvas();
        this.canvas = canvas;
        this.context = context;
        this.map = new GameMap();
        this.player = new Player();
        this.raycaster = new Raycaster(this.player, this.map);
        this.scenery = new ScenerySystem(this.map);
        this.props = new PropSystem(this.raycaster);
        this.environment = new EnvironmentSystem();
        this.environment.update(this.player, this.map);
        this.rainAudio = new RainAudio();
        this.rainAudio.update(this.environment.current, this.player);
        this.rainRenderer = new RainRenderer(
            this.rainAudio.intensity, this.map, this.player,
            this.canvas.width, this.canvas.height
        );
        this.settings = new AppSettings(this.player, this.rainAudio);
        this.session = new SessionController({
            canvas: this.canvas,
            player: this.player,
            rainAudio: this.rainAudio,
            settings: this.settings,
            onResetTime: () => { this.previousTime = null; },
        });
        const paintings = createProjectPaintings(
            this.map, this.player, PROJECTS, "keep-gallery", 6
        );
        this.projects = new ProjectSystem({
            paintings,
            view: this.props,
            canvas: this.canvas,
            isPlaying: () => this.session.isPlaying,
            onOpenProject: () => this.session.openProject(),
            onCloseProject: () => this.session.closeProject(),
        });
    }

    public start(): void {
        if (this.frameId !== null) return;
        this.previousTime = null;
        this.frameId = requestAnimationFrame(this.frame);
    }

    private readonly frame = (timestamp: number): void => {
        const deltaTime = this.previousTime === null ? 0
            : Math.max(0, Math.min((timestamp - this.previousTime) / 1000, 0.05));
        this.previousTime = timestamp;
        this.update(deltaTime);
        this.render();
        this.frameId = requestAnimationFrame(this.frame);
    };

    private update(deltaTime: number): void {
        if (this.session.isPlaying) this.player.update(this.map, deltaTime);
        this.environment.update(this.player, this.map);
        this.rainAudio.update(this.environment.current, this.player);
        this.rainRenderer.update(deltaTime);
        this.raycaster.castAllRays();
        this.props.prepare(this.canvas.width, this.canvas.height);
        this.projects.update();
    }

    private render(): void {
        this.atmosphere.renderBackground(this.context, this.raycaster.getWorldCamera());
        this.raycaster.render(this.context);
        this.scenery.render(this.context, this.props);
        this.props.render(this.context);
        this.projects.render(this.context);
        if (this.settings.showRain) this.rainRenderer.render(this.context, this.raycaster);
        this.atmosphere.renderOverlay(this.context);
    }
}
