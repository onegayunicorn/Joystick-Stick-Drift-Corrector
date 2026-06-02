/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React from 'react';
import { GamepadState } from '../types';
import { Gamepad2, AlertCircle, Info, RefreshCw } from 'lucide-react';

interface GamepadInfoProps {
  gamepadState: GamepadState;
  setGamepadState: React.Dispatch<React.SetStateAction<GamepadState>>;
}

export function GamepadInfo({ gamepadState, setGamepadState }: GamepadInfoProps) {
  const handleAxisSelect = (axisName: 'selectedXAxis' | 'selectedYAxis', value: number) => {
    setGamepadState((prev) => ({
      ...prev,
      [axisName]: value,
    }));
  };

  const getAxesCount = () => {
    return gamepadState.axes.length;
  };

  return (
    <div className="bg-[#15181F] rounded-2xl p-6 border border-slate-800 shadow-xl overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500/50 via-blue-500 to-blue-500/50" />
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2.5">
          <Gamepad2 className="w-5 h-5 text-blue-400" />
          <h2 className="text-sm font-semibold text-slate-205 uppercase tracking-wider font-sans">
            Gamepad Diagnostic Panel
          </h2>
        </div>
        {gamepadState.connected ? (
          <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-405 border border-emerald-500/20 px-2 py-0.5 rounded uppercase">
            Active
          </span>
        ) : (
          <span className="text-[10px] font-mono font-bold bg-[#0F1115] text-slate-500 border border-slate-800 px-2 py-0.5 rounded uppercase">
            No Controller
          </span>
        )}
      </div>

      {!gamepadState.connected ? (
        <div className="space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            Have a physical game controller? Connect an Xbox, PlayStation, Switch Pro, or generic dual-analog controller to test stick drift with real hardware!
          </p>

          <div className="bg-[#0F1115] border border-slate-800 rounded-xl p-3 flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0 animate-pulse" />
            <div className="text-[10.5px] text-slate-400 font-sans space-y-1">
              <span className="text-blue-400 font-medium">To connect:</span>
              <p>1. Connect your controller via USB cable or Bluetooth.</p>
              <p>2. <span className="font-bold text-slate-300">Press any button</span> on the controller to wake the Web Gamepad API.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Gamepad Identifier */}
          <div className="bg-[#0F1115] p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
              Hardware ID
            </div>
            <div className="text-xs font-mono font-bold text-slate-300 mt-1 truncate" title={gamepadState.id}>
              {gamepadState.id}
            </div>
          </div>

          {/* Axes mapping config */}
          <div className="grid grid-cols-2 gap-3.5 bg-[#0F1115]/80 p-3.5 rounded-xl border border-slate-800">
            <div>
              <label className="text-[10px] text-slate-450 uppercase tracking-wider block font-mono mb-1.5">
                X-Axis Mapping
              </label>
              <select
                value={gamepadState.selectedXAxis}
                onChange={(e) => handleAxisSelect('selectedXAxis', parseInt(e.target.value))}
                className="w-full bg-[#15181F] border border-slate-800 rounded-lg text-xs font-mono p-1.5 text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {gamepadState.axes.map((_, idx) => (
                  <option key={idx} value={idx}>
                    Axis {idx} {idx === 0 ? '(Left Stick X)' : idx === 2 ? '(Right Stick X)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-450 uppercase tracking-wider block font-mono mb-1.5">
                Y-Axis Mapping
              </label>
              <select
                value={gamepadState.selectedYAxis}
                onChange={(e) => handleAxisSelect('selectedYAxis', parseInt(e.target.value))}
                className="w-full bg-[#15181F] border border-slate-800 rounded-lg text-xs font-mono p-1.5 text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {gamepadState.axes.map((_, idx) => (
                  <option key={idx} value={idx}>
                    Axis {idx} {idx === 1 ? '(Left Stick Y)' : idx === 3 ? '(Right Stick Y)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Hardware visual breakout - Live Axes feedback */}
          <div className="space-y-2">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
              Live Hardware Inputs ({getAxesCount()} Axes / {gamepadState.buttons.length} Buttons)
            </div>
            
            {/* Split axes meters */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {gamepadState.axes.slice(0, 4).map((axisVal, idx) => (
                <div 
                  key={idx} 
                  className={`bg-[#0F1115] p-2 rounded-lg border flex items-center justify-between ${
                    idx === gamepadState.selectedXAxis || idx === gamepadState.selectedYAxis 
                      ? 'border-blue-500/30 text-blue-400 bg-blue-500/5' 
                      : 'border-slate-850 text-slate-400'
                  }`}
                >
                  <span className="text-[10px] text-slate-500 font-bold">A{idx}</span>
                  <div className="flex-1 mx-2.5 h-1.5 bg-[#15181F] rounded relative overflow-hidden">
                    <div 
                      className={`h-full absolute left-1/2 -translate-x-12 ${
                        idx === gamepadState.selectedXAxis || idx === gamepadState.selectedYAxis 
                          ? 'bg-blue-500' 
                          : 'bg-slate-700'
                      }`}
                      style={{ 
                        width: `${Math.abs(axisVal) * 50}%`,
                        left: axisVal >= 0 ? '50%' : 'auto',
                        right: axisVal < 0 ? '50%' : 'auto',
                      }}
                    />
                  </div>
                  <span className="font-bold text-[10.5px] w-10 text-right">{axisVal >= 0 ? '+' : ''}{axisVal.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Split buttons diagnostic meters */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {gamepadState.buttons.slice(0, 12).map((btn, idx) => (
                <span
                  key={idx}
                  className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
                    btn.pressed 
                      ? 'bg-blue-550 text-slate-950 shadow-[0_0_8px_rgba(59,130,246,0.5)]' 
                      : 'bg-slate-900 text-slate-600 border border-slate-950'
                  }`}
                >
                  B{idx}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
