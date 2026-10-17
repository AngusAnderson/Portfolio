export const TILESIZE = 32;

// Dimensions of the map
export const ROWS = 10;
export const COLS = 15;

export const WINDOW_WIDTH = COLS * TILESIZE;
export const WINDOW_HEIGHT = ROWS * TILESIZE;

export const FOV = 60 * (Math.PI / 180);
export const RES = 4;
export const NUM_RAYS = Math.floor(WINDOW_WIDTH / RES);