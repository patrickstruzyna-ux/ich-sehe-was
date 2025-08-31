
export enum GameState {
  START,
  LOADING_OBJECTS,
  USER_PICKING,
  USER_CONFIRMING,
  USER_DESCRIBING,
  AI_GUESSING,
  AI_PICKING,
  USER_GUESSING,
  ROUND_OVER,
  ERROR,
}

export interface GameObject {
  id: string;
  label: string;
  mask: number[][]; // Polygon points [x, y]
  color: string;
}

export interface Score {
  user: number;
  ai: number;
}
