/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Vector2D, CalibrationOffset } from '../types';
import { ShieldCheck, Play, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface CalibrationPanelProps {
  rawInput: Vector2D;
  calibration: CalibrationOffset;
  setCalibration: (val: CalibrationOffset) => void;
}

export function CalibrationPanel({
  rawInput,
  calibration,
  setCalibration,
}: CalibrationPanelProps) {
  const [status, setStatus] = useState<'idle' | 'countdown' | 'sampling' | 'success'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [progress, setProgress] = useState(0);
  
  const samplesRef = useRef<{ x: number[]; y: number[] }>({ x: [], y: [] });
  const intervalRef = useRef<number | null>(null);

  const startCalibration = () => {
    setStatus('countdown');
    setCountdown(3);
    samplesRef.current = { x: [], y: [] };
  };

  // Countdown timer effect
  useEffect(() => {
    if (status !== 'countdown') return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setStatus('sampling');
      setProgress(0);
    }
  }, [countdown, status]);

  // Sampling polling effect
  useEffect(() => {
    if (status !== 'sampling') return;

    const sampleRateMs = 16; // ~60Hz
    const totalSampleTimeMs = 1500; // 1.5 seconds of sampling
    const maxSamples = totalSampleTimeMs / sampleRateMs;
    let sampledCount = 0;

    intervalRef.current = window.setInterval(() => {
      // Collect current live raw input
      samplesRef.current.x.push(rawInput.x);
      samplesRef.current.y.push(rawInput.y);
      
      sampledCount++;
      const currentProgress = (sampledCount / maxSamples) * 100;
      setProgress(Math.min(100, currentProgress));

      if (sampledCount >= maxSamples) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        
        // Calculate median offsets
        const median = (arr: number[]) => {
          if (arr.length === 0) return 0;
          const sorted = [...arr].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          return sorted.length % 2 !== 0 
            ? sorted[mid] 
            : (sorted[mid - 1] + sorted[mid]) / 2;
        };

        const driftX = median(samplesRef.current.x);
        const driftY = median(samplesRef.current.y);

        setCalibration({
          x: driftX,
          y: driftY,
          isCalibrated: true,
        });

        setStatus('success');
      }
    }, sampleRateMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [status, rawInput]);

  const handleResetCalibration = () => {
    setCalibration({ x: 0, y: 0, isCalibrated: false });
    setStatus('idle');
  };

  return (
    <div className="bg-[#15181F] rounded-2xl p-6 border border-slate-800 shadow-xl overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500/50 via-amber-500 to-amber-500/50" />
      
      <div className="flex items-center space-x-2.5 mb-4">
        <ShieldCheck className="w-5 h-5 text-amber-500" />
        <h2 className="text-sm font-semibold text-slate-205 uppercase tracking-wider font-sans">
          Hardware Calibration Assistant
        </h2>
      </div>

      {status === 'idle' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400 font-sans leading-relaxed">
            Does your input drift even when you aren't touching the thumbstick? 
            Calibrate it to establish a custom center. We will sample physical offset values for 1.5s to align drift cleanly to $(0,0)$.
          </p>
          
          <div className="bg-[#0F1115] border border-slate-800 p-3 rounded-xl flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500/80 mt-0.5 shrink-0" />
            <div className="text-[11px] text-slate-400 font-sans">
              <span className="text-amber-400 font-medium font-mono">Prerequisite:</span> Let go of your controller or mouse. Ensure the stick sits completely at rest on its physical spring before starting.
            </div>
          </div>

          <button
            onClick={startCalibration}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-550 hover:to-amber-450 text-slate-950 font-bold rounded-xl transition-all shadow-[0_4px_12px_rgba(245,158,11,0.2)] hover:shadow-[0_4px_16px_rgba(245,158,11,0.3)] active:scale-[0.98] cursor-pointer text-sm font-sans"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Begin Calibration</span>
          </button>
        </div>
      )}

      {status === 'countdown' && (
        <div className="flex flex-col items-center justify-center py-6">
          <div className="text-4xl font-extrabold text-amber-400 font-mono animate-bounce">
            {countdown}
          </div>
          <p className="text-xs text-amber-250 mt-3 font-semibold uppercase tracking-widest animate-pulse">
            Hands Off Joystick...
          </p>
        </div>
      )}

      {status === 'sampling' && (
        <div className="space-y-4 py-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-medium">Sampling Rest Vectors (60Hz)</span>
            <span className="text-amber-450 font-mono font-bold">{Math.round(progress)}%</span>
          </div>
          
          <div className="w-full h-2 bg-[#0F1115] rounded-full overflow-hidden border border-slate-800">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-75 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-[10px] text-slate-500 font-mono text-center">
            Gathered: {samplesRef.current.x.length} physical coordinate samples
          </p>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-start space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs font-sans text-slate-300">
              <span className="text-emerald-400 font-bold">Calibration Active!</span> Calculated drift zero-bias offsets successfully. Phantom inputs are dynamically neutralized.
            </div>
          </div>

          {/* Calibrated stats */}
          <div className="grid grid-cols-2 gap-3 bg-[#0F1115] p-3 rounded-xl border border-slate-800 font-mono text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Bias X-Offset</span>
              <span className="text-amber-450 font-bold">{calibration.x.toFixed(4)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Bias Y-Offset</span>
              <span className="text-amber-450 font-bold">{calibration.y.toFixed(4)}</span>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={startCalibration}
              className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 bg-[#0F1115] hover:bg-[#1C202B] border border-slate-800 rounded-lg text-xs font-medium text-amber-400 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Recalibrate</span>
            </button>
            <button
              onClick={handleResetCalibration}
              className="flex-1 py-2 px-3 bg-[#0F1115] hover:bg-red-950/20 border border-slate-800 hover:border-red-500/20 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 transition-all cursor-pointer"
            >
              Reset Offsets
            </button>
          </div>
        </div>
      )}

      {/* Active Calibration indicator */}
      {calibration.isCalibrated && status !== 'success' && (
        <div className="mt-3 flex justify-between items-center text-xs border-t border-slate-800 pt-3">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-400">Offset: ({calibration.x.toFixed(2)}, {calibration.y.toFixed(2)})</span>
          </div>
          <button 
            onClick={handleResetCalibration} 
            className="text-[10px] text-red-400 hover:underline font-mono cursor-pointer"
          >
            Disable Center
          </button>
        </div>
      )}
    </div>
  );
}
