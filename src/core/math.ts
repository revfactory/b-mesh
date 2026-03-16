// ============================================================
// B-Mesh 벡터 수학 유틸리티
// ============================================================

import type { Vec3 } from '../mesh/types';

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function scale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

export function negate(v: Vec3): Vec3 {
  return [-v[0], -v[1], -v[2]];
}

export function multiplyScalar(v: Vec3, s: number): Vec3 {
  return scale(v, s);
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function length(v: Vec3): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

export function lengthSq(v: Vec3): number {
  return v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
}

export function distance(a: Vec3, b: Vec3): number {
  return length(sub(a, b));
}

export function normalize(v: Vec3): Vec3 {
  const len = length(v);
  if (len === 0) return [0, 0, 0];
  return scale(v, 1 / len);
}

export function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

export function lerpScalar(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function smoothMin(a: number, b: number, k: number): number {
  if (k <= 0) return Math.min(a, b);
  // Polynomial smooth minimum (cubic) — stable and bounded
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * h * k * (1 / 6);
}
