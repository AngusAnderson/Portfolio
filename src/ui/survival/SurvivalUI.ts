import "./survival.css";

export type SurvivalHUD = {
    health: number; points: number; round: number; enemies: number;
    stage: string; weapon: string; ammunition: string; slots: string;
    prompt: string; message: string;
};

export class SurvivalUI {
    private readonly hud = document.createElement("section");
    private readonly results = document.createElement("dialog");
    private readonly fields = new Map<string, HTMLElement>();
    private readonly summary: HTMLElement;

    constructor(onRestart: () => void, onExit: () => void) {
        this.hud.className = "survival-hud";
        this.hud.hidden = true;
        this.hud.setAttribute("aria-label", "Survival status");
        this.hud.innerHTML = `
            <div class="survival-top"><span>THE RESTLESS KEEP</span><span data-survival="stage"></span></div>
            <div class="survival-message" data-survival="message"></div>
            <div class="survival-prompt" data-survival="prompt"></div>
            <div class="survival-bottom">
                <div><span data-survival="health"></span><span data-survival="points"></span><span data-survival="round"></span></div>
                <div class="survival-weapon"><span data-survival="weapon"></span><span data-survival="ammunition"></span><small data-survival="slots"></small></div>
            </div>
            <div class="survival-controls">LMB FIRE · R RELOAD · 1/2 SWITCH · E BUY · ESC PAUSE</div>`;
        for (const element of this.hud.querySelectorAll<HTMLElement>("[data-survival]")) {
            this.fields.set(element.dataset.survival!, element);
        }
        this.results.className = "survival-results";
        this.results.setAttribute("aria-label", "Survival results");
        this.results.innerHTML = `<h2>THE KEEP CLAIMS ANOTHER</h2><p data-summary></p><button type="button" data-restart>RESTART SURVIVAL</button><button type="button" data-exit>RETURN TO PORTFOLIO</button>`;
        this.summary = this.results.querySelector<HTMLElement>("[data-summary]")!;
        this.results.querySelector<HTMLButtonElement>("[data-restart]")!.addEventListener("click", () => { this.results.close(); onRestart(); });
        this.results.querySelector<HTMLButtonElement>("[data-exit]")!.addEventListener("click", () => { this.results.close(); onExit(); });
        this.results.addEventListener("cancel", event => event.preventDefault());
        document.body.append(this.hud, this.results);
    }
    public show(): void { this.hud.hidden = false; }
    public hide(): void { this.hud.hidden = true; if (this.results.open) this.results.close(); }
    public defeat(round: number, kills: number, earned: number): void {
        this.summary.textContent = `Round ${round} · ${kills} kills · ${earned} points earned`;
        if (!this.results.open) this.results.showModal();
        this.results.querySelector<HTMLButtonElement>("[data-restart]")?.focus();
    }
    public update(canvas: HTMLCanvasElement, state: SurvivalHUD): void {
        const rectangle = canvas.getBoundingClientRect();
        this.hud.style.left = `${rectangle.left}px`;
        this.hud.style.top = `${rectangle.top}px`;
        this.hud.style.width = `${rectangle.width}px`;
        this.hud.style.height = `${rectangle.height}px`;
        const values: Record<string, string> = {
            health: `HP ${Math.ceil(state.health)}`, points: `${state.points} POINTS`,
            round: `ROUND ${state.round} · ${state.enemies} REMAINING`,
            stage: state.stage, weapon: state.weapon, ammunition: state.ammunition,
            slots: state.slots, prompt: state.prompt, message: state.message,
        };
        for (const [key, text] of Object.entries(values)) {
            const field = this.fields.get(key);
            if (field && field.textContent !== text) field.textContent = text;
        }
        this.hud.dataset.danger = state.health <= 40 ? "true" : "false";
    }
}
