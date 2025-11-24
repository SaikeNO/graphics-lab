import type { AnyShape, Point } from "../types/types";
import { calculateBezierPoint } from "./matrix";

export const getShapeCenter = (shape: AnyShape): Point => {
  if (shape.points.length === 0) return { x: 0, y: 0 };
  let sx = 0,
    sy = 0;
  shape.points.forEach((p) => {
    sx += p.x;
    sy += p.y;
  });
  return { x: sx / shape.points.length, y: sy / shape.points.length };
};

export const isPointOnShape = (point: Point, shape: AnyShape): boolean => {
  const tolerance = 5;
  switch (shape.type) {
    case "line":
      return isPointNearLine(point, shape.points[0], shape.points[1], tolerance);
    case "rectangle":
      return isPointNearRectangle(point, shape, tolerance);
    case "circle":
      return isPointNearCircle(point, shape, tolerance);
    case "bezier":
      return isPointNearBezier(point, shape, tolerance);
    case "polygon":
      return isPointNearPolygon(point, shape, tolerance);
  }
};

const isPointNearLine = (point: Point, start: Point, end: Point, tolerance: number): boolean => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) return false;

  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (length * length)));
  const projX = start.x + t * dx;
  const projY = start.y + t * dy;
  const distance = Math.sqrt(Math.pow(point.x - projX, 2) + Math.pow(point.y - projY, 2));

  return distance <= tolerance;
};

const isPointNearPolygon = (point: Point, shape: AnyShape, tolerance: number): boolean => {
  for (let i = 0; i < shape.points.length; i++) {
    const p1 = shape.points[i];
    const p2 = shape.points[(i + 1) % shape.points.length];
    if (isPointNearLine(point, p1, p2, tolerance)) return true;
  }
  return false;
};

const isPointNearRectangle = (point: Point, shape: AnyShape, tolerance: number): boolean => {
  const x = Math.min(shape.points[0].x, shape.points[1].x);
  const y = Math.min(shape.points[0].y, shape.points[1].y);
  const width = Math.abs(shape.points[1].x - shape.points[0].x);
  const height = Math.abs(shape.points[1].y - shape.points[0].y);
  return (
    point.x >= x - tolerance &&
    point.x <= x + width + tolerance &&
    point.y >= y - tolerance &&
    point.y <= y + height + tolerance
  );
};

const isPointNearCircle = (point: Point, shape: AnyShape, tolerance: number): boolean => {
  const radius = Math.sqrt(
    Math.pow(shape.points[1].x - shape.points[0].x, 2) + Math.pow(shape.points[1].y - shape.points[0].y, 2)
  );
  const dist = Math.sqrt(Math.pow(point.x - shape.points[0].x, 2) + Math.pow(point.y - shape.points[0].y, 2));
  return Math.abs(dist - radius) <= tolerance;
};

const isPointNearBezier = (point: Point, shape: AnyShape, tolerance: number): boolean => {
  const steps = 100;
  for (let t = 0; t <= steps; t++) {
    const u = t / steps;
    const pt = calculateBezierPoint(shape.points, u);
    const distance = Math.sqrt(Math.pow(point.x - pt.x, 2) + Math.pow(point.y - pt.y, 2));
    if (distance <= tolerance) return true;
  }
  return false;
};

export const findHandleAtPoint = (shape: AnyShape, point: Point): number | null => {
  const handleSize = 8;
  for (let i = 0; i < shape.points.length; i++) {
    const p = shape.points[i];
    if (Math.abs(point.x - p.x) <= handleSize && Math.abs(point.y - p.y) <= handleSize) {
      return i;
    }
  }
  return null;
};
