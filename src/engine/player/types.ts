export interface PlayerState {
	x: number;
	y: number;
	radius: number;

	turnDirection: number;
	moveDirection: number;
	strafeDirection: number;
	rotationAngle: number;

	moveSpeed: number;
	rotationSpeed: number;

	jumpHeight: number;
	elevation: number;
	grounded: boolean;
	bodyHeight: number;

	mouseSensitivity: number;
	pitch: number;
	pitchSensitivity: number;
	maxPitch: number;
}