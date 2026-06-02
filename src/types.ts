/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Vector2D {
  x: number;
  y: number;
}

export type DeadzoneType = 'radial' | 'axial';

export interface DeadzoneSettings {
  type: DeadzoneType;
  radialRadius: number; // R_dead for radial
  axialX: number;       // d_x for axial X
  axialY: number;       // d_y for axial Y
}

export interface CalibrationOffset {
  x: number;
  y: number;
  isCalibrated: boolean;
}

export interface SimulationSettings {
  enabled: boolean;
  driftX: number;       // Simulated hardware drift X-axis
  driftY: number;       // Simulated hardware drift Y-axis
  noiseAmplitude: number; // Small high-frequency jitter to mimic real potentiometers
  wiggleEnabled: boolean; // Automate a small circular wiggle
}

export interface GamepadState {
  connected: boolean;
  id: string;
  index: number;
  axes: number[];
  buttons: { pressed: boolean; value: number }[];
  selectedXAxis: number;
  selectedYAxis: number;
}
