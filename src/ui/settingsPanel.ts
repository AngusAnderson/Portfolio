import { createMenuDialog } from "./menuDialog";

export type UISettings = {
    rainVolume: number; rainMuted: boolean;
    horizontalSensitivity: number; verticalSensitivity: number;
    showRain: boolean;
};
export type SettingsPanelOptions = { getSettings: () => UISettings; onChange: (settings: UISettings) => void; };
export type SettingsPanel = { dialog: HTMLDialogElement; refresh: () => void; };

export function createSettingsPanel(options: SettingsPanelOptions): SettingsPanel {
    const { dialog, content } = createMenuDialog("settings-panel", "Settings", "Make yourself comfortable.");
    content.innerHTML = `
        <fieldset class="settings-group"><legend>Audio</legend>
            <div class="settings-field"><div class="settings-field__heading"><label for="settings-rain-volume">Rain volume</label><output data-output="volume" for="settings-rain-volume"></output></div>
            <input id="settings-rain-volume" type="range" min="0" max="1" step="0.01"></div>
            <label class="settings-toggle"><span>Mute rain</span><input id="settings-rain-muted" type="checkbox"></label>
        </fieldset>
        <fieldset class="settings-group"><legend>Mouse look</legend>
            <div class="settings-field"><div class="settings-field__heading"><label for="settings-horizontal">Horizontal sensitivity</label><output data-output="horizontal" for="settings-horizontal"></output></div>
            <input id="settings-horizontal" type="range" min="0.25" max="3" step="0.05"></div>
            <div class="settings-field"><div class="settings-field__heading"><label for="settings-vertical">Vertical sensitivity</label><output data-output="vertical" for="settings-vertical"></output></div>
            <input id="settings-vertical" type="range" min="0.25" max="3" step="0.05"></div>
        </fieldset>
        <fieldset class="settings-group"><legend>Weather</legend>
            <label class="settings-toggle"><span>Show rain visuals</span><input id="settings-show-rain" type="checkbox"></label>
            <p class="ui-dialog__note">Hiding visual rain does not change the audio.</p>
        </fieldset>
        <fieldset class="settings-group"><legend>Extras / The Restless Keep</legend>
            <p class="ui-dialog__note">Optional round-based survival. 100 HP, a pistol, wall weapons, and a random weapon chest. Combat is restricted to the connected ground-level courtyard and approach. Starting restarts the run.</p>
            <p class="ui-dialog__note">Left mouse: fire. R: reload. 1/2 or wheel: switch. E: purchase or accept. Escape: pause. Keyboard and mouse required.</p>
            <button class="start-menu__button start-menu__button--secondary" type="button" data-start-survival>START SURVIVAL</button>
            <button class="start-menu__button start-menu__button--secondary" type="button" data-exit-survival hidden>RETURN TO PORTFOLIO</button>
        </fieldset>
        <p class="ui-dialog__note">Settings apply immediately and last for this visit.</p>`;
    const input = (id: string): HTMLInputElement => {
        const element = content.querySelector<HTMLInputElement>(`#${id}`);
        if (!element) throw new Error(`Missing setting ${id}`); return element;
    };
    const output = (name: string): HTMLOutputElement => {
        const element = content.querySelector<HTMLOutputElement>(`[data-output="${name}"]`);
        if (!element) throw new Error(`Missing output ${name}`); return element;
    };
    const volume = input("settings-rain-volume"), muted = input("settings-rain-muted");
    const horizontal = input("settings-horizontal"), vertical = input("settings-vertical");
    const showRain = input("settings-show-rain");
    const volumeOutput = output("volume"), horizontalOutput = output("horizontal"), verticalOutput = output("vertical");
    const start = content.querySelector<HTMLButtonElement>("[data-start-survival]")!;
    const exit = content.querySelector<HTMLButtonElement>("[data-exit-survival]")!;
    start.addEventListener("click", () => { dialog.close(); window.dispatchEvent(new Event("portfolio:start-survival")); });
    exit.addEventListener("click", () => { dialog.close(); window.dispatchEvent(new Event("portfolio:exit-survival")); });
    function updateOutputs(): void {
        volumeOutput.value = `${Math.round(volume.valueAsNumber * 100)}%`;
        horizontalOutput.value = `${horizontal.valueAsNumber.toFixed(2)}×`;
        verticalOutput.value = `${vertical.valueAsNumber.toFixed(2)}×`;
        horizontal.setAttribute("aria-valuetext", horizontalOutput.value);
        vertical.setAttribute("aria-valuetext", verticalOutput.value);
    }
    function applyChanges(): void {
        updateOutputs();
        options.onChange({ rainVolume: volume.valueAsNumber, rainMuted: muted.checked,
            horizontalSensitivity: horizontal.valueAsNumber, verticalSensitivity: vertical.valueAsNumber, showRain: showRain.checked });
    }
    function refresh(): void {
        const settings = options.getSettings();
        volume.value = String(settings.rainVolume); muted.checked = settings.rainMuted;
        horizontal.value = String(settings.horizontalSensitivity); vertical.value = String(settings.verticalSensitivity);
        showRain.checked = settings.showRain;
        const active = document.body.dataset.experienceMode === "survival";
        start.textContent = active ? "RESTART SURVIVAL" : "START SURVIVAL";
        exit.hidden = !active; exit.style.display = active ? "" : "none";
        updateOutputs();
    }
    for (const element of [volume, horizontal, vertical]) element.addEventListener("input", applyChanges);
    for (const element of [muted, showRain]) element.addEventListener("change", applyChanges);
    refresh();
    return { dialog, refresh };
}
