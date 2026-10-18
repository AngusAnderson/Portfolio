export type WallSegment = {
	entryDistance: number;
	exitDistance: number;
	height: number;
	texturePosition: number;
	verticalSide: boolean;
};

export type SurfaceHit = {
	distance: number;
	x: number;
	y: number;
	isTop: boolean;
};

export type CameraState = {
	x: number;
	y: number;
	rotationAngle: number;
	cameraHeight: number;
	horizonY: number;
	projectionDistance: number;
};