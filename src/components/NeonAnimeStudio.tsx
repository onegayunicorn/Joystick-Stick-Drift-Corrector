/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Smartphone, 
  Tv, 
  Grid, 
  Layout, 
  Layers, 
  Check, 
  Copy, 
  Play, 
  Gamepad2, 
  ArrowLeft, 
  ArrowRight, 
  Info,
  Compass,
  Sliders,
  Settings,
  Heart,
  Flame,
  Star,
  Activity,
  Bot
} from 'lucide-react';
import { Vector2D } from '../types';

interface NeonAnimeStudioProps {
  rawInput: Vector2D;
  correctedInput: Vector2D;
}

export function NeonAnimeStudio({ rawInput, correctedInput }: NeonAnimeStudioProps) {
  const [activeScreen, setActiveScreen] = useState<'hub' | 'mobile' | 'feed' | 'menu'>('hub');
  const [selectedTheme, setSelectedTheme] = useState<'pink-cyan' | 'cyan-purple' | 'purple-blue'>('pink-cyan');
  const [characterPos, setCharacterPos] = useState({ x: 0, y: 0 });
  const [useCorrectedSignal, setUseCorrectedSignal] = useState(true);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  
  // Custom interaction states for each view configuration
  const [activeHubTab, setActiveHubTab] = useState<'library' | 'favorites' | 'explore'>('library');
  const [activeMobileScreen, setActiveMobileScreen] = useState<'chibi-home' | 'menu-select'>('chibi-home');
  const [mobileChibiSelection, setMobileChibiSelection] = useState<string>('cute-cat');
  const [activeFeedTab, setActiveFeedTab] = useState<'home' | 'explore' | 'profile'>('home');
  const [likedEpisodes, setLikedEpisodes] = useState<Record<string, boolean>>({});
  const [apiLogs, setApiLogs] = useState<string[]>([
    'System: Initialized Neon Anime Subsystem.',
    'System: Waiting for joystick input events...'
  ]);

  // Steer the chibi with active joystick vector inputs (scaled)
  useEffect(() => {
    const inputSignal = useCorrectedSignal ? correctedInput : rawInput;
    
    // Smoothly glide character position based on joystick delta
    setCharacterPos(prev => {
      const sensitivity = 4.5;
      const targetX = prev.x + inputSignal.x * sensitivity;
      const targetY = prev.y + inputSignal.y * sensitivity;
      
      // Keep boundaries clamped inside the emulator preview card
      return {
        x: Math.min(Math.max(targetX, -90), 90),
        y: Math.min(Math.max(targetY, -90), 90)
      };
    });

    // Logging joystick feedback events
    const magnitude = Math.sqrt(inputSignal.x * inputSignal.x + inputSignal.y * inputSignal.y);
    if (magnitude > 0.1) {
      const activeStateStr = useCorrectedSignal ? 'Corrected Signal' : 'DRIFTING Signal';
      setApiLogs(prev => [
        `[INPUT] Vector change: (${inputSignal.x.toFixed(2)}, ${inputSignal.y.toFixed(2)}) magnitude=${magnitude.toFixed(2)} via [${activeStateStr}]`,
        ...prev.slice(0, 8)
      ]);
    }
  }, [rawInput, correctedInput, useCorrectedSignal]);

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const getThemeClasses = () => {
    switch (selectedTheme) {
      case 'pink-cyan':
        return {
          bg: 'from-[#FF48C0] to-[#40F0FF]',
          glow: 'shadow-[#FF48C0]/35 border-[#FF48C0]/50 text-[#FF48C0]',
          accent: '#FF48C0',
          grad: 'linear-gradient(135deg, #FF48C0, #40F0FF)',
          textColor: 'text-[#FF48C0]'
        };
      case 'cyan-purple':
        return {
          bg: 'from-[#40F0FF] to-[#B060FF]',
          glow: 'shadow-[#40F0FF]/35 border-[#40F0FF]/50 text-[#40F0FF]',
          accent: '#40F0FF',
          grad: 'linear-gradient(135deg, #40F0FF, #B060FF)',
          textColor: 'text-[#40F0FF]'
        };
      case 'purple-blue':
        return {
          bg: 'from-[#B060FF] to-[#4080FF]',
          glow: 'shadow-[#B060FF]/35 border-[#B060FF]/50 text-[#B060FF]',
          accent: '#B060FF',
          grad: 'linear-gradient(135deg, #B060FF, #4080FF)',
          textColor: 'text-[#B060FF]'
        };
    }
  };

  const activeTheme = getThemeClasses();

  // Code snippets database for copying
  const cssCodeString = `/* === NEON ANIME THEME SPECIFICATIONS === */
:root {
  --neon-pink: #FF48C0;
  --neon-cyan: #40F0FF;
  --neon-purple: #B060FF;
  --neon-blue: #4080FF;

  --bg-dark: #121226;
  --bg-card: #1E1E3F;
  --bg-highlight: #2A2A55;

  --font-title: 'Orbitron', 'Space Grotesk', sans-serif;
  --font-body: 'Inter', sans-serif;
}

.neon-glow {
  filter: drop-shadow(0 0 10px currentColor);
}

.glow-text {
  text-shadow: 0 0 8px currentColor, 0 0 16px currentColor;
}

.card-glow {
  box-shadow: 0 0 15px rgba(64, 240, 255, 0.25), 
              0 0 30px rgba(255, 72, 192, 0.15);
}`;

  const jsxSnippetString = `// Interactive Chibi Steering Node
export function ChibiSteerer({ inputSignal }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setPos(prev => ({
      x: clamp(prev.x + inputSignal.x * 5, -100, 100),
      y: clamp(prev.y + inputSignal.y * 5, -100, 100)
    }));
  }, [inputSignal]);

  return (
    <div className="absolute transition-all duration-75" 
         style={{ transform: \`translate(\${pos.x}px, \${pos.y}px)\` }}>
       <span className="text-3xl filter drop-shadow-[0_0_8px_#FF48C0]">🌸</span>
    </div>
  );
}`;

  return (
    <div className="bg-[#15181F] rounded-2xl border border-slate-800 shadow-xl overflow-hidden relative p-5 md:p-6 space-y-6">
      {/* Anime Theme font injection */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Quicksand:wght@500;600;700&display=swap');
        .anime-font-title {
          font-family: 'Orbitron', sans-serif;
        }
        .anime-font-body {
          font-family: 'Quicksand', sans-serif;
        }
      `}} />

      {/* Top Banner Ribbon */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${activeTheme.bg}`} />

      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-[#FF48C0] animate-spin" style={{ animationDuration: '3s' }} />
            <h2 className="text-base font-bold text-slate-100 font-display uppercase tracking-wide">
              Neon Anime Theme Dashboard Studio
            </h2>
            <span className="text-[10px] font-mono bg-pink-500/10 text-pink-400 border border-pink-500/20 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
              Preview Playground
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Interact with modular neon dashboards. Switch between the 4 screen configurations, change gradients, and test the analog stick coordinates to guide visual widgets.
          </p>
        </div>

        {/* Theme select controls */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Aesthetic Base:</span>
          <div className="flex p-0.5 bg-[#0F1115] rounded-xl border border-slate-800">
            <button
              onClick={() => setSelectedTheme('pink-cyan')}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                selectedTheme === 'pink-cyan' ? 'bg-gradient-to-r from-[#FF48C0] to-[#40F0FF] text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pink/Cyan
            </button>
            <button
              onClick={() => setSelectedTheme('cyan-purple')}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                selectedTheme === 'cyan-purple' ? 'bg-gradient-to-r from-[#40F0FF] to-[#B060FF] text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cyan/Purple
            </button>
            <button
              onClick={() => setSelectedTheme('purple-blue')}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                selectedTheme === 'purple-blue' ? 'bg-gradient-to-r from-[#B060FF] to-[#4080FF] text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Purple/Blue
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid Builder: Options left, Interactive Canvas center, Sandbox Console right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* Screen layout buttons */}
        <div className="xl:col-span-3 space-y-3.5">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Choose Showcase Layout:</div>
          
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setActiveScreen('hub')}
              className={`p-3 rounded-xl border text-left transition-all relative flex items-center space-x-3 cursor-pointer ${
                activeScreen === 'hub' ? 'bg-pink-500/5 border-[#FF48C0]/30 shadow-lg shadow-pink-500/5' : 'bg-[#0F1115] border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="p-2 rounded-lg bg-pink-500/10 text-[#FF48C0]">
                <Layout className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-200 block uppercase tracking-wide anime-font-body">1. Anime Hub Portal</span>
                <span className="text-[10px] text-slate-400">Library navigation panel</span>
              </div>
            </button>

            <button
              onClick={() => setActiveScreen('mobile')}
              className={`p-3 rounded-xl border text-left transition-all relative flex items-center space-x-3 cursor-pointer ${
                activeScreen === 'mobile' ? 'bg-cyan-500/5 border-[#40F0FF]/30 shadow-lg shadow-cyan-500/5' : 'bg-[#0F1115] border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="p-2 rounded-lg bg-cyan-500/10 text-[#40F0FF]">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-200 block uppercase tracking-wide anime-font-body">2. Mobile Chibi Unit</span>
                <span className="text-[10px] text-slate-400">Chibi screens switcher</span>
              </div>
            </button>

            <button
              onClick={() => setActiveScreen('feed')}
              className={`p-3 rounded-xl border text-left transition-all relative flex items-center space-x-3 cursor-pointer ${
                activeScreen === 'feed' ? 'bg-purple-500/5 border-[#B060FF]/30 shadow-lg shadow-purple-500/5' : 'bg-[#0F1115] border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="p-2 rounded-lg bg-purple-500/10 text-[#B060FF]">
                <Tv className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-200 block uppercase tracking-wide anime-font-body">3. AnimeNow Feed</span>
                <span className="text-[10px] text-slate-400">Streaming episode list</span>
              </div>
            </button>

            <button
              onClick={() => setActiveScreen('menu')}
              className={`p-3 rounded-xl border text-left transition-all relative flex items-center space-x-3 cursor-pointer ${
                activeScreen === 'menu' ? 'bg-blue-500/5 border-[#4080FF]/30 shadow-lg shadow-blue-500/5' : 'bg-[#0F1115] border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="p-2 rounded-lg bg-blue-500/10 text-[#4080FF]">
                <Grid className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-200 block uppercase tracking-wide anime-font-body">4. Icon Menu Hub</span>
                <span className="text-[10px] text-slate-400">Chibi icon matrix</span>
              </div>
            </button>
          </div>

          {/* Interactive Steer Link Module */}
          <div className="bg-[#0F1115] rounded-xl border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold flex items-center gap-1">
                <Gamepad2 className="w-3.5 h-3.5 text-blue-400" /> Joystick Steeler
              </span>
              <span className={`text-[9px] font-mono px-1.5 rounded uppercase font-bold ${
                useCorrectedSignal ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse'
              }`}>
                {useCorrectedSignal ? 'Corrected Signal' : 'Unfiltered Drift'}
              </span>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
              Choose which joystick signal moves the floating unit center inside the neon cards. Try drifting to feel the difference!
            </p>

            <div className="grid grid-cols-2 gap-1.5 pt-1.5">
              <button
                onClick={() => setUseCorrectedSignal(true)}
                className={`py-1.5 px-2.5 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer text-center ${
                  useCorrectedSignal ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-450' : 'bg-transparent border-slate-800 text-slate-400 hover:text-slate-350'
                }`}
              >
                Use Corrected
              </button>
              <button
                onClick={() => setUseCorrectedSignal(false)}
                className={`py-1.5 px-2.5 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer text-center ${
                  !useCorrectedSignal ? 'bg-red-500/15 border-red-500/30 text-red-450' : 'bg-transparent border-slate-800 text-slate-400 hover:text-slate-350'
                }`}
              >
                Use Drifty Raw
              </button>
            </div>

            {/* Float Pos Reset */}
            <button
              onClick={() => setCharacterPos({ x: 0, y: 0 })}
              className="w-full py-1 bg-slate-800/80 hover:bg-slate-750 text-[10px] text-slate-300 rounded font-bold transition-all text-center"
            >
              Snap Indicator to Center
            </button>
          </div>
        </div>

        {/* INTERACTIVE NEON SIMULATOR CANVAS VIEW */}
        <div className="xl:col-span-5 flex flex-col items-center justify-center">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 animate-pulse" /> Live Neon Component Execution
          </div>

          {/* Core Interactive Card Frame */}
          <div className="w-full max-w-[340px] rounded-[2.5rem] border-[8px] border-[#1E1E3F] bg-[#121226] text-white overflow-hidden shadow-2xl relative flex flex-col items-stretch card-glow select-none min-h-[460px]">
            
            {/* Top aesthetic status strip */}
            <div className="p-3 bg-[#1A1A35] flex justify-between items-center text-[10px] font-mono text-slate-400 border-b border-[#2A2A55]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              <span className="text-[#40F0FF] animate-pulse">● CHIBI_CORE</span>
              <span className="text-[9px] text-[#FF48C0]">X:{characterPos.x.toFixed(0)} Y:{characterPos.y.toFixed(0)}</span>
            </div>

            {/* ACTIVE SCREEN TRANSITIONS */}
            <div className="flex-1 p-4 relative flex flex-col items-stretch overflow-hidden">
              <AnimatePresence mode="wait">
                {/* 1. ANIME HUB PORTAL */}
                {activeScreen === 'hub' && (
                  <motion.div
                    key="hub-layout"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-4 flex-1 flex flex-col justify-between"
                  >
                    {/* Header Bar */}
                    <div className="border-2 border-[#FF48C0] rounded-xl p-3 text-center bg-[#1E1E3F] shadow-lg relative">
                      <span className="absolute top-1 left-2 text-[8px] font-mono text-[#FF48C0] tracking-widest font-bold">PORTAL</span>
                      <h3 className="anime-font-title text-base font-black text-white glow-text tracking-wider filter drop-shadow-[0_0_6px_#FF48C0]" style={{ color: activeTheme.accent }}>
                        Anime Hub
                      </h3>
                    </div>

                    {/* Grid navigation options */}
                    <div className="grid grid-cols-3 gap-2">
                      <button 
                        onClick={() => setActiveHubTab('library')}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          activeHubTab === 'library' ? 'bg-[#FF48C0]/15 border-[#FF48C0] text-[#FF48C0]' : 'bg-[#1E1E3F] border-[#2A2A55] text-slate-350'
                        }`}
                      >
                        <span className="text-lg block filter drop-shadow-[0_0_4px_currentColor]">🪐</span>
                        <span className="text-[9px] font-bold block mt-1 tracking-wide anime-font-body">ライブラリ</span>
                      </button>

                      <button 
                        onClick={() => setActiveHubTab('favorites')}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          activeHubTab === 'favorites' ? 'bg-[#40F0FF]/15 border-[#40F0FF] text-[#40F0FF]' : 'bg-[#1E1E3F] border-[#2A2A55] text-slate-350'
                        }`}
                      >
                        <span className="text-lg block filter drop-shadow-[0_0_4px_currentColor]">💖</span>
                        <span className="text-[9px] font-bold block mt-1 tracking-wide anime-font-body">ルブオン</span>
                      </button>

                      <button 
                        onClick={() => setActiveHubTab('explore')}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          activeHubTab === 'explore' ? 'bg-[#B060FF]/15 border-[#B060FF] text-[#B060FF]' : 'bg-[#1E1E3F] border-[#2A2A55] text-slate-350'
                        }`}
                      >
                        <span className="text-lg block filter drop-shadow-[0_0_4px_currentColor]">🌍</span>
                        <span className="text-[9px] font-bold block mt-1 tracking-wide anime-font-body">擽らる</span>
                      </button>
                    </div>

                    {/* Gradient Poster banner */}
                    <div className="rounded-xl p-3 bg-gradient-to-br from-[#1E1E3F] to-[#121226] border border-[#2A2A55] relative flex-1 flex flex-col justify-center items-center h-28 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r opacity-20" style={{ background: activeTheme.grad }} />
                      
                      {/* Character representation in center */}
                      <div className="relative text-center space-y-1.5">
                        <span className="text-4xl block filter drop-shadow-[0_0_8px_#40F0FF]">✨</span>
                        <p className="text-[9.5px] font-mono tracking-wide text-slate-300">HUB_ACTIVE: {activeHubTab.toUpperCase()}</p>
                      </div>
                    </div>

                    {/* Quick Floating interaction */}
                    <div className="flex justify-between items-center bg-[#1E1E3F]/80 p-2 border border-[#2A2A55] rounded-xl text-[10px]">
                      <span className="text-slate-300">Quick feedback chat:</span>
                      <button 
                        onClick={() => {
                          setApiLogs(prev => ['[HUB] Ping processed successfully!', ...prev]);
                        }}
                        className="py-1 px-3 rounded bg-[#FF48C0] text-slate-950 font-bold tracking-wider text-[9px] cursor-pointer"
                      >
                        💬 PIN
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* 2. CHIBI MOBILE SWITCHER */}
                {activeScreen === 'mobile' && (
                  <motion.div
                    key="mobile-layout"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-4 flex-1 flex flex-col justify-between"
                  >
                    {/* Device Header */}
                    <div className="flex justify-between items-center border-b border-[#2A2A55] pb-2 text-[10px] font-mono">
                      <button 
                        onClick={() => setActiveMobileScreen(prev => prev === 'chibi-home' ? 'menu-select' : 'chibi-home')}
                        className="text-[#40F0FF] hover:underline cursor-pointer"
                      >
                        ← Swap Screen
                      </button>
                      <span className="text-slate-300">日本末云エ核ツ</span>
                      <span className="text-[#FF48C0]">⋯</span>
                    </div>

                    {activeMobileScreen === 'chibi-home' ? (
                      <div className="space-y-3 flex-1 flex flex-col justify-between">
                        {/* Character container stage */}
                        <div className="bg-[#1A1A35] rounded-xl p-3 border border-[#2A2A55] flex flex-col items-center justify-center relative min-h-[140px] overflow-hidden">
                          {/* Unit selection graphics overlay */}
                          <div className="flex items-center space-x-4">
                            <span className="text-xl opacity-40 select-none">🐱</span>
                            <div className="text-center">
                              <span className="text-4xl block filter drop-shadow-[0_0_12px_#FF48C0] animate-bounce">🦄</span>
                              <span className="text-[10px] font-bold text-[#FF48C0] tracking-wider block mt-1">MAIN UNIT</span>
                            </div>
                            <span className="text-xl opacity-40 select-none">🦊</span>
                          </div>

                          <div className="absolute top-2 right-2 flex space-x-1">
                            <span className="text-[9px] font-mono bg-[#FF48C0]/20 text-[#FF48C0] border border-[#FF48C0]/30 px-1.5 rounded uppercase">LV 99</span>
                          </div>
                        </div>

                        {/* Title font showcase */}
                        <div className="text-center py-2">
                          <h4 className="anime-font-title text-base font-black glow-text tracking-widest text-[#40F0FF] filter drop-shadow-[0_0_8px_#40F0FF]">
                            フタミンガクタ
                          </h4>
                          <p className="text-[9px] text-[#B060FF] tracking-widest uppercase font-bold text-center mt-1">Slasher Blade Active</p>
                        </div>

                        {/* Prim button */}
                        <button 
                          onClick={() => {
                            setApiLogs(prev => ['[MOBILE] Primary blade sweep triggered!', ...prev]);
                          }}
                          className="w-full py-2 bg-gradient-to-r from-[#FF48C0] to-[#40F0FF] text-slate-950 font-black text-xs uppercase rounded-xl tracking-wider hover:opacity-90 shadow-md shadow-[#FF48C0]/25 transition-all text-center cursor-pointer"
                        >
                          控动·幼感
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 flex-1 flex flex-col justify-between">
                        {/* Selector grid matrix */}
                        <div className="grid grid-cols-3 gap-2 bg-[#1A1A35] p-3 rounded-xl border border-[#2A2A55]">
                          <button 
                            onClick={() => setMobileChibiSelection('cute-cat')}
                            className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all ${
                              mobileChibiSelection === 'cute-cat' ? 'border-[#FF48C0] bg-[#FF48C0]/10' : 'border-transparent bg-[#121226]'
                            }`}
                          >
                            <span className="text-2xl filter drop-shadow-[0_0_4px_#FF48C0]">🐱</span>
                            <span className="text-[8px] text-slate-400 mt-1">Neko</span>
                          </button>

                          <button 
                            onClick={() => setMobileChibiSelection('chibi-unicorn')}
                            className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all ${
                              mobileChibiSelection === 'chibi-unicorn' ? 'border-[#40F0FF] bg-[#40F0FF]/10' : 'border-transparent bg-[#121226]'
                            }`}
                          >
                            <span className="text-2xl filter drop-shadow-[0_0_4px_#40F0FF]">🦄</span>
                            <span className="text-[8px] text-slate-400 mt-1">Pop</span>
                          </button>

                          <button 
                            onClick={() => setMobileChibiSelection('red-fox')}
                            className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all ${
                              mobileChibiSelection === 'red-fox' ? 'border-[#B060FF] bg-[#B060FF]/10' : 'border-transparent bg-[#121226]'
                            }`}
                          >
                            <span className="text-2xl filter drop-shadow-[0_0_4px_#B060FF]">🦊</span>
                            <span className="text-[8px] text-slate-400 mt-1">Kitsune</span>
                          </button>
                        </div>

                        {/* Title text */}
                        <div className="text-center">
                          <h4 className="anime-font-title text-base font-black glow-text tracking-widest text-[#B060FF] filter drop-shadow-[0_0_8px_#B060FF]">
                            UNIT RECRUIT
                          </h4>
                        </div>

                        <button 
                          onClick={() => {
                            setApiLogs(prev => [`[MOBILE] Locked character profile: ${mobileChibiSelection}`, ...prev]);
                          }}
                          className="w-full py-2 bg-gradient-to-r from-[#40F0FF] to-[#B060FF] text-slate-950 font-black text-xs uppercase rounded-xl tracking-wider hover:opacity-90 shadow-md transition-all text-center cursor-pointer"
                        >
                          実賜持动搭
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* 3. ANIMENOW FEED */}
                {activeScreen === 'feed' && (
                  <motion.div
                    key="feed-layout"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-4 flex-1 flex flex-col justify-between"
                  >
                    {/* Brand Banner */}
                    <div className="border border-[#B060FF] bg-[#1E1E3F] p-2.5 rounded-xl flex items-center justify-between">
                      <h3 className="anime-font-title text-sm font-black glow-text tracking-widest text-[#FF48C0] filter drop-shadow-[0_0_6px_#FF48C0]">
                        AnimeNow
                      </h3>
                      <span className="text-[8.5px] font-mono bg-[#B060FF]/25 text-[#B060FF] px-2 py-0.5 rounded border border-[#B060FF]/35">v4.0 FEED</span>
                    </div>

                    {/* Simple Sub Tabs */}
                    <div className="grid grid-cols-3 gap-1.5 text-[9px] font-bold uppercase tracking-wider">
                      <button 
                        onClick={() => setActiveFeedTab('home')}
                        className={`py-1 rounded text-center transition-all cursor-pointer ${
                          activeFeedTab === 'home' ? 'bg-[#FF48C0] text-slate-950 font-black' : 'bg-[#1E1E3F] text-slate-400'
                        }`}
                      >
                        Home
                      </button>
                      <button 
                        onClick={() => setActiveFeedTab('explore')}
                        className={`py-1 rounded text-center transition-all cursor-pointer ${
                          activeFeedTab === 'explore' ? 'bg-[#40F0FF] text-slate-950 font-black' : 'bg-[#1E1E3F] text-slate-400'
                        }`}
                      >
                        Explore
                      </button>
                      <button 
                        onClick={() => setActiveFeedTab('profile')}
                        className={`py-1 rounded text-center transition-all cursor-pointer ${
                          activeFeedTab === 'profile' ? 'bg-[#B060FF] text-slate-950 font-black' : 'bg-[#1E1E3F] text-slate-400'
                        }`}
                      >
                        Profile
                      </button>
                    </div>

                    {/* Episode Rows Container */}
                    <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[160px] pr-1">
                      <div className="p-2.5 rounded-xl bg-[#1E1E3F] border border-[#2A2A55] flex justify-between items-center hover:border-[#FF48C0] transition-colors">
                        <div className="flex items-center space-x-2">
                          <span className="text-xl">⚔️</span>
                          <div className="leading-tight">
                            <span className="font-bold text-xs block text-slate-200">Genesis Mech Ep 14</span>
                            <span className="text-[8.5px] text-slate-400 font-mono">Status: Released Today</span>
                          </div>
                        </div>
                        <button
                          onClick={() => setLikedEpisodes(prev => ({ ...prev, ep14: !prev.ep14 }))}
                          className="p-1 text-slate-450 hover:text-[#FF48C0]"
                        >
                          <Heart className={`w-3.5 h-3.5 ${likedEpisodes.ep14 ? 'fill-[#FF48C0] text-[#FF48C0]' : 'text-slate-400'}`} />
                        </button>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#1E1E3F] border border-[#2A2A55] flex justify-between items-center hover:border-[#40F0FF] transition-colors">
                        <div className="flex items-center space-x-2">
                          <span className="text-xl">🌸</span>
                          <div className="leading-tight">
                            <span className="font-bold text-xs block text-slate-200">K-On Retro Live Concert</span>
                            <span className="text-[8.5px] text-slate-400 font-mono">Status: Standard Stream</span>
                          </div>
                        </div>
                        <button
                          onClick={() => setLikedEpisodes(prev => ({ ...prev, ep15: !prev.ep15 }))}
                          className="p-1 text-slate-450 hover:text-[#40F0FF]"
                        >
                          <Heart className={`w-3.5 h-3.5 ${likedEpisodes.ep15 ? 'fill-[#40F0FF] text-[#40F0FF]' : 'text-slate-400'}`} />
                        </button>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#1E1E3F] border border-[#2A2A55] flex justify-between items-center hover:border-[#B060FF] transition-colors">
                        <div className="flex items-center space-x-2">
                          <span className="text-xl">🌌</span>
                          <div className="leading-tight">
                            <span className="font-bold text-xs block text-slate-200">Astro-Rider Infinite Blue</span>
                            <span className="text-[8.5px] text-slate-400 font-mono">Status: Premium Only</span>
                          </div>
                        </div>
                        <button
                          onClick={() => setLikedEpisodes(prev => ({ ...prev, ep16: !prev.ep16 }))}
                          className="p-1 text-slate-450 hover:text-[#B060FF]"
                        >
                          <Heart className={`w-3.5 h-3.5 ${likedEpisodes.ep16 ? 'fill-[#B060FF] text-[#B060FF]' : 'text-slate-400'}`} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 4. ICON MENU HUB */}
                {activeScreen === 'menu' && (
                  <motion.div
                    key="menu-layout"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-4 flex-1 flex flex-col justify-between"
                  >
                    {/* Top navigation row */}
                    <div className="flex justify-between items-center border-b border-[#2A2A55] pb-2 text-[10px] font-mono">
                      <span className="text-[#40F0FF]">← PREV</span>
                      <h4 className="anime-font-title font-black text-[#FF48C0]">ICON_MATRIX</h4>
                      <span className="text-[#FF48C0]">NEXT →</span>
                    </div>

                    {/* Avatar Grid matrix */}
                    <div className="grid grid-cols-3 gap-2 flex-1 pt-1">
                      <div className="bg-[#1E1E3F] border border-[#212140] hover:border-[#40F0FF] rounded-xl p-2.5 flex flex-col items-center justify-center relative transition-all group">
                        <span className="text-2xl filter drop-shadow-[0_0_4px_#40F0FF]">🐬</span>
                        <span className="text-[8px] text-slate-400 mt-1 font-mono">CHIBI-BLU</span>
                      </div>

                      <div className="bg-[#1E1E3F] border border-[#212140] hover:border-[#FF48C0] rounded-xl p-2.5 flex flex-col items-center justify-center relative transition-all">
                        <span className="text-2xl filter drop-shadow-[0_0_4px_#FF48C0]">🐰</span>
                        <span className="text-[8px] text-slate-400 mt-1 font-mono">CHIBI-PNK</span>
                      </div>

                      <div className="bg-gradient-to-br from-[#FF48C0] to-[#40F0FF] border border-[#FF48C0] rounded-xl p-2.5 flex flex-col items-center justify-center relative transition-all shadow-md">
                        <span className="text-2xl filter drop-shadow-[0_0_6px_#121226] animate-pulse">👑</span>
                        <span className="text-[8px] text-slate-950 mt-1 font-mono font-bold">LEGEND</span>
                      </div>

                      <button 
                        onClick={() => {
                          setApiLogs(prev => ['[MENU] Selected Briefcase module', ...prev]);
                        }}
                        className="bg-[#1E1E3F] hover:bg-[#23234a] rounded-xl p-3 text-lg flex items-center justify-center text-[#FF48C0] border border-[#2A2A55] filter drop-shadow-[0_0_2px_#FF48C0] cursor-pointer"
                      >
                        💼
                      </button>

                      <button 
                        onClick={() => {
                          setApiLogs(prev => ['[MENU] Selected Verified Check module', ...prev]);
                        }}
                        className="bg-[#1E1E3F] hover:bg-[#23234a] rounded-xl p-3 text-lg flex items-center justify-center text-[#40F0FF] border border-[#2A2A55] filter drop-shadow-[0_0_2px_#40F0FF] cursor-pointer"
                      >
                        ✅
                      </button>

                      <button 
                        onClick={() => {
                          setApiLogs(prev => ['[MENU] Selected Media Streamer module', ...prev]);
                        }}
                        className="bg-[#1E1E3F] hover:bg-[#23234a] rounded-xl p-3 text-lg flex items-center justify-center text-[#B060FF] border border-[#2A2A55] filter drop-shadow-[0_0_2px_#B060FF] cursor-pointer"
                      >
                        🎥
                      </button>
                    </div>

                    {/* Grad menu bot navigation */}
                    <div className="bg-gradient-to-r from-[#40F0FF]/15 to-[#B060FF]/15 p-2 rounded-xl border border-[#40F0FF]/35 flex justify-around text-[10px] uppercase font-bold text-slate-200">
                      <span className="hover:text-white cursor-pointer select-none">🏠 Home</span>
                      <span className="hover:text-white cursor-pointer select-none">📖 Lib</span>
                      <span className="hover:text-white cursor-pointer select-none">👤 Prof</span>
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>

              {/* FLOATING CHIBI CURSOR - CONTROLLED BY ACTIVE JOYSTICK VECTOR */}
              <motion.div
                className="absolute w-12 h-12 flex items-center justify-center pointer-events-none z-43 transition-all duration-75"
                style={{
                  left: `calc(50% - 24px + ${characterPos.x}px)`,
                  top: `calc(50% - 24px + ${characterPos.y}px)`
                }}
              >
                <div className="relative group/floating flex flex-col items-center">
                  <span className="text-3xl filter drop-shadow-[0_0_8px_#40F0FF] animate-bounce">🦄</span>
                  {/* Status Indicator bubble */}
                  <span className="text-[7.5px] font-mono bg-slate-950/90 text-[#40F0FF] px-1 rounded absolute -top-5 shrink-0 block tracking-tight">
                    {useCorrectedSignal ? 'UNBIASED' : 'DRIFTING'}
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Simulated Bezel notch base */}
            <div className="bg-[#1A1A35] py-3.5 flex justify-center items-center border-t border-[#2A2A55]">
              <div className="w-20 h-1 bg-slate-600 rounded-full" />
            </div>
          </div>
        </div>

        {/* SANDBOX CONSOLE TERMINAL AND CODE SNIPPET VISUALIZER (xl-col-span-4) */}
        <div className="xl:col-span-4 space-y-4">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest flex items-center gap-1">
            <Bot className="w-3.5 h-3.5 text-blue-400" /> Playground Console & Telemetry
          </div>

          {/* Interactive logging */}
          <div className="bg-[#0A0D12] rounded-xl border border-slate-900 p-3.5 flex flex-col h-[155px]">
            <div className="text-[8.5px] text-slate-500 font-mono uppercase tracking-wider mb-2">Live Joystick Interception Bus</div>
            <div className="flex-1 overflow-y-auto font-mono text-[9.5px] text-slate-300 space-y-1.5 scrollbar-hidden">
              {apiLogs.map((log, index) => (
                <div key={index} className="truncate select-none opacity-90 leading-tight border-l border-blue-500/20 pl-1.5">
                  {log}
                </div>
              ))}
            </div>
          </div>

          {/* Theme specifications files sharing options */}
          <div className="bg-[#0F1115] rounded-xl border border-slate-800 p-4 space-y-3">
            <div className="flex items-center space-x-1.5 border-b border-slate-800 pb-2">
              <Layers className="w-4 h-4 text-pink-500" />
              <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider anime-font-body">
                Theme Integration Code
              </h4>
            </div>

            <p className="text-[10.5px] text-slate-400 leading-normal">
              Grab the fully matching stylesheet variables or the reactive cursor positioning component to bootstrap in your own project.
            </p>

            <div className="col-span-2 space-y-2">
              {/* Copy Stylesheet */}
              <div className="flex items-center justify-between p-2 bg-[#1A1C23] rounded-lg border border-slate-800 text-[11px]">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-slate-450 font-mono">design_tokens.css</span>
                </div>
                <button
                  onClick={() => handleCopy(cssCodeString, 'css')}
                  className="p-1 px-2.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-450 text-[10px] flex items-center gap-1 font-bold cursor-pointer transition-colors"
                >
                  {copiedSection === 'css' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === 'css' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Copy React Steerer */}
              <div className="flex items-center justify-between p-2 bg-[#1A1C23] rounded-lg border border-slate-800 text-[11px]">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-slate-450 font-mono">ChibiSteerCursor.jsx</span>
                </div>
                <button
                  onClick={() => handleCopy(jsxSnippetString, 'jsx')}
                  className="p-1 px-2.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-450 text-[10px] flex items-center gap-1 font-bold cursor-pointer transition-colors"
                >
                  {copiedSection === 'jsx' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === 'jsx' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
