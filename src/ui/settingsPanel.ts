import { createMenuDialog } from "./menuDialog";

export type UISettings = {
    rainVolume: number;
    rainMuted: boolean;

    horizontalSensitivity: number;
    verticalSensitivity: number;

    showRain: boolean;
};

export type SettingsPanelOptions = {
    getSettings: () => UISettings;
    onChange: (settings: UISettings) => void;
};

export type SettingsPanel = {
    dialog: HTMLDialogElement;
    refresh: () => void;
};

export function createSettingsPanel(
    options: SettingsPanelOptions
): SettingsPanel {
    const { dialog, content } = createMenuDialog(
        "settings-panel",
        "Settings",
        "Make yourself comfortable."
    );

    content.innerHTML = `
        <fieldset class="settings-group">
            <legend>Audio</legend>

            <div class="settings-field">
                <div class="settings-field__heading">
                    <label for="settings-rain-volume">
                        Rain volume
                    </label>

                    <output
                        for="settings-rain-volume"
                        data-output="volume"
                    ></output>
                </div>

                <input
                    id="settings-rain-volume"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                >
            </div>

            <label class="settings-toggle">
                <span>Mute rain</span>

                <input
                    id="settings-rain-muted"
                    type="checkbox"
                >
            </label>
        </fieldset>

        <fieldset class="settings-group">
            <legend>Mouse look</legend>

            <div class="settings-field">
                <div class="settings-field__heading">
                    <label for="settings-horizontal">
                        Horizontal sensitivity
                    </label>

                    <output
                        for="settings-horizontal"
                        data-output="horizontal"
                    ></output>
                </div>

                <input
                    id="settings-horizontal"
                    type="range"
                    min="0.25"
                    max="3"
                    step="0.05"
                >
            </div>

            <div class="settings-field">
                <div class="settings-field__heading">
                    <label for="settings-vertical">
                        Vertical sensitivity
                    </label>

                    <output
                        for="settings-vertical"
                        data-output="vertical"
                    ></output>
                </div>

                <input
                    id="settings-vertical"
                    type="range"
                    min="0.25"
                    max="3"
                    step="0.05"
                >
            </div>
        </fieldset>

        <fieldset class="settings-group">
            <legend>Weather</legend>

            <label class="settings-toggle">
                <span>Show rain visuals</span>

                <input
                    id="settings-show-rain"
                    type="checkbox"
                >
            </label>

            <p class="ui-dialog__note">
                Hiding visual rain does not change the audio.
            </p>
        </fieldset>

        <p class="ui-dialog__note">
            Changes apply immediately and last for this visit.
        </p>
    `;

    function getInput(id: string): HTMLInputElement {
        const input =
            content.querySelector<HTMLInputElement>(`#${id}`);

        if (!input) {
            throw new Error(
                `Could not find settings input #${id}`
            );
        }

        return input;
    }

    function getOutput(name: string): HTMLOutputElement {
        const output =
            content.querySelector<HTMLOutputElement>(
                `[data-output="${name}"]`
            );

        if (!output) {
            throw new Error(
                `Could not find settings output "${name}"`
            );
        }

        return output;
    }

    const volume = getInput("settings-rain-volume");
    const muted = getInput("settings-rain-muted");

    const horizontal = getInput("settings-horizontal");
    const vertical = getInput("settings-vertical");

    const showRain = getInput("settings-show-rain");

    const volumeOutput = getOutput("volume");
    const horizontalOutput = getOutput("horizontal");
    const verticalOutput = getOutput("vertical");

    function updateOutputs(): void {
        volumeOutput.value =
            `${Math.round(volume.valueAsNumber * 100)}%`;

        horizontalOutput.value =
            `${horizontal.valueAsNumber.toFixed(2)}×`;

        verticalOutput.value =
            `${vertical.valueAsNumber.toFixed(2)}×`;

        horizontal.setAttribute(
            "aria-valuetext",
            horizontalOutput.value
        );

        vertical.setAttribute(
            "aria-valuetext",
            verticalOutput.value
        );
    }

    function applyChanges(): void {
        updateOutputs();

        options.onChange({
            rainVolume: volume.valueAsNumber,
            rainMuted: muted.checked,

            horizontalSensitivity: horizontal.valueAsNumber,
            verticalSensitivity: vertical.valueAsNumber,

            showRain: showRain.checked,
        });
    }

    function refresh(): void {
        const settings = options.getSettings();

        volume.value = String(settings.rainVolume);
        muted.checked = settings.rainMuted;

        horizontal.value =
            String(settings.horizontalSensitivity);

        vertical.value =
            String(settings.verticalSensitivity);

        showRain.checked = settings.showRain;

        updateOutputs();
    }

    for (const input of [volume, horizontal, vertical]) {
        input.addEventListener("input", applyChanges);
    }

    for (const input of [muted, showRain]) {
        input.addEventListener("change", applyChanges);
    }

    refresh();

    return {
        dialog,
        refresh,
    };
}