/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Vector2D, DeadzoneSettings, CalibrationOffset, SimulationSettings, GamepadState } from './types';
import { processJoystickInput, getMagnitude } from './utils/math';
import { JoystickArea } from './components/JoystickArea';
import { Visualizer2D } from './components/Visualizer2D';
import { GraphMagnitude } from './components/GraphMagnitude';
import { CalibrationPanel } from './components/CalibrationPanel';
import { GamepadInfo } from './components/GamepadInfo';
import { AndroidStudio } from './components/AndroidStudio';
import { 
  Gamepad, 
  Cpu, 
  AlertCircle, 
  Info, 
  Settings2, 
  BookOpen, 
  HelpCircle,
  Eye, 
  EyeOff,
  Smartphone
} from 'lucide-react';

export default function App() {
  // 1. Raw inputs (can be mutated by Virtual Joystick drag or Gamepad API poll)
  const [rawInput, setRawInput] = useState<Vector2D>({ x: 0.08, y: -0.05 });

  // 2. Deadzone parameters & Mapping type
  const [deadzoneSettings, setDeadzoneSettings] = useState<DeadzoneSettings>({
    type: 'radial',
    radialRadius: 0.15, // 15% physical deadzone
    axialX: 0.12,
    axialY: 0.12,
  });

  // 3. Hardware center-offset calibration state
  const [calibration, setCalibration] = useState<CalibrationOffset>({
    x: 0,
    y: 0,
    isCalibrated: false,
  });

  // 4. Drift simulation parameters for virtual joystick fallback
  const [simSettings, setSimSettings] = useState<SimulationSettings>({
    enabled: true,
    driftX: 0.08,
    driftY: -0.05,
    noiseAmplitude: 0.003,
    wiggleEnabled: false,
  });

  // 5. Gamepad listener diagnostics
  const [gamepadState, setGamepadState] = useState<GamepadState>({
    connected: false,
    id: '',
    index: 0,
    axes: [],
    buttons: [],
    selectedXAxis: 0,
    selectedYAxis: 1,
  });

  const [showExplanation, setShowExplanation] = useState(true);
  const [activeTab, setActiveTab] = useState<'web' | 'android'>('web');

  // Derive logical positions inside single render tick (Synchronous mathematical chain)
  const { centered: centeredInput, corrected: correctedInput } = processJoystickInput(
    rawInput,
    calibration,
    deadzoneSettings
  );

  // Preset Handlers
  const applyPreset = (presetType: 'minor' | 'major' | 'axial' | 'perfect') => {
    switch (presetType) {
      case 'minor':
        setSimSettings({
          enabled: true,
          driftX: 0.08,
          driftY: -0.05,
          noiseAmplitude: 0.003,
          wiggleEnabled: false,
        });
        setRawInput({ x: 0.08, y: -0.05 });
        break;
      case 'major':
        setSimSettings({
          enabled: true,
          driftX: 0.18,
          driftY: -0.15,
          noiseAmplitude: 0.009,
          wiggleEnabled: false,
        });
        setRawInput({ x: 0.18, y: -0.15 });
        break;
      case 'axial':
        setSimSettings({
          enabled: true,
          driftX: 0.0,
          driftY: 0.15,
          noiseAmplitude: 0.002,
          wiggleEnabled: false,
        });
        setRawInput({ x: 0.0, y: 0.15 });
        break;
      case 'perfect':
        setSimSettings({
          enabled: true,
          driftX: 0.0,
          driftY: 0.0,
          noiseAmplitude: 0.0005,
          wiggleEnabled: false,
        });
        setRawInput({ x: 0.0, y: 0.0 });
        break;
    }
  };

  const currentRawMagnitude = getMagnitude(rawInput);
  const currentCenteredMagnitude = getMagnitude(centeredInput);
  const currentCorrectedMagnitude = getMagnitude(correctedInput);

  return (
    <div className="min-h-screen bg-[#0F1115] text-slate-100 flex flex-col font-sans selection:bg-blue-500/30 selection:text-blue-200">
      
      {/* Title Header bar */}
      <header className="border-b border-slate-800 bg-[#15181F] sticky top-0 z-20 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center space-x-3.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-lg shadow-blue-500/5">
              <Gamepad className="w-5 h-5 text-blue-400 stroke-[2]" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight font-display text-slate-100">
                Joystick Stick Drift Corrector
              </h1>
              <p className="text-[10px] uppercase font-mono font-bold tracking-wider text-blue-500/90">
                Mathematical Analysis & Live Calibration
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Real Hardware Gamepad status badge */}
            <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${
              gamepadState.connected 
                ? 'bg-blue-500/10 border-blue-500/35 text-blue-300 animate-pulse' 
                : 'bg-[#0F1115] border-slate-800 text-slate-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${gamepadState.connected ? 'bg-blue-550' : 'bg-slate-600'}`} />
              <span className="font-mono">{gamepadState.connected ? 'PHYSICAL PAD ACTIVE' : 'VIRTUAL INTERACTION'}</span>
            </div>

            <button
              onClick={() => setShowExplanation(!showExplanation)}
              className="p-1.5 rounded-lg bg-[#0F1115] hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-all text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              {showExplanation ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="max-sm:hidden">{showExplanation ? 'Hide Guide' : 'Show Guide'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-slate-800 bg-[#12151B] sticky top-[61px] z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex space-x-1 py-2">
          <button
            onClick={() => setActiveTab('web')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'web'
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-md shadow-blue-500/5'
                : 'text-slate-405 hover:text-slate-205 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Gamepad className="w-4 h-4" />
            <span>Web Analyzer & Sandbox</span>
          </button>
          
          <button
            onClick={() => setActiveTab('android')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'android'
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-md shadow-blue-500/5'
                : 'text-slate-405 hover:text-slate-250 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Android View Studio</span>
            <span className="bg-blue-500/20 text-blue-400 text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase scale-90">SDK</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">

        {/* Dynamic educational primer on Stick Drift Math */}
        {showExplanation && (
          <div className="bg-[#15181F] border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-300">
              <Cpu className="w-36 h-36 text-blue-500" />
            </div>
            
            <div className="flex items-start space-x-3.5">
              <BookOpen className="w-5 h-5 text-blue-400 mt-1 shrink-0" />
              <div className="space-y-3 prose prose-invert max-w-none">
                <h2 className="text-base font-bold text-slate-200 font-display uppercase tracking-wide">
                  The Mathematics of Stick Drift Correction
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed max-w-4xl font-sans">
                  Analog stick potentiometers report small non-zero values v_raw = (d_x, d_y) even when physical springs rest at center. 
                  To neutralize this without creating a sudden "jump" or "teleport" in sensitivity the moment the cursor moves past the deadzone border, we apply a three-step mathematical process: <span className="text-blue-400 font-medium">Centering</span>, <span className="text-amber-400 font-medium font-mono">Radial Mapping</span>, and <span className="text-indigo-400 font-medium">Linear Scale Normalization</span>.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 text-xs">
                  <div className="bg-[#0F1115] p-3 rounded-xl border border-slate-800 font-sans space-y-1">
                    <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest block">Step 1: Centering</span>
                    <p className="text-slate-400 leading-normal text-[11px]">
                      We subtract the rest-state drift bias offset (d_cal) first:
                    </p>
                    <code className="text-[10.5px] text-slate-300 font-mono block pt-1">
                      v_centered = v_raw - d_bias
                    </code>
                  </div>
                  <div className="bg-[#0F1115] p-3 rounded-xl border border-slate-800 font-sans space-y-1">
                    <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block">Step 2: Deadzone Clamp</span>
                    <p className="text-slate-400 leading-normal text-[11px]">
                      If magnitude ||v_centered|| &le; R_dead, we crush the signal to clean zero:
                    </p>
                    <code className="text-[10.5px] text-slate-300 font-mono block pt-1">
                      if (M &le; R_dead) v_out = (0, 0)
                    </code>
                  </div>
                  <div className="bg-[#0F1115] p-3 rounded-xl border border-slate-800 font-sans space-y-1">
                    <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest block">Step 3: Linear Rescale</span>
                    <p className="text-slate-400 leading-normal text-[11px]">
                      We scale the remaining physical zone to maintain progressive linear sensitivity:
                    </p>
                    <code className="text-[10.5px] text-slate-300 font-mono block pt-1">
                      v_out = (v / M) * ((M - R_dead)/(1 - R_dead))
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'web' ? (
          <>
            {/* Live Vector Input Pair controllers (Interact layer) */}
            <JoystickArea 
              rawInput={rawInput}
              setRawInput={setRawInput}
              correctedInput={correctedInput}
              simSettings={simSettings}
              gamepadState={gamepadState}
              setGamepadState={setGamepadState}
            />

            {/* Main Stats, Charts & Tuning panels bento layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left Side: 2D plot coordinate mapping (Visualizer) */}
              <div className="lg:col-span-1">
                <Visualizer2D 
                  rawInput={rawInput}
                  centeredInput={centeredInput}
                  correctedInput={correctedInput}
                  settings={deadzoneSettings}
                  calibration={calibration}
                  simSettings={simSettings}
                />
              </div>

              {/* Middle Side: Custom SVG Curve Plot (GraphMagnitude) and Preset triggers */}
              <div className="lg:col-span-1 space-y-6">
                <GraphMagnitude 
                  rawInput={centeredInput}
                  correctedInput={correctedInput}
                  settings={deadzoneSettings}
                />

                {/* Custom Presets selection card */}
                <div className="bg-[#15181F] rounded-2xl p-5 border border-slate-800 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500/30 via-blue-500 to-blue-500/30" />
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3.5 font-mono">
                    Simulator Sandbox Presets
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => applyPreset('minor')}
                      className="p-2 bg-[#0F1115] border border-slate-800 hover:border-slate-700 rounded-lg text-left transition-all hover:bg-slate-900 cursor-pointer"
                    >
                      <span className="font-semibold text-xs text-blue-450 block">Typical Wear</span>
                      <span className="text-[9.5px] font-mono text-slate-400 block mt-0.5">dx: 0.08, Jitter: 0.3%</span>
                    </button>
                    <button
                      onClick={() => applyPreset('major')}
                      className="p-2 bg-[#0F1115] border border-slate-800 hover:border-slate-700 rounded-lg text-left transition-all hover:bg-slate-900 cursor-pointer"
                    >
                      <span className="font-semibold text-xs text-red-400 block">Severe Sticky Drift</span>
                      <span className="text-[9.5px] font-mono text-slate-400 block mt-0.5">dx: 0.18, Jitter: 0.9%</span>
                    </button>
                    <button
                      onClick={() => applyPreset('axial')}
                      className="p-2 bg-[#0F1115] border border-slate-800 hover:border-slate-700 rounded-lg text-left transition-all hover:bg-slate-900 cursor-pointer"
                    >
                      <span className="font-semibold text-xs text-purple-400 block">Axial Clamping</span>
                      <span className="text-[9.5px] font-mono text-slate-400 block mt-0.5">dy: 0.15, No X-bias</span>
                    </button>
                    <button
                      onClick={() => applyPreset('perfect')}
                      className="p-2 bg-[#0F1115] border border-slate-800 hover:border-slate-700 rounded-lg text-left transition-all hover:bg-slate-900 cursor-pointer"
                    >
                      <span className="font-semibold text-xs text-emerald-450 block">Factory Standard</span>
                      <span className="text-[9.5px] font-mono text-slate-400 block mt-0.5">dx: 0.00, Jitter: 0.05%</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Side Column: Sliders control console, Assistant calibration & diagnostics */}
              <div className="lg:col-span-1 space-y-6">
                
                {/* Control Panel Settings (Sliders) */}
                <div className="bg-[#15181F] rounded-2xl p-6 border border-slate-800 shadow-xl overflow-hidden relative">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500/30 via-blue-550 to-blue-500/30" />
                  
                  <div className="flex items-center space-x-2.5 mb-4">
                    <Settings2 className="w-5 h-5 text-blue-400" />
                    <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-sans">
                      Correction Parameters Console
                    </h2>
                  </div>

                  {/* Deadzone Type selector tab */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono mb-2">
                        Deadzone Mapping Mode
                      </label>
                      <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#0F1115] rounded-xl border border-slate-800">
                        <button
                          onClick={() => setDeadzoneSettings(prev => ({ ...prev, type: 'radial' }))}
                          className={`py-1.5 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                            deadzoneSettings.type === 'radial'
                              ? 'bg-blue-500 border border-blue-550 text-white font-bold shadow-md'
                              : 'bg-transparent text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Radial (Circular)
                        </button>
                        <button
                          onClick={() => setDeadzoneSettings(prev => ({ ...prev, type: 'axial' }))}
                          className={`py-1.5 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                            deadzoneSettings.type === 'axial'
                              ? 'bg-blue-500 border border-blue-550 text-white font-bold shadow-md'
                              : 'bg-transparent text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Axial (Corridor)
                        </button>
                      </div>
                    </div>

                    {/* Conditional Deadzone Sliders */}
                    {deadzoneSettings.type === 'radial' ? (
                      <div className="space-y-2.5 bg-[#0F1115] p-4 rounded-xl border border-slate-800">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-300 font-medium">Radial Deadzone (R_dead)</span>
                          <span className="text-blue-405 font-mono font-bold">{(deadzoneSettings.radialRadius * 100).toFixed(0)}%</span>
                        </div>
                        <input
                          relative-id="slider-radial-radius"
                          type="range"
                          min="0.00"
                          max="0.40"
                          step="0.01"
                          value={deadzoneSettings.radialRadius}
                          onChange={(e) => setDeadzoneSettings(prev => ({ ...prev, radialRadius: parseFloat(e.target.value) }))}
                          className="w-full accent-blue-500 bg-slate-800 rounded-lg cursor-pointer h-1.5"
                        />
                        <span className="text-[10px] text-slate-500 font-sans block leading-normal pt-1">
                          Deletes raw vectors with magnitude smaller than this radius. Smoothly remaps remaining values from [R_dead, 1.0].
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-4 bg-[#0F1115] p-4 rounded-xl border border-slate-800">
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-300 font-medium">X-Axis Corridor Buffer</span>
                            <span className="text-blue-405 font-mono font-bold font-bold">{(deadzoneSettings.axialX * 100).toFixed(0)}%</span>
                          </div>
                          <input
                            relative-id="slider-axial-x"
                            type="range"
                            min="0.00"
                            max="0.40"
                            step="0.01"
                            value={deadzoneSettings.axialX}
                            onChange={(e) => setDeadzoneSettings(prev => ({ ...prev, axialX: parseFloat(e.target.value) }))}
                            className="w-full accent-blue-500 bg-slate-800 rounded-lg cursor-pointer h-1.5"
                          />
                        </div>
                        <div className="space-y-1.5 border-t border-slate-800/40 pt-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-300 font-medium">Y-Axis Corridor Buffer</span>
                            <span className="text-blue-405 font-mono font-bold">{(deadzoneSettings.axialY * 100).toFixed(0)}%</span>
                          </div>
                          <input
                            relative-id="slider-axial-y"
                            type="range"
                            min="0.00"
                            max="0.40"
                            step="0.01"
                            value={deadzoneSettings.axialY}
                            onChange={(e) => setDeadzoneSettings(prev => ({ ...prev, axialY: parseFloat(e.target.value) }))}
                            className="w-full accent-blue-500 bg-slate-800 rounded-lg cursor-pointer h-1.5"
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 font-sans block leading-normal pt-1">
                          Processes horizontal and vertical inputs completely independently. Perfect for vintage arcade emulators.
                        </span>
                      </div>
                    )}

                    {/* Live Drift Simulator Custom Inputs */}
                    <div className="border-t border-slate-800 pt-4 space-y-3.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">
                          Virtual Stick Drift Emulator
                        </label>
                        <button
                          onClick={() => setSimSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border transition-all ${
                            simSettings.enabled 
                              ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' 
                              : 'bg-slate-800 border-slate-750 text-slate-500'
                          }`}
                        >
                          {simSettings.enabled ? 'EMULATOR ON' : 'EMULATOR OFF'}
                        </button>
                      </div>

                      {simSettings.enabled && (
                        <div className="space-y-3.5 bg-[#0F1115] p-3.5 rounded-xl border border-slate-800 text-xs">
                          
                          {/* Drift X Slider */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center leading-none text-slate-400 text-[11px]">
                              <span>Physical Drift X-Offset</span>
                              <span className="font-mono font-bold text-slate-300">{simSettings.driftX >= 0 ? '+' : ''}{simSettings.driftX.toFixed(2)}</span>
                            </div>
                            <input
                              relative-id="slider-sim-drift-x"
                              type="range"
                              min="-0.25"
                              max="0.25"
                              step="0.01"
                              value={simSettings.driftX}
                              disabled={gamepadState.connected}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setSimSettings(prev => ({ ...prev, driftX: val }));
                                if (!gamepadState.connected) setRawInput(prev => ({ ...prev, x: val }));
                              }}
                              className="w-full accent-blue-500 bg-slate-800 rounded h-1 cursor-pointer disabled:opacity-40"
                            />
                          </div>

                          {/* Drift Y Slider */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center leading-none text-slate-400 text-[11px]">
                              <span>Physical Drift Y-Offset</span>
                              <span className="font-mono font-bold text-slate-300">{simSettings.driftY >= 0 ? '+' : ''}{simSettings.driftY.toFixed(2)}</span>
                            </div>
                            <input
                              relative-id="slider-sim-drift-y"
                              type="range"
                              min="-0.25"
                              max="0.25"
                              step="0.01"
                              value={simSettings.driftY}
                              disabled={gamepadState.connected}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setSimSettings(prev => ({ ...prev, driftY: val }));
                                if (!gamepadState.connected) setRawInput(prev => ({ ...prev, y: val }));
                              }}
                              className="w-full accent-blue-500 bg-slate-800 rounded h-1 cursor-pointer disabled:opacity-40"
                            />
                          </div>

                          {/* Automated demonstration wiggle button */}
                          <div className="flex justify-between items-center pt-2 border-t border-slate-800/40">
                            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Orbit Demo Test</span>
                            <button
                              onClick={() => setSimSettings(prev => ({ ...prev, wiggleEnabled: !prev.wiggleEnabled }))}
                              className={`py-1 px-2 text-[10px] font-mono leading-none rounded-md border font-semibold cursor-pointer ${
                                simSettings.wiggleEnabled 
                                  ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 uppercase' 
                                  : 'bg-transparent border-slate-800 text-slate-500 hover:text-slate-305'
                              }`}
                            >
                              {simSettings.wiggleEnabled ? 'Orbiting Active' : 'Orbit Stopped'}
                            </button>
                          </div>

                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Drift Calibration assistant section */}
                <CalibrationPanel 
                  rawInput={rawInput}
                  calibration={calibration}
                  setCalibration={setCalibration}
                />

                {/* Physical controller detect section */}
                <GamepadInfo 
                  gamepadState={gamepadState}
                  setGamepadState={setGamepadState}
                />

              </div>
            </div>

            {/* Live numerical telemetry readouts footer */}
            <footer className="bg-[#15181F] border border-slate-800 rounded-2xl p-4 md:p-5 shadow-xl">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                
                {/* Raw stick coordinate metrics */}
                <div className="space-y-1.5 border-r border-slate-800/80 max-sm:border-r-0 max-sm:border-b max-sm:pb-3.5 pr-2">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">1. Original Physical Stick Status</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Position Vector (x, y):</span>
                      <span className="text-red-400 font-bold">({rawInput.x.toFixed(4)}, {rawInput.y.toFixed(4)})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Rest Offset Magnitude:</span>
                      <span className="text-slate-500">{currentRawMagnitude.toFixed(4)}</span>
                    </div>
                  </div>
                </div>

                {/* Centered (Calibration shifted) stick coordinate metrics */}
                <div className="space-y-1.5 border-r border-slate-800/80 max-sm:border-r-0 max-sm:border-b max-sm:pb-3.5 px-2">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">2. Unbiased (Centered State)</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-40s font-medium text-slate-400">Centered Position (x, y):</span>
                      <span className="text-amber-400 font-bold">({centeredInput.x.toFixed(4)}, {centeredInput.y.toFixed(4)})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-40s font-medium text-slate-400">Centered Magnitude:</span>
                      <span className="text-slate-500">{currentCenteredMagnitude.toFixed(4)}</span>
                    </div>
                  </div>
                </div>

                {/* Corrected output coordinates metrics */}
                <div className="space-y-1.5 pl-2">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">3. Final Clean Corrected Output</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Output Vector (x, y):</span>
                      <span className="text-blue-400 font-bold">({correctedInput.x.toFixed(4)}, {correctedInput.y.toFixed(4)})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Output Magnitude:</span>
                      <span className={currentCorrectedMagnitude > 0.001 ? 'text-blue-400 font-bold' : 'text-slate-500'}>
                        {currentCorrectedMagnitude.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </footer>
          </>
        ) : (
          <AndroidStudio 
            webRawInput={rawInput} 
            deadzoneSettings={deadzoneSettings} 
          />
        )}

      </main>
    </div>
  );
}
