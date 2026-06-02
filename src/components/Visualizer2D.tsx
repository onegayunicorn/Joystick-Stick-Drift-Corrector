/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import { useEffect, useRef, useState } from 'react';
import { Vector2D, DeadzoneSettings, CalibrationOffset, SimulationSettings } from '../types';
import { RefreshCw, Play, CircleDot, Info, Settings } from 'lucide-react';

interface Visualizer2DProps {
  rawInput: Vector2D;
  centeredInput: Vector2D;
  correctedInput: Vector2D;
  settings: DeadzoneSettings;
  calibration: CalibrationOffset;
  simSettings: SimulationSettings;
}

export function Visualizer2D({
  rawInput,
  centeredInput,
  correctedInput,
  settings,
  calibration,
  simSettings,
}: Visualizer2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trailsRef = useRef<{ raw: Vector2D[]; corrected: Vector2D[] }>({ raw: [], corrected: [] });
  const [showAxesText, setShowAxesText] = useState(true);

  // Buffer coordinates to trail history
  useEffect(() => {
    const maxTrailLength = 45;
    
    // Add current coordinates
    trailsRef.current.raw.push({ ...rawInput });
    trailsRef.current.corrected.push({ ...correctedInput });

    // Truncate
    if (trailsRef.current.raw.length > maxTrailLength) {
      trailsRef.current.raw.shift();
    }
    if (trailsRef.current.corrected.length > maxTrailLength) {
      trailsRef.current.corrected.shift();
    }
  }, [rawInput, correctedInput]);

  // Handle drawing routine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 25;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const centerX = width / 2;
    const centerY = height / 2;

    // Scale from [-1.1, 1.1] coordinate system to pixel coordinates
    const coordinateRange = 1.1;
    const toPixelX = (coordX: number) => {
      return centerX + (coordX / coordinateRange) * (chartWidth / 2);
    };
    const toPixelY = (coordY: number) => {
      // Gamepads Y-axis is positive downwards physically, but visually we map standard Cartesian: Y up is positive
      return centerY - (coordY / coordinateRange) * (chartHeight / 2);
    };

    // Clear Canvas with sleek subtle background
    ctx.fillStyle = '#0F1115';
    ctx.fillRect(0, 0, width, height);

    // Draw Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let g = -1.0; g <= 1.05; g += 0.5) {
      if (Math.abs(g) < 0.01) continue; // Skip axis line
      
      // Vertical grid lines
      ctx.beginPath();
      ctx.moveTo(toPixelX(g), toPixelY(-1.1));
      ctx.lineTo(toPixelX(g), toPixelY(1.1));
      ctx.stroke();

      // Horizontal grid lines
      ctx.beginPath();
      ctx.moveTo(toPixelX(-1.1), toPixelY(g));
      ctx.lineTo(toPixelX(1.1), toPixelY(g));
      ctx.stroke();

      // Number labels
      if (showAxesText) {
        ctx.fillStyle = '#64748b';
        ctx.font = '9px monospace';
        ctx.fillText(g.toFixed(1), toPixelX(g) - 10, centerY + 14);
        ctx.fillText((-g).toFixed(1), centerX - 24, toPixelY(g) + 3);
      }
    }

    // Draw axis lines (X & Y)
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
    ctx.lineWidth = 1.5;
    
    ctx.beginPath();
    ctx.moveTo(toPixelX(-1.1), centerY);
    ctx.lineTo(toPixelX(1.1), centerY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX, toPixelY(-1.1));
    ctx.lineTo(centerX, toPixelY(1.1));
    ctx.stroke();

    // DRAW DEADZONE REGIONS SHADING (Our central drift containment area)
    if (settings.type === 'radial') {
      // Radial Circle Deadzone Area
      const pixelRadius = (settings.radialRadius / coordinateRange) * (chartWidth / 2);
      ctx.beginPath();
      ctx.arc(centerX, centerY, pixelRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.05)'; // Light red tint inside deadzone
      ctx.fill();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // Axial corridor zones mapping
      const pixelDeadX = (settings.axialX / coordinateRange) * (chartWidth / 2);
      const pixelDeadY = (settings.axialY / coordinateRange) * (chartHeight / 2);

      // Shading independent axis bars
      ctx.fillStyle = 'rgba(239, 68, 68, 0.03)';
      ctx.fillRect(centerX - pixelDeadX, toPixelY(1.1), pixelDeadX * 2, chartHeight);
      ctx.fillRect(toPixelX(-1.1), centerY - pixelDeadY, chartWidth, pixelDeadY * 2);

      // Corridors outline lines
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      ctx.beginPath();
      ctx.moveTo(centerX - pixelDeadX, toPixelY(-1.1));
      ctx.lineTo(centerX - pixelDeadX, toPixelY(1.1));
      ctx.moveTo(centerX + pixelDeadX, toPixelY(-1.1));
      ctx.lineTo(centerX + pixelDeadX, toPixelY(1.1));
      ctx.moveTo(toPixelX(-1.1), centerY - pixelDeadY);
      ctx.lineTo(toPixelX(1.1), centerY - pixelDeadY);
      ctx.moveTo(toPixelX(-1.1), centerY + pixelDeadY);
      ctx.lineTo(toPixelX(1.1), centerY + pixelDeadY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Outer maximum unit circle envelope (Physical bounds of Joystick)
    ctx.beginPath();
    ctx.arc(centerX, centerY, (1.0 / coordinateRange) * (chartWidth / 2), 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // DRAW HISTORICAL TRAILS (Fading history dots)
    const rawTrails = trailsRef.current.raw;
    const correctedTrails = trailsRef.current.corrected;

    // Draw Raw inputs dot-trail (fading red)
    for (let i = 0; i < rawTrails.length; i++) {
      const point = rawTrails[i];
      const alpha = (i / rawTrails.length) * 0.4;
      ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
      ctx.beginPath();
      ctx.arc(toPixelX(point.x), toPixelY(point.y), 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Corrected outputs dot-trail (fading green/blue)
    for (let i = 0; i < correctedTrails.length; i++) {
      const point = correctedTrails[i];
      const alpha = (i / correctedTrails.length) * 0.45;
      ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`;
      ctx.beginPath();
      ctx.arc(toPixelX(point.x), toPixelY(point.y), 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // DRAW ACTIVE VECTORS / TRANSLATIONS
    // 1. Raw Point (Red outline circle)
    const pxRawX = toPixelX(rawInput.x);
    const pxRawY = toPixelY(rawInput.y);

    ctx.beginPath();
    ctx.arc(pxRawX, pxRawY, 6, 0, Math.PI * 2);
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 1.5;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.fill();
    ctx.stroke();

    // 2. Active calibration offset translation line
    if (calibration.isCalibrated) {
      const pxCenteredX = toPixelX(centeredInput.x);
      const pxCenteredY = toPixelY(centeredInput.y);

      // Connecting arrow showing Calibration Biasing Step (shifting back to logical center)
      ctx.beginPath();
      ctx.moveTo(pxRawX, pxRawY);
      ctx.lineTo(pxCenteredX, pxCenteredY);
      ctx.strokeStyle = '#f59e0b'; // amber shifting vector
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 2]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw intermediate Centered dot (Unbiased but before deadzone)
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(pxCenteredX, pxCenteredY, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Current Corrected Output point (Blue solid ring)
    const pxCorrX = toPixelX(correctedInput.x);
    const pxCorrY = toPixelY(correctedInput.y);

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(pxCorrX, pxCorrY);
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(pxCorrX, pxCorrY, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#3b82f6'; // Blue
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.fill();
    ctx.stroke();

    // Draw small target visual on raw point if inside deadzone to show cancellation!
    const rawHypot = Math.hypot(centeredInput.x, centeredInput.y);
    const isCancelled = settings.type === 'radial' 
      ? rawHypot <= settings.radialRadius
      : Math.abs(centeredInput.x) <= settings.axialX && Math.abs(centeredInput.y) <= settings.axialY;

    if (isCancelled) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pxRawX - 8, pxRawY); ctx.lineTo(pxRawX + 8, pxRawY);
      ctx.moveTo(pxRawX, pxRawY - 8); ctx.lineTo(pxRawX, pxRawY + 8);
      ctx.stroke();
    }

  }, [rawInput, centeredInput, correctedInput, settings, calibration, showAxesText]);

  // Clear Trails history helper
  const handleClearTrail = () => {
    trailsRef.current.raw = [];
    trailsRef.current.corrected = [];
  };

  return (
    <div className="flex flex-col bg-[#15181F] rounded-2xl p-5 border border-slate-800 shadow-xl overflow-hidden h-full">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-2">
          <CircleDot className="w-4 h-4 text-blue-450" />
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
            2D Coordinate Space Plotter
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAxesText(!showAxesText)}
            className={`p-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1 cursor-pointer ${
              showAxesText 
                ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' 
                : 'bg-transparent border-slate-800 text-slate-500'
            }`}
            title="Toggle coordinate labels"
          >
            Labels
          </button>
          <button
            onClick={handleClearTrail}
            className="p-1.5 rounded-lg bg-[#0F1115] hover:bg-[#1C202B] border border-slate-800 hover:border-slate-705 text-slate-400 hover:text-slate-200 transition-all flex items-center gap-1 text-xs font-medium cursor-pointer"
            title="Clear raw/corrected path trails"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Clear Trail
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center py-2">
        <div className="relative border-4 border-[#0F1115] rounded-2xl overflow-hidden shadow-2xl">
          <canvas
            ref={canvasRef}
            width={340}
            height={340}
            className="block aspect-square w-full max-w-[340px]"
          />
        </div>
      </div>

      {/* Interactive Legend description */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs font-sans text-slate-400 bg-[#0F1115] p-3 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-red-400/40 border border-red-500 inline-block" />
          <span className="font-medium text-slate-300">Raw Input</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-blue-550 border border-white inline-block" />
          <span className="font-medium text-slate-300">Clean Output</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3.5 h-3.5 border-2 border-red-500/30 bg-red-500/10 border-dashed rounded-full inline-block" />
          <span className="font-medium text-slate-300">Deadzone {settings.type === 'radial' ? 'Radius' : 'Corridor'}</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="text-yellow-400 font-bold font-mono">➡</span>
          <span className="font-medium text-slate-300">Bias Offset Shift</span>
        </div>
      </div>
    </div>
  );
}
