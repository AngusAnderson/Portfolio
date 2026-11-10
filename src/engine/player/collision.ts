import type { GameMap } from "../map";
import type { PlayerState } from "./types";
import { isPropFootprintBlocked } from "../props/definitions";

export function canMoveTo(
    player: PlayerState, x: number, y: number, map: GameMap,
    maxStepHeight: number, groundTolerance: number
): boolean {
    const radius = player.radius;
    const clearOfWalls =
        map.hasWallAt(x - radius, y - radius) === 0 &&
        map.hasWallAt(x + radius, y - radius) === 0 &&
        map.hasWallAt(x - radius, y + radius) === 0 &&
        map.hasWallAt(x + radius, y + radius) === 0;
    if (!clearOfWalls) return false;
    const allowedRise = player.grounded ? maxStepHeight : groundTolerance;
    const support = map.getSupportHeightAt(x, y, player.elevation, allowedRise);
    if (support > player.elevation + allowedRise) return false;
    let feet = player.elevation;
    if (player.grounded && Math.abs(support - player.elevation) <= maxStepHeight) feet = support;
    const head = feet + player.bodyHeight;
    if (map.usesCastleProps && isPropFootprintBlocked(x, y, radius, feet, head, groundTolerance)) return false;
    for (const platform of map.getSuspendedPlatformsAt(x, y)) {
        if (feet < platform.topHeight - groundTolerance && head > platform.bottomHeight + groundTolerance) return false;
    }
    return true;
}
