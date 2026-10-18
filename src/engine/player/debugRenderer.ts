import type { PlayerState } from "./types";

export function renderPlayerDebug(
	context: CanvasRenderingContext2D,
	player: PlayerState
): void {
	context.fillStyle = "#ff0000";
	context.strokeStyle = "#ff0000";
	context.lineWidth = 2;

	context.beginPath();

	context.arc(
		player.x,
		player.y,
		player.radius,
		0,
		Math.PI * 2
	);

	context.fill();

	context.beginPath();
	context.moveTo(player.x, player.y);

	context.lineTo(
		player.x + Math.cos(player.rotationAngle) * 50,
		player.y + Math.sin(player.rotationAngle) * 50
	);

	context.stroke();
}