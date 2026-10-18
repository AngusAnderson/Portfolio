export class WallTexture {
	public readonly image: HTMLImageElement;
	public loaded: boolean = false;

	constructor(source: string) {
		this.image = new Image();

		this.image.onload = () => {
			this.loaded = true;
		};

		this.image.onerror = () => {
			console.error(
				"Could not load the wall texture:",
				this.image.src
			);
		};

		this.image.src = source;
	}
}