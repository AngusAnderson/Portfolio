import {
    WINDOW_HEIGHT,
    WINDOW_WIDTH,
} from "../settings";

export type GameCanvas = {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
};

export function createGameCanvas(): GameCanvas {
    const canvas =
        document.querySelector<HTMLCanvasElement>("#game");

    if (!canvas) {
        throw new Error(
            "Could not find the #game canvas element"
        );
    }

    const context = canvas.getContext("2d");

    if (!context) {
        throw new Error(
            "Could not get a 2D canvas rendering context"
        );
    }

    canvas.width = WINDOW_WIDTH;
    canvas.height = WINDOW_HEIGHT;

    return {
        canvas,
        context,
    };
}