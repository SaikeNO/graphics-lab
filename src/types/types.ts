export type ShapeType = "line" | "rectangle" | "circle" | "bezier";
export type Point = {
  x: number;
  y: number;
};

export type BaseShape = {
  id: string;
  type: ShapeType;
  color: string;
  lineWidth: number;
  selected: boolean;
};

export type LineShape = BaseShape & {
  type: "line";
  points: [Point, Point];
};

export type RectangleShape = BaseShape & {
  type: "rectangle";
  points: [Point, Point];
};

export type CircleShape = BaseShape & {
  type: "circle";
  points: [Point, Point];
};

export type BezierShape = BaseShape & {
  type: "bezier";
  points: Point[];
};

export type AnyShape = LineShape | RectangleShape | CircleShape | BezierShape;

export type Tool = "draw" | "move" | "resize" | "select";

export interface PPMImage {
  width: number;
  height: number;
  maxValue: number;
  pixels: Uint8ClampedArray;
  format: "P3" | "P6";
}
