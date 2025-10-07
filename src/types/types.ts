export type ShapeType = "line" | "rectangle" | "circle";

export interface Point {
  x: number;
  y: number;
}

export interface Shape {
  id: string;
  type: ShapeType;
  color: string;
  lineWidth: number;
  points: [Point, Point];
  selected: boolean;
}

export interface LineShape extends Shape {
  type: "line";
}

export interface RectangleShape extends Shape {
  type: "rectangle";
}

export interface CircleShape extends Shape {
  type: "circle";
}

export type AnyShape = LineShape | RectangleShape | CircleShape;

export type Tool = "draw" | "move" | "resize" | "select";

export interface PPMImage {
  width: number;
  height: number;
  maxValue: number;
  pixels: Uint8ClampedArray;
  format: "P3" | "P6";
}
