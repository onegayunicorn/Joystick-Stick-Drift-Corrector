/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vector2D, DeadzoneSettings, CalibrationOffset } from '../types';

/**
 * Calculates the magnitude of a 2D vector.
 */
export function getMagnitude(vec: Vector2D): number {
  return Math.sqrt(vec.x * vec.x + vec.y * vec.y);
}

/**
 * Truncates values near boundaries and ensures they are strictly within [-1.0, 1.0].
 */
export function clamp(val: number, min = -1.0, max = 1.0): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Standard sign function.
 */
export function sign(x: number): number {
  return x < 0 ? -1 : x > 0 ? 1 : 0;
}

/**
 * Applies calibration translation (zero-biasing) to a raw input.
 * Clamps coordinates to [-1.0, 1.0] after bias.
 */
export function applyCalibration(
  raw: Vector2D,
  calibration: CalibrationOffset
): Vector2D {
  if (!calibration.isCalibrated) {
    return { x: raw.x, y: raw.y };
  }
  return {
    x: clamp(raw.x - calibration.x),
    y: clamp(raw.y - calibration.y),
  };
}

/**
 * Applies the Radial Deadzone Correction algorithm to a biased/centered vector.
 * 
 * If magnitude M <= R_dead:
 *    out = (0, 0)
 * Else:
 *    out = (vec / M) * ((M - R_dead) / (1.0 - R_dead))
 */
export function applyRadialCorrection(
  vec: Vector2D,
  deadzoneRadius: number
): Vector2D {
  const M = getMagnitude(vec);
  
  if (M <= deadzoneRadius) {
    return { x: 0, y: 0 };
  }

  // Linear remap of the magnitude from [R_dead, 1.0] -> [0.0, 1.0]
  const scale = (M - deadzoneRadius) / (1.0 - deadzoneRadius);
  
  // Guard against division by extreme small number
  if (M < 1e-7) {
    return { x: 0, y: 0 };
  }

  return {
    x: clamp((vec.x / M) * scale),
    y: clamp((vec.y / M) * scale),
  };
}

/**
 * Applies the Axial Deadzone Correction algorithm to a biased/centered vector.
 * Treats X and Y dimensions completely independently.
 * 
 * out_axis = sgn(raw) * max(0, (|raw| - d_axis) / (1.0 - d_axis))
 */
export function applyAxialCorrection(
  vec: Vector2D,
  deadzoneX: number,
  deadzoneY: number
): Vector2D {
  const rawX = vec.x;
  const rawY = vec.y;

  const absX = Math.abs(rawX);
  const absY = Math.abs(rawY);

  const xCorrected = absX <= deadzoneX 
    ? 0 
    : sign(rawX) * ((absX - deadzoneX) / (1.0 - deadzoneX));

  const yCorrected = absY <= deadzoneY 
    ? 0 
    : sign(rawY) * ((absY - deadzoneY) / (1.0 - deadzoneY));

  return {
    x: clamp(xCorrected),
    y: clamp(yCorrected),
  };
}

/**
 * Unified correction function that handles calibration offset and deadzone settings.
 */
export function processJoystickInput(
  raw: Vector2D,
  calibration: CalibrationOffset,
  settings: DeadzoneSettings
): { centered: Vector2D; corrected: Vector2D } {
  // 1. Subtract calibration bias offset first (Centering step)
  const centered = applyCalibration(raw, calibration);

  // 2. Apply Deadzone correction
  let corrected: Vector2D;
  if (settings.type === 'radial') {
    corrected = applyRadialCorrection(centered, settings.radialRadius);
  } else {
    corrected = applyAxialCorrection(centered, settings.axialX, settings.axialY);
  }

  return { centered, corrected };
}
