import type { Matrix3x3, Point } from "../types/types";

export const createIdentityMatrix = (): Matrix3x3 => ({
  m: [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
});

export const createTranslationMatrix = (dx: number, dy: number): Matrix3x3 => ({
  m: [
    [1, 0, dx],
    [0, 1, dy],
    [0, 0, 1],
  ],
});

export const createRotationMatrix = (angleDegrees: number): Matrix3x3 => {
  const rad = (angleDegrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    m: [
      [cos, -sin, 0],
      [sin, cos, 0],
      [0, 0, 1],
    ],
  };
};

export const createScaleMatrix = (sx: number, sy: number): Matrix3x3 => ({
  m: [
    [sx, 0, 0],
    [0, sy, 0],
    [0, 0, 1],
  ],
});

export const multiplyMatrices = (a: Matrix3x3, b: Matrix3x3): Matrix3x3 => {
  const m = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        m[i][j] += a.m[i][k] * b.m[k][j];
      }
    }
  }
  return { m };
};

export const applyMatrixToPoint = (matrix: Matrix3x3, point: Point): Point => {
  const x = point.x;
  const y = point.y;
  const w = 1;

  const nx = matrix.m[0][0] * x + matrix.m[0][1] * y + matrix.m[0][2] * w;
  const ny = matrix.m[1][0] * x + matrix.m[1][1] * y + matrix.m[1][2] * w;
  return { x: nx, y: ny };
};

export const getRotationAroundPointMatrix = (angle: number, px: number, py: number): Matrix3x3 => {
  const T1 = createTranslationMatrix(-px, -py);
  const R = createRotationMatrix(angle);
  const T2 = createTranslationMatrix(px, py);
  return multiplyMatrices(T2, multiplyMatrices(R, T1));
};

export const getScaleAroundPointMatrix = (k: number, px: number, py: number): Matrix3x3 => {
  const T1 = createTranslationMatrix(-px, -py);
  const S = createScaleMatrix(k, k);
  const T2 = createTranslationMatrix(px, py);
  return multiplyMatrices(T2, multiplyMatrices(S, T1));
};

export const calculateBezierPoint = (points: Point[], t: number): Point => {
  const n = points.length - 1;
  let x = 0;
  let y = 0;

  for (let i = 0; i <= n; i++) {
    const coeff = binomialCoefficient(n, i) * Math.pow(1 - t, n - i) * Math.pow(t, i);
    x += coeff * points[i].x;
    y += coeff * points[i].y;
  }
  return { x, y };
};

const binomialCoefficient = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let result = 1;
  for (let i = 1; i <= k; i++) {
    result *= (n - i + 1) / i;
  }
  return result;
};
