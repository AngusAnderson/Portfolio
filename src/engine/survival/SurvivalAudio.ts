import { TILESIZE } from "../../settings";

export type EnemySound = "groan" | "attack" | "hurt" | "death";
type Listener = { x: number; y: number; rotationAngle: number; elevation: number; };
type SoundEnemy = { id: number; x: number; y: number; hp: number; };
type Position = { x: number; y: number; };
type Volumes = { music: number; effects: number; };
type Voice = {
    source: AudioBufferSourceNode; gain: GainNode; pan: StereoPannerNode;
    filter: BiquadFilterNode; position: Position; kind: EnemySound;
    done: boolean;
};

const BASE = `${import.meta.env.BASE_URL}assets/audio/survival/`;
const STORAGE = "portfolio-survival-audio";
const EVENT = "portfolio:survival-audio";
const DEFAULTS: Volumes = { music: 0.22, effects: 0.65 };

export const SURVIVAL_AUDIO_ASSETS = {
    music: `${BASE}music/survival-theme.mp3`,
    groan: [`${BASE}enemies/groan-1.wav`, `${BASE}enemies/groan-2.wav`],
    attack: [`${BASE}enemies/attack-1.wav`],
    hurt: [`${BASE}enemies/hurt-1.wav`],
    death: [`${BASE}enemies/death-1.wav`],
};

function volume(value: unknown, fallback: number): number {
    return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
}
function readVolumes(): Volumes {
    try {
        const value = JSON.parse(localStorage.getItem(STORAGE) ?? "null") as Partial<Volumes> | null;
        return { music: volume(value?.music, DEFAULTS.music), effects: volume(value?.effects, DEFAULTS.effects) };
    } catch { return { ...DEFAULTS }; }
}

export function createSurvivalAudioSettings(): HTMLFieldSetElement {
    const fieldset = document.createElement("fieldset");
    fieldset.className = "settings-group";
    const legend = document.createElement("legend"); legend.textContent = "Survival audio";
    fieldset.append(legend);
    const settings = readVolumes();
    for (const [key, label] of [["music", "Music volume"], ["effects", "Enemy effects volume"]] as const) {
        const field = document.createElement("div"); field.className = "settings-field";
        const heading = document.createElement("div"); heading.className = "settings-field__heading";
        const text = document.createElement("label"); text.htmlFor = `survival-volume-${key}`; text.textContent = label;
        const output = document.createElement("output"); output.setAttribute("for", `survival-volume-${key}`);
        const input = document.createElement("input"); input.type = "range"; input.min = "0"; input.max = "1"; input.step = "0.01";
        input.id = `survival-volume-${key}`; input.value = String(settings[key]);
        output.value = `${Math.round(settings[key] * 100)}%`;
        input.addEventListener("input", () => {
            settings[key] = volume(input.valueAsNumber, DEFAULTS[key]);
            output.value = `${Math.round(settings[key] * 100)}%`;
            input.setAttribute("aria-valuetext", output.value);
            try { localStorage.setItem(STORAGE, JSON.stringify(settings)); } catch { }
            window.dispatchEvent(new CustomEvent(EVENT, { detail: { ...settings } }));
        });
        heading.append(text, output); field.append(heading, input); fieldset.append(field);
    }
    const note = document.createElement("p"); note.className = "ui-dialog__note";
    note.textContent = "These controls affect survival only. Set either slider to zero to mute it. Preferences are saved on this browser.";
    fieldset.append(note); return fieldset;
}

export class SurvivalAudio {
    private context: AudioContext | null = null;
    private readonly music = new Audio();
    private musicGain: GainNode | null = null;
    private effectsGain: GainNode | null = null;
    private readonly buffers = new Map<EnemySound, AudioBuffer[]>();
    private readonly voices = new Set<Voice>();
    private readonly cooldowns = new Map<string, number>();
    private readonly nextGroan = new Map<number, number>();
    private loads: Promise<void> | null = null;
    private volumes = readVolumes();
    private listener: Listener = { x: 0, y: 0, rotationAngle: 0, elevation: 0 };
    private active = false;
    private playing = false;
    private clock = 0;
    private spatialTimer = 0;
    private musicRequest = 0;
    private warned = false;
    private readonly blocked: (listener: Listener, source: Position) => boolean;

    constructor(blocked: (listener: Listener, source: Position) => boolean = () => false) {
        this.blocked = blocked;
        this.music.loop = true; this.music.preload = "auto";
        this.music.addEventListener("error", () => console.warn("Survival music could not load:", SURVIVAL_AUDIO_ASSETS.music));
        window.addEventListener(EVENT, this.onVolumeChange);
        window.addEventListener("pointerdown", this.onGesture, { capture: true });
        window.addEventListener("keydown", this.onGesture, { capture: true });
        window.addEventListener("blur", this.onBlur);
        document.addEventListener("visibilitychange", this.onVisibility);
    }
    private readonly onVolumeChange = (event: Event): void => {
        if (!(event instanceof CustomEvent)) return;
        const detail = event.detail as Partial<Volumes> | null;
        this.volumes = { music: volume(detail?.music, DEFAULTS.music), effects: volume(detail?.effects, DEFAULTS.effects) };
        this.applyVolumes();
    };
    private readonly onGesture = (): void => {
        if (!this.active) return;
        this.unlock();
        if (this.playing && this.music.paused) this.startMusic();
    };
    private readonly onBlur = (): void => { this.setPlaying(false); };
    private readonly onVisibility = (): void => { if (document.hidden) this.setPlaying(false); };

    public begin(): void {
        this.stop(); this.active = true; this.clock = 0; this.warned = false;
        this.volumes = readVolumes(); this.unlock();
        const context = this.context;
        if (context) this.loads ??= this.loadEffects(context);
    }
    private unlock(): void {
        if (!this.context) {
            if (typeof AudioContext === "undefined") return;
            try {
                const context = new AudioContext(); this.context = context;
                this.musicGain = context.createGain(); this.effectsGain = context.createGain();
                this.musicGain.gain.value = this.volumes.music; this.effectsGain.gain.value = this.volumes.effects;
                const compressor = context.createDynamicsCompressor();
                compressor.threshold.value = -12; compressor.knee.value = 20; compressor.ratio.value = 4;
                this.musicGain.connect(compressor); this.effectsGain.connect(compressor); compressor.connect(context.destination);
                const track = context.createMediaElementSource(this.music); track.connect(this.musicGain);
                this.music.src = SURVIVAL_AUDIO_ASSETS.music;
                this.applyVolumes();
            } catch (error: unknown) { console.warn("Survival audio is unavailable:", error); return; }
        }
        const context = this.context;
        if (!context) return;
        this.loads ??= this.loadEffects(context);
        if (context.state === "suspended") void context.resume().catch((error: unknown) => {
            if (!this.warned) { this.warned = true; console.warn("Click Resume to enable survival audio.", error); }
        });
    }
    private applyVolumes(): void {
        const context = this.context; if (!context) return;
        this.musicGain?.gain.setTargetAtTime(this.volumes.music, context.currentTime, 0.04);
        this.effectsGain?.gain.setTargetAtTime(this.volumes.effects, context.currentTime, 0.04);
    }
    private async loadEffects(context: AudioContext): Promise<void> {
        const kinds: EnemySound[] = ["groan", "attack", "hurt", "death"];
        await Promise.all(kinds.map(async kind => {
            const decoded = await Promise.all(SURVIVAL_AUDIO_ASSETS[kind].map(async url => {
                try {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    return await context.decodeAudioData(await response.arrayBuffer());
                } catch (error: unknown) { console.warn(`Could not load survival sound: ${url}`, error); return null; }
            }));
            this.buffers.set(kind, decoded.filter((buffer): buffer is AudioBuffer => buffer !== null));
        }));
    }
    public setPlaying(value: boolean): void {
        const next = value && this.active && !document.hidden && document.hasFocus();
        if (next === this.playing) return;
        this.playing = next;
        this.musicRequest++;
        if (!next) { this.music.pause(); this.stopVoices(); return; }
        this.startMusic();
    }
    private startMusic(): void {
        if (!this.context || !this.active || !this.playing) return;
        const request = ++this.musicRequest;
        void this.music.play().then(() => {
            if (!this.active || !this.playing) this.music.pause();
        }).catch((error: unknown) => {
            if (request === this.musicRequest && !this.warned) { this.warned = true; console.warn("Survival music did not start. Check the file and browser audio permission.", error); }
        });
    }
    public update(listener: Listener, enemies: readonly SoundEnemy[], dt: number): void {
        this.listener = { x: listener.x, y: listener.y, elevation: listener.elevation, rotationAngle: listener.rotationAngle };
        if (!this.active || !this.playing) return;
        this.clock += dt;
        const living = new Set<number>();
        for (const enemy of enemies) {
            if (enemy.hp <= 0) continue;
            living.add(enemy.id);
            const next = this.nextGroan.get(enemy.id);
            if (next === undefined) { this.nextGroan.set(enemy.id, this.clock + 1 + Math.random() * 5); continue; }
            if (this.clock >= next) {
                this.enemy("groan", enemy);
                this.nextGroan.set(enemy.id, this.clock + 4 + Math.random() * 6);
            }
        }
        for (const id of this.nextGroan.keys()) if (!living.has(id)) this.nextGroan.delete(id);
        for (const [key, expires] of this.cooldowns) if (expires < this.clock - 2) this.cooldowns.delete(key);
        this.spatialTimer -= dt;
        if (this.spatialTimer <= 0) {
            for (const voice of this.voices) this.positionVoice(voice);
            this.spatialTimer = 0.15;
        }
    }
    public enemy(kind: EnemySound, enemy: { id: number; x: number; y: number }): void {
        const context = this.context, effects = this.effectsGain;
        if (!this.active || !this.playing || !context || !effects || this.volumes.effects <= 0 || context.state !== "running") return;
        const distance = Math.hypot(enemy.x - this.listener.x, enemy.y - this.listener.y);
        if (distance > TILESIZE * 14) return;
        const buffers = this.buffers.get(kind); if (!buffers?.length) return;
        const key = `${enemy.id}:${kind}`;
        if ((this.cooldowns.get(key) ?? 0) > this.clock) return;
        if (this.voices.size >= 4) {
            if (kind === "groan") return;
            const oldest = [...this.voices].find(voice => voice.kind === "groan") ?? this.voices.values().next().value;
            if (oldest) this.stopVoice(oldest);
        }
        this.cooldowns.set(key, this.clock + (kind === "hurt" ? 0.2 : kind === "attack" ? 0.7 : 1));
        const source = context.createBufferSource();
        source.buffer = buffers[Math.floor(Math.random() * buffers.length)]!;
        source.playbackRate.value = 0.94 + Math.random() * 0.12;
        const gain = context.createGain(), pan = context.createStereoPanner(), filter = context.createBiquadFilter();
        gain.gain.value = 0;
        filter.type = "lowpass";
        source.connect(filter); filter.connect(gain); gain.connect(pan); pan.connect(effects);
        const voice: Voice = { source, gain, pan, filter, position: enemy, kind, done: false };
        source.onended = () => this.finishVoice(voice);
        this.voices.add(voice); this.positionVoice(voice);
        source.start();
    }
    private positionVoice(voice: Voice): void {
        const context = this.context; if (!context || voice.done) return;
        const dx = voice.position.x - this.listener.x, dy = voice.position.y - this.listener.y;
        const distance = Math.hypot(dx, dy);
        const pan = distance < 0.01 ? 0 : (-Math.sin(this.listener.rotationAngle) * dx + Math.cos(this.listener.rotationAngle) * dy) / distance;
        const obscured = this.blocked(this.listener, voice.position);
        const attenuation = distance > TILESIZE * 14 ? 0 : 1 / (1 + (distance / (TILESIZE * 3)) ** 2);
        const level = voice.kind === "groan" ? 0.65 : voice.kind === "death" ? 0.8 : 0.9;
        voice.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), context.currentTime, 0.04);
        voice.gain.gain.setTargetAtTime(attenuation * level * (obscured ? 0.45 : 1), context.currentTime, 0.04);
        voice.filter.frequency.setTargetAtTime(obscured ? 950 : 7500, context.currentTime, 0.04);
    }
    private finishVoice(voice: Voice): void {
        if (voice.done) return;
        voice.done = true; this.voices.delete(voice);
        voice.source.disconnect(); voice.filter.disconnect(); voice.gain.disconnect(); voice.pan.disconnect();
    }
    private stopVoice(voice: Voice): void {
        try { voice.source.stop(); } catch { }
        this.finishVoice(voice);
    }
    private stopVoices(): void { for (const voice of [...this.voices]) this.stopVoice(voice); }
    public stop(): void {
        this.active = false; this.playing = false; this.musicRequest++;
        this.music.pause(); try { this.music.currentTime = 0; } catch { }
        this.stopVoices(); this.cooldowns.clear(); this.nextGroan.clear();
    }
    public dispose(): void {
        this.stop();
        window.removeEventListener(EVENT, this.onVolumeChange);
        window.removeEventListener("pointerdown", this.onGesture, { capture: true });
        window.removeEventListener("keydown", this.onGesture, { capture: true });
        window.removeEventListener("blur", this.onBlur);
        document.removeEventListener("visibilitychange", this.onVisibility);
        if (this.context) void this.context.close();
        this.music.removeAttribute("src"); this.music.load();
    }
}
