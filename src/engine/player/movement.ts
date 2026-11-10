import type { GameMap } from "../map";
import { canMoveTo } from "./collision";
import type { PlayerPhysics } from "./physics";
import type { PlayerState } from "./types";

export function updateMovement(player: PlayerState, map: GameMap, physics: PlayerPhysics): void {
    player.rotationAngle += player.turnDirection * player.rotationSpeed;
    const fullTurn = Math.PI * 2;
    player.rotationAngle = ((player.rotationAngle % fullTurn) + fullTurn) % fullTurn;
    const moveStep = player.moveDirection * player.moveSpeed;
    const strafeStep = player.strafeDirection * player.moveSpeed;

    const move = (dx: number, dy: number): void => {
        const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
        const stepX = dx / steps;
        const stepY = dy / steps;
        for (let step = 0; step < steps; step++) {
            const nextX = player.x + stepX;
            if (canMoveTo(player, nextX, player.y, map, physics.maxStepHeight, physics.groundTolerance)) {
                player.x = nextX;
                physics.followGround(player, map);
            }
            const nextY = player.y + stepY;
            if (canMoveTo(player, player.x, nextY, map, physics.maxStepHeight, physics.groundTolerance)) {
                player.y = nextY;
                physics.followGround(player, map);
            }
        }
    };

    move(Math.cos(player.rotationAngle) * moveStep, Math.sin(player.rotationAngle) * moveStep);
    move(Math.cos(player.rotationAngle + Math.PI / 2) * strafeStep, Math.sin(player.rotationAngle + Math.PI / 2) * strafeStep);
}
