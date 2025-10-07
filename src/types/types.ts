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
  points: Point[];
  selected: boolean;
}

export interface LineShape extends Shape {
  type: "line";
  points: [Point, Point];
}

export interface RectangleShape extends Shape {
  type: "rectangle";
  points: [Point, Point];
}

export interface CircleShape extends Shape {
  type: "circle";
  points: [Point, Point];
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
