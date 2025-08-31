
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
  imageData?: string; // Base64 encoded mask image for segmentation masks
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface Score {
  user: number;
  ai: number;
}
