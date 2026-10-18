import { TILESIZE, WINDOW_HEIGHT } from "../../settings";
import type { Player } from "../player";
import type { CameraState } from "./types";

export function getHorizonY(
	pitch: number,
	projectionDistance: number
): number {
	const pitchOffset = Math.tan(pitch) * projectionDistance;

	return WINDOW_HEIGHT / 2 + pitchOffset;
}

export function createCameraState(
	player: Player,
	projectionDistance: number
): CameraState {
	return {
		x: player.x,
		y: player.y,
		rotationAngle: player.rotationAngle,
		cameraHeight: TILESIZE / 2 + player.elevation,
		horizonY: getHorizonY(player.pitch, projectionDistance),
		projectionDistance,
	};
}

export function projectHeight(
	worldHeight: number,
	distance: number,
	camera: CameraState
): number {
	return (
		camera.horizonY -
		((worldHeight - camera.cameraHeight) / distance) *
			camera.projectionDistance
	);
}