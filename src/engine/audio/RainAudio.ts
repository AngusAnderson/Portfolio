import type { EnvironmentState } from "../environment";

import {
    INDOOR_OPENINGS,
    RAIN_CONFIG,
} from "./rainConfig"

type ListenerPosition = {
    x: number;
    y: number;
};

type RainProfile = {
    gain: number;
    cutoff: number;
};

export class RainAudio {
    private context: AudioContext | null = null;

    private filter: BiquadFilterNode | null = null;
    private environmentGain: GainNode | null = null;
    private masterGain: GainNode | null = null;

    private source: AudioBufferSourceNode | null = null;
    private bufferPromise: Promise<AudioBuffer> | null = null;

    private masterVolume = RAIN_CONFIG.initialMasterVolume;

    private muted = false;

    private targetGain: number = RAIN_CONFIG.outdoor.gain;
    private targetCutoff: number = RAIN_CONFIG.outdoor.cutoff;

    private appliedGain: number | null = null;
    private appliedCutoff: number | null = null;

    private readonly selectedSource: string;

    public get isMuted(): boolean {
        return this.muted;
    }

    public get volume(): number {
        return this.masterVolume;
    }

    constructor() {
		const sources = RAIN_CONFIG.sources;

		const index = Math.floor(
			Math.random() * sources.length
		);

		const selectedSource = sources[index];

		if (!selectedSource) {
			throw new Error(
				"No rain audio sources are configured"
			);
		}

		this.selectedSource = selectedSource;
	}

    public async start(): Promise<void> {
        const context = this.ensureContext();

        const resumePromise = context.resume();
        const bufferPromise = this.loadBuffer(context);
        
        const [, buffer] = await Promise.all([
            resumePromise,
            bufferPromise,
        ]);

        // Prevents overlapping rain loops
        if (this.source) {
            return;
        }

        const filter = this.filter;

        if(!filter) {
            throw new Error('Rain audio filter is unavaliable :(')
        }

        const source = context.createBufferSource();

        source.buffer = buffer;
        source.loop = true;

        source.connect(filter);

        filter.frequency.setValueAtTime(
            this.safeCutoff(this.targetCutoff, context),
            context.currentTime
        );

        this.appliedCutoff = this.targetCutoff;

        this.source = source;

        source.start();

        this.appliedGain = null;
        this.applyEnvironment();
    }

    public update(
        environment: Readonly<EnvironmentState>,
        position: ListenerPosition
    ): void {
        const profile = this.getProfile(environment, position);

        this.targetGain = profile.gain;
        this.targetCutoff = profile.cutoff;

        this.applyEnvironment();
    }

    public setMuted(muted: boolean): void {
        this.muted = muted;
        this.applyMasterVolume();
    }

    public setVolume(volume: number): void {
		if (!Number.isFinite(volume)) {
			return;
		}

		this.masterVolume = Math.max(
			0,
			Math.min(1, volume)
		);

		this.applyMasterVolume();
	}

    public async setPageVisible(visible: boolean): Promise<void> {
        if (!this.context) {
            return;
        }

        if (!visible) {
            await this.context.suspend();
            return;
        }

        if (this.source) {
            await this.context.resume();
        }
    }

    private ensureContext(): AudioContext {
        if (this.context) {
            return this.context
        }

        const context = new AudioContext();

        const filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = 0.7;

        const environmentGain = context.createGain();

        environmentGain.gain.value = 0;

        const masterGain = context.createGain();

        masterGain.gain.value = this.muted ? 0 : this.masterVolume;

        filter
            .connect(environmentGain)
            .connect(masterGain)
            .connect(context.destination);

        this.context = context;
        this.filter = filter;
        this.environmentGain = environmentGain;
        this.masterGain = masterGain;

        return context;
    }

    private loadBuffer(context: AudioContext): Promise<AudioBuffer> {
        if (!this.bufferPromise) {
            this.bufferPromise = this.fetchBuffer(context).catch(
                (error: unknown) => {
                    this.bufferPromise = null;
                    throw error;
                }
            );
        }

        return this.bufferPromise;
    }
    
    private async fetchBuffer(context: AudioContext): Promise<AudioBuffer> {
        const response = await fetch(this.selectedSource);

        if (!response.ok) {
            throw new Error(`Rain auio request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.arrayBuffer();

        return context.decodeAudioData(data);
    }

    private getProfile(
        environment: Readonly<EnvironmentState>,
        position: ListenerPosition
    ): RainProfile {
        if (environment.indoors) {
            const opening = INDOOR_OPENINGS[environment.zoneId];

            let progress = -1;

            if (opening) {
                const distance = Math.hypot(position.x - opening.x, position.y - opening.y);
                progress = Math.max(0, Math.min(1, distance / opening.fadeDistance));
            }

            const falloff = progress * progress * (3-2 * progress);

            return {
                gain: this.lerp(
                    RAIN_CONFIG.indoor.nearGain,
                    RAIN_CONFIG.indoor.farGain,
                    falloff
                ),
                cutoff: this.lerp(
                    RAIN_CONFIG.indoor.nearCutoff,
                    RAIN_CONFIG.indoor.farCutoff,
                    falloff
                )
            };
        }

        if (environment.sheltered) {
            return {
                gain: RAIN_CONFIG.shelteredOutdoor.gain,
                cutoff: RAIN_CONFIG.shelteredOutdoor.cutoff
            };
        }

        return {
            gain: RAIN_CONFIG.outdoor.gain,
            cutoff: RAIN_CONFIG.outdoor.cutoff
        };
    }

    private applyEnvironment(): void {
        const context = this.context;
        const environmentGain = this.environmentGain;
        const filter = this.filter;

        if (!context || !environmentGain || !filter) {
            return;
        }

        const now = context.currentTime;

        if (
            this.appliedGain === null ||
            Math.abs(this.targetGain - this.appliedGain) > 0.002
        ) {
            environmentGain.gain.setTargetAtTime(
                this.targetGain,
                now,
                RAIN_CONFIG.TransitionTime
            );

            this.appliedGain = this.targetGain;
        }

        if (
            this.appliedCutoff === null ||
            Math.abs(this.targetCutoff - this.appliedCutoff) > 20
        ) {
            filter.frequency.setTargetAtTime(
                this.safeCutoff(this.targetCutoff, context),
                now,
                RAIN_CONFIG.TransitionTime
            );

            this.appliedCutoff = this.targetCutoff;
        }
    }

    private applyMasterVolume(): void {
        if (!this.context || !this.masterGain) {
            return;
        }

        const target = this.muted ? 0 : this.masterVolume;

        this.masterGain.gain.setTargetAtTime(
            target,
            this.context.currentTime,
            0.05
        );
    }

    private safeCutoff(
        frequency: number,
        context: AudioContext
    ): number {
        return Math.max(20, Math.min(frequency, context.sampleRate / 2));
    }

    private lerp(
        start: number,
        end: number,
        amount: number
    ): number {
        return start + (end - start) * amount;
    }
}