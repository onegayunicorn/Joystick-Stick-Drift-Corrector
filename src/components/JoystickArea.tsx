/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Vector2D, SimulationSettings, GamepadState } from '../types';
import { Sliders, HelpCircle, Gamepad2 } from 'lucide-react';

interface JoystickAreaProps {
  rawInput: Vector2D;
  setRawInput: (val: Vector2D) => void;
  correctedInput: Vector2D;
  simSettings: SimulationSettings;
  gamepadState: GamepadState;
  setGamepadState: React.Dispatch<React.SetStateAction<GamepadState>>;
}

export function JoystickArea({
  rawInput,
  setRawInput,
  correctedInput,
  simSettings,
  gamepadState,
  setGamepadState,
}: JoystickAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Poll for Gamepad API inputs if a gamepad is active
  useEffect(() => {
    const handleGamepadConnected = (e: GamepadEvent) => {
      setGamepadState((prev) => ({
        ...prev,
        connected: true,
        id: e.gamepad.id,
        index: e.gamepad.index,
        axes: [...e.gamepad.axes],
        buttons: e.gamepad.buttons.map((b) => ({ pressed: b.pressed, value: b.value })),
      }));
    };

    const handleGamepadDisconnected = () => {
      setGamepadState((prev) => ({
        ...prev,
        connected: false,
        id: '',
        axes: [],
        buttons: [],
      }));
    };

    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);

    const checkGamepads = () => {
      const gamepads = navigator.getGamepads();
      let activeGamepad = null;
      for (let i = 0; i < gamepads.length; i++) {
        const gp = gamepads[i];
        if (gp && gp.connected) {
          activeGamepad = gp;
          break; // Use the first active gamepad
        }
      }

      if (activeGamepad) {
        setGamepadState((prev) => ({
          ...prev,
          connected: true,
          id: activeGamepad!.id,
          index: activeGamepad!.index,
          axes: [...activeGamepad!.axes],
          buttons: activeGamepad!.buttons.map((b) => ({ pressed: b.pressed, value: b.value })),
        }));

        // If the user is NOT dragging the mouse, feed the gamepad inputs to rawInput!
        if (!isDragging) {
          const xAxisIdx = gamepadState.selectedXAxis;
          const yAxisIdx = gamepadState.selectedYAxis;
          const xVal = activeGamepad.axes[xAxisIdx] ?? 0;
          const yVal = activeGamepad.axes[yAxisIdx] ?? 0;
          
          // Guard against dead positions or extreme minor values
          const trimmedX = Math.abs(xVal) < 0.001 ? 0 : xVal;
          const trimmedY = Math.abs(yVal) < 0.001 ? 0 : yVal;

          setRawInput({ x: trimmedX, y: trimmedY });
        }
      } else if (gamepadState.connected) {
        // Handle case where gamepad disconnected or is no longer listed
        setGamepadState((prev) => ({ ...prev, connected: false }));
      }

      // If we are not using a physical gamepad and not dragging, inject the simulated drift + jitter.
      if (!activeGamepad && !isDragging) {
        // High frequency static noise to simulate potentiometer jitter
        const noiseX = simSettings.enabled 
          ? (Math.random() - 0.5) * simSettings.noiseAmplitude 
          : 0;
        const noiseY = simSettings.enabled 
          ? (Math.random() - 0.5) * simSettings.noiseAmplitude 
          : 0;

        // Wiggle movement for automated demonstration
        let wiggleX = 0;
        let wiggleY = 0;
        if (simSettings.enabled && simSettings.wiggleEnabled) {
          const time = Date.now() * 0.002; // speed multiplier
          wiggleX = Math.cos(time) * 0.25;
          wiggleY = Math.sin(time) * 0.25;
        }

        const targetX = (simSettings.enabled ? simSettings.driftX : 0) + noiseX + wiggleX;
        const targetY = (simSettings.enabled ? simSettings.driftY : 0) + noiseY + wiggleY;

        // Smoothly interpolate to target to mimic stick response or directly set it
        // We can slightly interpolate to smooth high-frequency jitter if we want, or set directly:
        setRawInput({
          x: Math.max(-1, Math.min(1, targetX)),
          y: Math.max(-1, Math.min(1, targetY)),
        });
      }

      animationFrameRef.current = requestAnimationFrame(checkGamepads);
    };

    animationFrameRef.current = requestAnimationFrame(checkGamepads);

    return () => {
      window.removeEventListener('gamepadconnected', handleGamepadConnected);
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isDragging, simSettings, gamepadState.selectedXAxis, gamepadState.selectedYAxis]);

  // Handle Joystick drag logic
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
    updatePositionFromPointer(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updatePositionFromPointer(e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    if (containerRef.current) {
      containerRef.current.releasePointerCapture(e.pointerId);
    }
  };

  const updatePositionFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Calculate relative coordinates normalized from -1.0 to 1.0
    // Max drag radius is half the container width/height
    const maxRadius = Math.min(rect.width, rect.height) / 2;
    let dx = (e.clientX - centerX) / maxRadius;
    let dy = (e.clientY - centerY) / maxRadius;

    // Constrain to positive/negative circular boundary of radius 1
    const magnitude = Math.sqrt(dx * dx + dy * dy);
    if (magnitude > 1.0) {
      dx /= magnitude;
      dy /= magnitude;
    }

    setRawInput({ x: dx, y: dy });
  };

  // Convert coordinate (-1 to 1) to visual pixel offsets inside container
  const getKnobStyle = (coords: Vector2D) => {
    // scale to percentage offset from box center (50%)
    const pctX = 50 + coords.x * 40; // max offset is 40%
    const pctY = 50 + coords.y * 40;
    return {
      left: `${pctX}%`,
      top: `${pctY}%`,
      transform: 'translate(-50%, -50%)',
    };
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mx-auto py-4">
      {/* Container for Physical drifting input */}
      <div className="flex flex-col items-center bg-[#15181F] rounded-xl p-6 border border-slate-800 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500/50 via-red-500 to-red-500/50" />
        <div className="flex justify-between items-center w-full mb-4">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-sans">
              1. Physical Stick Input
            </span>
          </div>
          {isDragging ? (
            <span className="text-xs font-semibold bg-red-500/20 text-red-400 px-2.5 py-0.5 rounded-full uppercase tracking-widest animate-pulse max-md:hidden">
              Dragging Input
            </span>
          ) : gamepadState.connected ? (
            <span className="text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1 max-md:hidden select-none">
              <Gamepad2 className="w-3.5 h-3.5" /> Hardware Connected
            </span>
          ) : (
            <span className="text-xs text-slate-400 max-md:hidden">
              Drag Stick or Plug Gamepad
            </span>
          )}
        </div>

        {/* Outer Ring boundary */}
        <div
          id="joystick-physical-container"
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative w-56 h-56 rounded-full bg-[#0F1115] border-4 border-slate-800 shadow-[inset_0_4px_16px_rgba(0,0,0,0.8)] cursor-grab active:cursor-grabbing flex items-center justify-center select-none touch-none overflow-hidden"
        >
          {/* Subtle grid lines for visuals */}
          <div className="absolute inset-0 border-t border-b border-slate-900/40 pointer-events-none top-1/2 -translate-y-1/2" />
          <div className="absolute inset-0 border-l border-r border-slate-900/40 pointer-events-none left-1/2 -translate-x-1/2" />
          <div className="absolute w-40 h-40 rounded-full border border-slate-900/30 pointer-events-none" />
          <div className="absolute w-24 h-24 rounded-full border border-slate-900/30 pointer-events-none" />

          {/* Physical Drift rest center visual crosshair */}
          {simSettings.enabled && (
            <div
              className="absolute w-4 h-4 rounded-full border border-red-500/30 flex items-center justify-center"
              style={getKnobStyle({ x: simSettings.driftX, y: simSettings.driftY })}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <div className="absolute w-6 h-[1px] bg-red-500/30" />
              <div className="absolute h-6 w-[1px] bg-red-500/30" />
              <span className="absolute text-[9px] text-red-400 font-mono -top-4 whitespace-nowrap bg-[#0F1115] px-1 rounded border border-red-500/20 z-10">
                Drift Rest
              </span>
            </div>
          )}

          {/* Draggable center stick knob */}
          <div
            id="joystick-physical-knob"
            className={`absolute w-16 h-16 rounded-full bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 border border-slate-650 shadow-2xl flex items-center justify-center transition-shadow pointer-events-none ${
              isDragging ? 'shadow-[0_0_20px_rgba(239,68,68,0.4)] border-red-500/70' : 'group-hover:border-slate-500'
            }`}
            style={getKnobStyle(rawInput)}
          >
            {/* Grip texture lines */}
            <div className="w-10 h-10 rounded-full border-2 border-slate-650/40 flex items-center justify-center bg-slate-900/30">
              <div className="w-6 h-6 rounded-full border border-slate-600/20 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400/50" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center w-full mt-4 bg-[#0F1115]/85 p-2.5 rounded-xl border border-slate-800">
          <div className="text-center w-1/2 border-r border-slate-800/80">
            <div className="text-[10px] text-slate-400 font-mono font-medium uppercase tracking-wider">
              Axis X
            </div>
            <div className="text-sm font-mono font-bold text-red-400 mt-0.5">
              {rawInput.x.toFixed(4)}
            </div>
          </div>
          <div className="text-center w-1/2">
            <div className="text-[10px] text-slate-404 font-mono font-medium uppercase tracking-wider">
              Axis Y
            </div>
            <div className="text-sm font-mono font-bold text-red-400 mt-0.5">
              {rawInput.y.toFixed(4)}
            </div>
          </div>
        </div>
      </div>

      {/* Container for Corrected logical output */}
      <div className="flex flex-col items-center bg-[#15181F] rounded-xl p-6 border border-slate-800 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500/50 via-blue-400 to-blue-500/50" />
        <div className="flex justify-between items-center w-full mb-4">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
            <span className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-sans">
              2. Clean Corrected Output
            </span>
          </div>
          {Math.abs(correctedInput.x) < 1e-6 && Math.abs(correctedInput.y) < 1e-6 ? (
            <span className="text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider select-none animate-pulse">
              Centered
            </span>
          ) : (
            <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full tracking-wider animate-pulse select-none">
              Active Input
            </span>
          )}
        </div>

        {/* Outer Ring boundary */}
        <div
          id="joystick-corrected-container"
          className="relative w-56 h-56 rounded-full bg-[#0F1115] border-4 border-slate-800 shadow-[inset_0_4px_16px_rgba(0,0,0,0.8)] flex items-center justify-center select-none overflow-hidden"
        >
          {/* Subtle grid lines for visuals */}
          <div className="absolute inset-0 border-t border-b border-slate-900/40 pointer-events-none top-1/2 -translate-y-1/2" />
          <div className="absolute inset-0 border-l border-r border-slate-900/40 pointer-events-none left-1/2 -translate-x-1/2" />
          <div className="absolute w-40 h-40 rounded-full border border-slate-900/30 pointer-events-none" />
          <div className="absolute w-24 h-24 rounded-full border border-slate-900/30 pointer-events-none" />

          {/* Rigid blue visual coordinate center dot at (0,0) */}
          <div className="absolute w-2 h-2 rounded-full bg-blue-500/30 flex items-center justify-center pointer-events-none">
            <div className="w-1 h-1 rounded-full bg-blue-400" />
          </div>

          {/* Corrected position joystick handle */}
          <div
            id="joystick-corrected-knob"
            className={`absolute w-16 h-16 rounded-full bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 border border-slate-650 shadow-2xl flex items-center justify-center pointer-events-none transition-shadow ${
              Math.hypot(correctedInput.x, correctedInput.y) > 0.001 
                ? 'shadow-[0_0_20px_rgba(59,130,246,0.3)] border-blue-400/80' 
                : ''
            }`}
            style={getKnobStyle(correctedInput)}
          >
            {/* Grip texture lines */}
            <div className="w-10 h-10 rounded-full border-2 border-slate-650/40 flex items-center justify-center bg-slate-900/30">
              <div className="w-6 h-6 rounded-full border border-slate-600/20 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-400/70" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center w-full mt-4 bg-[#0F1115]/80 p-2.5 rounded-xl border border-slate-800">
          <div className="text-center w-1/2 border-r border-slate-800/80">
            <div className="text-[10px] text-slate-400 font-mono font-medium uppercase tracking-wider">
              Output X
            </div>
            <div className="text-sm font-mono font-bold text-blue-400 mt-0.5">
              {correctedInput.x.toFixed(4)}
            </div>
          </div>
          <div className="text-center w-1/2">
            <div className="text-[10px] text-slate-405 font-mono font-medium uppercase tracking-wider">
              Output Y
            </div>
            <div className="text-sm font-mono font-bold text-blue-400 mt-0.5">
              {correctedInput.y.toFixed(4)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
