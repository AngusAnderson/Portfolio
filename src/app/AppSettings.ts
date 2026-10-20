import type { Player } from "../engine/player";
import type { RainAudio } from "../engine/audio";
import type { UISettings } from "../ui/settingsPanel";

const DEFAULT_HORIZONTAL_SENSITIVITY = 0.003;
const DEFAULT_VERTICAL_SENSITIVITY = 0.002;

export class AppSettings {
    private readonly player: Player;
    private readonly rainAudio: RainAudio;

    private rainVisible = true;

    constructor(
        player: Player,
        rainAudio: RainAudio
    ) {
        this.player = player;
        this.rainAudio = rainAudio;
    }

    public get showRain(): boolean {
        return this.rainVisible;
    }

    public getSettings(): UISettings {
        return {
            rainVolume: this.rainAudio.volume,
            rainMuted: this.rainAudio.isMuted,

            horizontalSensitivity:
                this.player.mouseSensitivity /
                DEFAULT_HORIZONTAL_SENSITIVITY,

            verticalSensitivity:
                this.player.pitchSensitivity /
                DEFAULT_VERTICAL_SENSITIVITY,

            showRain: this.rainVisible,
        };
    }

    public apply(settings: UISettings): void {
        this.rainAudio.setVolume(settings.rainVolume);
        this.rainAudio.setMuted(settings.rainMuted);

        this.player.mouseSensitivity =
            DEFAULT_HORIZONTAL_SENSITIVITY *
            settings.horizontalSensitivity;

        this.player.pitchSensitivity =
            DEFAULT_VERTICAL_SENSITIVITY *
            settings.verticalSensitivity;

        this.rainVisible = settings.showRain;
    }
}