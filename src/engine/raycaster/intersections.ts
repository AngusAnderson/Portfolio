import type { Ramp, SuspendedPlatform } from "../map";
import type { CameraState, SurfaceHit } from "./types";

export function intersectRamp(
	ramp: Ramp,
	directionX: number,
	directionY: number,
	directionZ: number,
	camera: CameraState
): SurfaceHit | null {
	const epsilon = 0.000001;

	if (ramp.width <= 0 || ramp.depth <= 0) {
		return null;
	}

	const rise = ramp.endHeight - ramp.startHeight;

	let slopeX = 0;
	let slopeY = 0;
	let cornerHeight = ramp.startHeight;

	switch (ramp.direction) {
		case "north":
			slopeY = -rise / ramp.depth;
			cornerHeight = ramp.endHeight;
			break;

		case "south":
			slopeY = rise / ramp.depth;
			break;

		case "east":
			slopeX = rise / ramp.width;
			break;

		case "west":
			slopeX = -rise / ramp.width;
			cornerHeight = ramp.endHeight;
			break;
	}

	const minX = ramp.x;
	const maxX = ramp.x + ramp.width;
	const minY = ramp.y;
	const maxY = ramp.y + ramp.depth;

	let nearest: SurfaceHit | null = null;

	const considerHit = (
		distance: number,
		isTop: boolean
	): void => {
		if (
			!Number.isFinite(distance) ||
			distance <= epsilon
		) {
			return;
		}

		const x = camera.x + directionX * distance;
		const y = camera.y + directionY * distance;

		if (
			x < minX - epsilon ||
			x > maxX + epsilon ||
			y < minY - epsilon ||
			y > maxY + epsilon
		) {
			return;
		}

		const z =
			camera.cameraHeight + directionZ * distance;

		const surfaceHeight =
			cornerHeight +
			slopeX * (x - ramp.x) +
			slopeY * (y - ramp.y);

		if (!isTop) {
			if (
				z < -epsilon ||
				z > surfaceHeight + epsilon
			) {
				return;
			}
		}

		if (!nearest || distance < nearest.distance) {
			nearest = {
				distance,
				x,
				y,
				isTop,
			};
		}
	};

	const denominator =
		directionZ -
		slopeX * directionX -
		slopeY * directionY;

	if (Math.abs(denominator) > epsilon) {
		const heightAtCameraXY =
			cornerHeight +
			slopeX * (camera.x - ramp.x) +
			slopeY * (camera.y - ramp.y);

		const distance =
			(heightAtCameraXY - camera.cameraHeight) /
			denominator;

		considerHit(distance, true);
	}

	if (Math.abs(directionX) > epsilon) {
		considerHit(
			(minX - camera.x) / directionX,
			false
		);

		considerHit(
			(maxX - camera.x) / directionX,
			false
		);
	}

	if (Math.abs(directionY) > epsilon) {
		considerHit(
			(minY - camera.y) / directionY,
			false
		);

		considerHit(
			(maxY - camera.y) / directionY,
			false
		);
	}

	return nearest;
}

export function intersectSuspendedPlatform(
	platform: SuspendedPlatform,
	directionX: number,
	directionY: number,
	directionZ: number,
	camera: CameraState
): SurfaceHit | null {
	const epsilon = 0.000001;

	if (
		platform.width <= 0 ||
		platform.depth <= 0 ||
		platform.topHeight <= platform.bottomHeight
	) {
		return null;
	}

	const origins = [
		camera.x,
		camera.y,
		camera.cameraHeight,
	];

	const directions = [
		directionX,
		directionY,
		directionZ,
	];

	const minimums = [
		platform.x,
		platform.y,
		platform.bottomHeight,
	];

	const maximums = [
		platform.x + platform.width,
		platform.y + platform.depth,
		platform.topHeight,
	];

	let entryDistance = -Infinity;
	let exitDistance = Infinity;

	for (let axis = 0; axis < 3; axis++) {
		const origin = origins[axis]!;
		const direction = directions[axis]!;
		const minimum = minimums[axis]!;
		const maximum = maximums[axis]!;

		if (Math.abs(direction) < epsilon) {
			if (origin < minimum || origin > maximum) {
				return null;
			}

			continue;
		}

		const first = (minimum - origin) / direction;
		const second = (maximum - origin) / direction;

		const near = Math.min(first, second);
		const far = Math.max(first, second);

		entryDistance = Math.max(entryDistance, near);
		exitDistance = Math.min(exitDistance, far);

		if (entryDistance > exitDistance) {
			return null;
		}
	}

	if (exitDistance <= epsilon) {
		return null;
	}

	const distance = entryDistance > epsilon
		? entryDistance
		: exitDistance;

	if (!Number.isFinite(distance)) {
		return null;
	}

	const hitZ =
		camera.cameraHeight + directionZ * distance;

	return {
		distance,
		x: camera.x + directionX * distance,
		y: camera.y + directionY * distance,
		isTop:
			Math.abs(hitZ - platform.topHeight) < 0.001,
	};
}