/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vector2D, DeadzoneSettings } from '../types';
import { getMagnitude } from '../utils/math';
import { LineChart, Info } from 'lucide-react';

interface GraphMagnitudeProps {
  rawInput: Vector2D;
  correctedInput: Vector2D;
  settings: DeadzoneSettings;
}

export function GraphMagnitude({
  rawInput,
  correctedInput,
  settings,
}: GraphMagnitudeProps) {
  // Use either the actual radial deadzone radius or a derived average offset for axial
  const effectiveRDead = settings.type === 'radial' 
    ? settings.radialRadius 
    : (settings.axialX + settings.axialY) / 2;

  const rawMag = getMagnitude(rawInput);
  const corrMag = getMagnitude(correctedInput);

  // SVG dimensions
  const svgWidth = 380;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 30;
  const chartWidth = svgWidth - paddingX * 2;
  const chartHeight = svgHeight - paddingY * 2;

  // Convert logical coordinates [0.0, 1.0] to SVG canvas pixels
  const getPixelX = (x: number) => {
    return paddingX + x * chartWidth;
  };

  const getPixelY = (y: number) => {
    return paddingY + (1.0 - y) * chartHeight; // invert Y since SVG goes top-to-bottom
  };

  // Generate path points for raw baseline line (y = x)
  const rawPath = `M ${getPixelX(0)} ${getPixelY(0)} L ${getPixelX(1)} ${getPixelY(1)}`;

  // Generate path points for corrected magnitude line:
  // From 0 to R_dead, y = 0
  // From R_dead to 1.0, linear rise to 1.0
  const buildCorrectedPath = () => {
    const p1 = `M ${getPixelX(0)} ${getPixelY(0)}`;
    const p2 = `L ${getPixelX(effectiveRDead)} ${getPixelY(0)}`;
    const p3 = `L ${getPixelX(1.0)} ${getPixelY(1.0)}`;
    return `${p1} ${p2} ${p3}`;
  };

  return (
    <div className="flex flex-col bg-[#15181F] rounded-2xl p-5 border border-slate-800 shadow-xl overflow-hidden">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-2">
          <LineChart className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-slate-205 uppercase tracking-wider">
            Transfer Magnitude Graph f(r)
          </h2>
        </div>
        <div className="text-xs text-blue-450 font-mono bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
          R_dead = {effectiveRDead.toFixed(2)}
        </div>
      </div>

      {/* SVG Plotter */}
      <div className="flex-1 flex items-center justify-center py-1">
        <div className="w-full max-w-[380px] bg-[#0F1115] border border-slate-800 rounded-xl p-2.5">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto overflow-visible select-none"
          >
            {/* Horizontal & Vertical Grid Axes */}
            <line
              x1={getPixelX(0)}
              y1={getPixelY(0)}
              x2={getPixelX(1.05)}
              y2={getPixelY(0)}
              stroke="rgba(148, 163, 184, 0.15)"
              strokeWidth="1.5"
            />
            <line
              x1={getPixelX(0)}
              y1={getPixelY(0)}
              x2={getPixelX(0)}
              y2={getPixelY(1.05)}
              stroke="rgba(148, 163, 184, 0.15)"
              strokeWidth="1.5"
            />

            {/* Grid helper lines (0.25, 0.5, 0.75 markings) */}
            {[0.25, 0.5, 0.75, 1.0].map((val) => (
              <g key={val}>
                {/* Horizontal grid guide */}
                <line
                  relative-id={`hguide-${val}`}
                  x1={getPixelX(0)}
                  y1={getPixelY(val)}
                  x2={getPixelX(1.0)}
                  y2={getPixelY(val)}
                  stroke="rgba(255, 255, 255, 0.04)"
                  strokeWidth="0.8"
                  strokeDasharray="2,3"
                />
                {/* Vertical grid guide */}
                <line
                  relative-id={`vguide-${val}`}
                  x1={getPixelX(val)}
                  y1={getPixelY(0)}
                  x2={getPixelX(val)}
                  y2={getPixelY(1.0)}
                  stroke="rgba(255, 255, 255, 0.04)"
                  strokeWidth="0.8"
                  strokeDasharray="2,3"
                />
                {/* X labels */}
                <text
                  x={getPixelX(val)}
                  y={getPixelY(0) + 16}
                  fill="#64748b"
                  fontSize="8.5"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {val.toFixed(2)}
                </text>
                {/* Y labels */}
                <text
                  x={getPixelX(0) - 10}
                  y={getPixelY(val) + 3}
                  fill="#64748b"
                  fontSize="8.5"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {val.toFixed(2)}
                </text>
              </g>
            ))}

            {/* Grid zero base */}
            <text
              x={getPixelX(0) - 8}
              y={getPixelY(0) + 12}
              fill="#64748b"
              fontSize="8.5"
              fontFamily="monospace"
              textAnchor="end"
            >
              0
            </text>

            {/* Shaded deadzone background region */}
            <rect
              x={getPixelX(0)}
              y={getPixelY(1.0)}
              width={effectiveRDead * chartWidth}
              height={chartHeight}
              fill="rgba(239, 68, 68, 0.03)"
            />

            {/* Labels for X & Y Axes */}
            <text
              x={getPixelX(1.0) + 6}
              y={getPixelY(0) + 4}
              fill="#94a3b8"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="medium"
            >
              Raw R
            </text>
            <text
              x={getPixelX(0)}
              y={getPixelY(1.05) - 10}
              fill="#94a3b8"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="medium"
              textAnchor="middle"
            >
              Corr f(R)
            </text>

            {/* Baseline Curve (y = x) in dashed dark red */}
            <path
              d={rawPath}
              fill="none"
              stroke="#ef4444"
              strokeWidth="1.5"
              strokeDasharray="4,4"
              opacity="0.5"
            />

            {/* Corrected output Curve: flat then sloped rise in Blue */}
            <path
              d={buildCorrectedPath()}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Live tracker indicator circle overlay */}
            {rawMag > 0.001 && (
              <g>
                {/* Projected grid guides for user coordinates */}
                <line
                  x1={getPixelX(rawMag)}
                  y1={getPixelY(0)}
                  x2={getPixelX(rawMag)}
                  y2={getPixelY(corrMag)}
                  stroke="#475569"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                <line
                  x1={getPixelX(0)}
                  y1={getPixelY(corrMag)}
                  x2={getPixelX(rawMag)}
                  y2={getPixelY(corrMag)}
                  stroke="#475569"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />

                {/* Vertical position on raw base */}
                <circle
                  cx={getPixelX(rawMag)}
                  cy={getPixelY(rawMag)}
                  r={3.5}
                  fill="#ef4444"
                />

                {/* Pulsing indicator on corrected line */}
                <circle
                  cx={getPixelX(rawMag)}
                  cy={getPixelY(corrMag)}
                  r={7}
                  fill="rgba(59, 130, 246, 0.35)"
                  className="animate-ping"
                  style={{ transformOrigin: `${getPixelX(rawMag)}px ${getPixelY(corrMag)}px` }}
                />
                <circle
                  cx={getPixelX(rawMag)}
                  cy={getPixelY(corrMag)}
                  r={5}
                  fill="#3b82f6"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* Helpful formula text box */}
      <div className="mt-3 bg-[#0F1115] p-3 rounded-xl border border-slate-800">
        <div className="flex items-start space-x-2 text-xs">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
          <div className="text-slate-400 font-sans space-y-1">
            <p>
              By using a <span className="text-blue-400 font-medium">radial scaling equation</span>, we prevent sudden "sensitivity jumps" when leaving the deadzone.
            </p>
            <p className="font-mono text-[10.5px] text-slate-400 bg-[#15181F] p-1.5 rounded border border-slate-800 block">
              f(r) = (r - {effectiveRDead.toFixed(2)}) / (1 - {effectiveRDead.toFixed(2)}) for r &gt; {effectiveRDead.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
