import { GameMap } from "../engine/map";
import { Player } from "../engine/player";
import { Raycaster } from "../engine/raycaster";
import { EnvironmentSystem } from "../engine/environment";
import { RainAudio } from "../engine/audio";
import { RainRenderer } from "../engine/weather";
import { AtmosphereRenderer } from "../engine/weather/AtmosphereRenderer";
import { ScenerySystem } from "../engine/scenery/ScenerySystem";
import { PropSystem } from "../engine/props/PropSystem";
import { SurvivalSystem } from "../engine/survival/SurvivalSystem";
import { createGameCanvas } from "./createCanvas";
import { AppSettings } from "./AppSettings";
import { SessionController } from "./SessionController";
import { PROJECTS } from "../data/projects";
import { createProjectPaintings } from "../engine/projects/createProjectPainting";
import { ProjectSystem } from "../engine/projects/ProjectSystem";

type PositionSnapshot = { x: number; y: number; elevation: number; angle: number; pitch: number; };

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
    private readonly survival: SurvivalSystem;
    private readonly atmosphere = new AtmosphereRenderer();
    private portfolioPosition: PositionSnapshot | null = null;
    private previousTime: number | null = null;
    private frameId: number | null = null;

    constructor() {
        const { canvas, context } = createGameCanvas();
        this.canvas = canvas; this.context = context;
        this.map = new GameMap(); this.player = new Player();
        this.raycaster = new Raycaster(this.player, this.map);
        this.scenery = new ScenerySystem(this.map); this.props = new PropSystem(this.raycaster);
        this.environment = new EnvironmentSystem(); this.environment.update(this.player, this.map);
        this.rainAudio = new RainAudio(); this.rainAudio.update(this.environment.current, this.player);
        this.rainRenderer = new RainRenderer(this.rainAudio.intensity, this.map, this.player, this.canvas.width, this.canvas.height);
        this.settings = new AppSettings(this.player, this.rainAudio);
        this.session = new SessionController({ canvas: this.canvas, player: this.player,
            rainAudio: this.rainAudio, settings: this.settings, onResetTime: () => { this.previousTime = null; } });
        this.survival = new SurvivalSystem({ canvas: this.canvas, player: this.player, map: this.map,
            view: this.props, isPlaying: () => this.session.isPlaying,
            onDefeat: () => this.session.openProject(), onRestart: () => this.beginSurvival(), onExit: () => this.endSurvival() });
        const paintings = createProjectPaintings(this.map, this.player, PROJECTS, "keep-gallery", 6);
        this.projects = new ProjectSystem({ paintings, view: this.props, canvas: this.canvas,
            isPlaying: () => this.session.isPlaying && !this.survival.active,
            onOpenProject: () => this.session.openProject(), onCloseProject: () => this.session.closeProject() });
        window.addEventListener("portfolio:start-survival", () => this.beginSurvival());
        window.addEventListener("portfolio:exit-survival", () => this.endSurvival());
    }
    private beginSurvival(): void {
        this.session.pause();
        if (!this.survival.active) this.portfolioPosition = { x: this.player.x, y: this.player.y,
            elevation: this.player.elevation, angle: this.player.rotationAngle, pitch: this.player.pitch };
        try { this.survival.start(); this.props.invalidate(); this.session.play(); }
        catch (error: unknown) {
            console.error("Could not start survival:", error);
            this.endSurvival();
            window.alert(error instanceof Error ? error.message : "Could not initialise survival.");
        }
    }
    private endSurvival(): void {
        this.session.pause(); this.survival.stop();
        const saved = this.portfolioPosition;
        if (saved) {
            this.player.x = saved.x; this.player.y = saved.y;
            this.player.elevation = this.map.getSupportHeightAt(saved.x, saved.y, saved.elevation, 0.01);
            this.player.rotationAngle = saved.angle; this.player.pitch = saved.pitch;
            this.player.grounded = true; this.player.jumpHeight = 0;
        }
        this.portfolioPosition = null; this.props.invalidate(); this.session.showStart();
    }
    public start(): void {
        if (this.frameId !== null) return;
        this.previousTime = null; this.frameId = requestAnimationFrame(this.frame);
    }
    private readonly frame = (timestamp: number): void => {
        const dt = this.previousTime === null ? 0 : Math.max(0, Math.min((timestamp - this.previousTime) / 1000, 0.05));
        this.previousTime = timestamp; this.update(dt); this.render();
        this.frameId = requestAnimationFrame(this.frame);
    };
    private update(dt: number): void {
        if (this.session.isPlaying && !this.survival.defeated) {
            const previous = { x: this.player.x, y: this.player.y, elevation: this.player.elevation,
                grounded: this.player.grounded, jumpHeight: this.player.jumpHeight };
            this.player.update(this.map, dt); this.survival.constrainPlayer(previous);
        }
        this.environment.update(this.player, this.map);
        this.rainAudio.update(this.environment.current, this.player);
        this.rainRenderer.update(dt);
        this.raycaster.castAllRays(); this.props.prepare(this.canvas.width, this.canvas.height);
        this.projects.update(); this.survival.update(dt);
    }
    private render(): void {
        this.atmosphere.renderBackground(this.context, this.raycaster.getWorldCamera());
        this.raycaster.render(this.context); this.scenery.render(this.context, this.props);
        this.props.render(this.context); this.projects.render(this.context);
        this.survival.renderWorld(this.context);
        if (this.settings.showRain) this.rainRenderer.render(this.context, this.raycaster);
        this.atmosphere.renderOverlay(this.context); this.survival.renderOverlay(this.context);
    }
}
