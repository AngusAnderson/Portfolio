export type Enemy = {
    id: number; x: number; y: number; hp: number; maximum: number;
    attackWindup: number; attackCooldown: number; hurt: number;
    deadTime: number; walkPhase: number; stuckTime: number;
    lastX: number; lastY: number;
};
