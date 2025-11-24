export type ShapeType = "line" | "rectangle" | "circle" | "bezier" | "polygon";

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

export type PolygonShape = BaseShape & {
  type: "polygon";
  points: Point[];
};

export type AnyShape = LineShape | RectangleShape | CircleShape | BezierShape | PolygonShape;

export type Tool = "draw" | "move" | "resize" | "select" | "rotate" | "scale";

export interface PPMImage {
  width: number;
  height: number;
  maxValue: number;
  pixels: Uint8ClampedArray;
  format: "P3" | "P6";
}

export interface Matrix3x3 {
  m: number[][]; // 3x3 matrix
}
