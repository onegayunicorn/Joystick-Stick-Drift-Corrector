/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Code, 
  Usb, 
  Bluetooth, 
  RefreshCw, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  Database, 
  Layers,
  Terminal,
  Tablet,
  FileJson,
  Wifi,
  Battery,
  Smartphone,
  Check,
  Clipboard,
  Sliders,
  Sparkles
} from 'lucide-react';
import { Vector2D, DeadzoneSettings } from '../types';
import { clamp, sign, getMagnitude } from '../utils/math';

// Gamapad Drift Dataset interface
interface GamepadDataset {
  id: string;
  name: string;
  deviceType: 'Bluetooth' | 'USB';
  manufacture: string;
  reportedDriftX: number;
  reportedDriftY: number;
  reportedJitter: number;
  description: string;
}

// REST Endpoint interface
interface MockEndpoint {
  method: 'GET' | 'POST';
  path: string;
  description: string;
  responseBody: string;
}

const PRESET_DATASETS: GamepadDataset[] = [
  {
    id: 'dualsense-worn',
    name: 'PS5 DualSense (Carbon Wear)',
    deviceType: 'Bluetooth',
    manufacture: 'Sony Interactive Entertainment',
    reportedDriftX: 0.13,
    reportedDriftY: -0.09,
    reportedJitter: 0.008,
    description: 'Typical heavy wear on potentiometer tracks causing an off-center bottom-right resting drift.'
  },
  {
    id: 'joycon-severe',
    name: 'Nintendo Switch Joy-Con (Severe Slider Drift)',
    deviceType: 'Bluetooth',
    manufacture: 'Nintendo',
    reportedDriftX: -0.18,
    reportedDriftY: 0.03,
    reportedJitter: 0.018,
    description: 'High-amplitude negative-X drift due to metallic pad scraping and debris contamination.'
  },
  {
    id: 'xboxone-spring',
    name: 'Xbox One Controller (Loose Center Springs)',
    deviceType: 'USB',
    manufacture: 'Microsoft Corp.',
    reportedDriftX: 0.06,
    reportedDriftY: 0.07,
    reportedJitter: 0.003,
    description: 'Subtle multi-directional drift caused by lax return springs failing to snap to mechanical zero.'
  },
  {
    id: 'logitech-axial',
    name: 'Logitech F310 Gamepad (Slight Axis Shifting)',
    deviceType: 'USB',
    manufacture: 'Logitech Inc.',
    reportedDriftX: 0.01,
    reportedDriftY: -0.11,
    reportedJitter: 0.004,
    description: 'Exhibits axial Y shifting when released, resulting in phantom scroll inputs on Android TV launchers.'
  },
  {
    id: 'clean-factory',
    name: 'Factory Calibrated Controller',
    deviceType: 'USB',
    manufacture: 'Generic Hall-Effect',
    reportedDriftX: 0.00,
    reportedDriftY: 0.00,
    reportedJitter: 0.0006,
    description: 'Pristine centration with modern magnetic sensors reporting near-absolute grid-center coordinates.'
  }
];

interface AndroidStudioProps {
  webRawInput: Vector2D;
  deadzoneSettings: DeadzoneSettings;
}

export function AndroidStudio({ webRawInput, deadzoneSettings }: AndroidStudioProps) {
  // 1. Android Specific Input State
  const [androidRawInput, setAndroidRawInput] = useState<Vector2D>({ x: 0.13, y: -0.09 });
  const [androidCalibration, setAndroidCalibration] = useState<{ x: number; y: number; isCalibrated: boolean }>({
    x: 0,
    y: 0,
    isCalibrated: false
  });
  
  // 2. Emulator Connection Selection
  const [connectionType, setConnectionType] = useState<'USB' | 'Bluetooth'>('Bluetooth');
  
  // Bluetooth specific simulated settings
  const [btLatency, setBtLatency] = useState<number>(12); // ms
  const [btPacketLoss, setBtPacketLoss] = useState<number>(2); // %
  const [btRssi, setBtRssi] = useState<number>(-55); // dBm
  
  // USB specific simulated settings
  const [usbPollingRate, setUsbPollingRate] = useState<number>(500); // Hz
  const [usbEndpoint, setUsbEndpoint] = useState<string>('0x81 (EP 1 IN)');
  
  // 3. Automated noise & wiggle loop for Android Canvas Visuals
  const [tick, setTick] = useState<number>(0);
  
  // 4. Calibration sampling state (Android Process Simulation)
  const [calProgress, setCalProgress] = useState<number>(0);
  const [calStatus, setCalStatus] = useState<'idle' | 'sampling' | 'processing' | 'done'>('idle');
  const [samples, setSamples] = useState<Vector2D[]>([]);
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([
    '[INIT] Android HID Subsystem registered.',
    '[INFO] Listening for events on /dev/input/event3'
  ]);
  
  // 5. Applet Data Set search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('dualsense-worn');
  const [customDrift, setCustomDrift] = useState<{ x: number; y: number }>({ x: 0.15, y: -0.15 });
  
  // 6. Web API endpoints demonstration
  const [apiLogs, setApiLogs] = useState<string>('');
  const [activeEndpointPath, setActiveEndpointPath] = useState<string>('');
  
  // 7. Code Viewer State
  const [copiedText, setCopiedText] = useState<string>('');
  const [activeCodeTab, setActiveCodeTab] = useState<'view' | 'calibration' | 'driver'>('view');
  
  // Trails for canvas drawing inside Android Device
  const [rawTrail, setRawTrail] = useState<Vector2D[]>([]);
  const [corrTrail, setCorrTrail] = useState<Vector2D[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Apply Selected Preset signature to raw input
  const handleSelectDataset = (ds: GamepadDataset) => {
    setSelectedDatasetId(ds.id);
    setAndroidRawInput({ x: ds.reportedDriftX, y: ds.reportedDriftY });
    
    // Add logs
    const logType = ds.deviceType === 'Bluetooth' ? 'BT-HID' : 'USB-HID';
    setDiagnosticLogs(prev => [
      `[${logType}] Decoded vendor descriptor: ${ds.manufacture}`,
      `[STATE] Switched physical profile to ${ds.name} (Simulated bias: X=${ds.reportedDriftX.toFixed(2)}, Y=${ds.reportedDriftY.toFixed(2)})`,
      ...prev.slice(0, 15)
    ]);
  };

  // Automated tiny wiggle & noise to simulate actual physical stick micro-fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
      
      setAndroidRawInput(prev => {
        // Base drift from selected preset in list
        const activeDs = PRESET_DATASETS.find(d => d.id === selectedDatasetId);
        let baseDriftX = activeDs ? activeDs.reportedDriftX : customDrift.x;
        let baseDriftY = activeDs ? activeDs.reportedDriftY : customDrift.y;
        let jitterAmt = activeDs ? activeDs.reportedJitter : 0.005;
        
        // Add physical micro-noise (Brownian-esque wobble)
        const noiseX = (Math.random() - 0.5) * jitterAmt * 1.5;
        const noiseY = (Math.random() - 0.5) * jitterAmt * 1.5;
        
        // Slightly simulate physical stick release bounds
        return {
          x: clamp(baseDriftX + noiseX, -1.0, 1.0),
          y: clamp(baseDriftY + noiseY, -1.0, 1.0)
        };
      });
    }, 33); // ~30Hz visual ticks
    
    return () => clearInterval(interval);
  }, [selectedDatasetId, customDrift]);

  // Derive logical positions inside the Android Studio Canvas (Centered -> Corrected)
  const getSimulatedOutputs = () => {
    // 1. Subtract calibration bias offset first
    const cenX = clamp(androidRawInput.x - androidCalibration.x);
    const cenY = clamp(androidRawInput.y - androidCalibration.y);
    const centeredVec = androidCalibration.isCalibrated ? { x: cenX, y: cenY } : { x: androidRawInput.x, y: androidRawInput.y };
    
    // 2. Apply Deadzone correction based on current global settings
    let correctedVec = { x: 0, y: 0 };
    if (deadzoneSettings.type === 'radial') {
      const M = getMagnitude(centeredVec);
      const rad = deadzoneSettings.radialRadius;
      if (M > rad) {
        const scale = (M - rad) / (1.0 - rad);
        correctedVec = {
          x: clamp((centeredVec.x / M) * scale),
          y: clamp((centeredVec.y / M) * scale)
        };
      }
    } else {
      const absX = Math.abs(centeredVec.x);
      const absY = Math.abs(centeredVec.y);
      const dx = deadzoneSettings.axialX;
      const dy = deadzoneSettings.axialY;
      
      const cx = absX <= dx ? 0 : sign(centeredVec.x) * ((absX - dx) / (1.0 - dx));
      const cy = absY <= dy ? 0 : sign(centeredVec.y) * ((absY - dy) / (1.0 - dy));
      
      correctedVec = { x: clamp(cx), y: clamp(cy) };
    }
    
    return { centeredVec, correctedVec };
  };

  const { centeredVec, correctedVec } = getSimulatedOutputs();

  // Accumulate trails
  useEffect(() => {
    setRawTrail(prev => {
      const updated = [...prev, androidRawInput];
      if (updated.length > 35) updated.shift();
      return updated;
    });
    
    setCorrTrail(prev => {
      const updated = [...prev, correctedVec];
      if (updated.length > 35) updated.shift();
      return updated;
    });
  }, [androidRawInput.x, androidRawInput.y, correctedVec.x, correctedVec.y]);

  // Render simulated Android View Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scaleFactor = w / 2.2; // Leave margin for labels
    
    // Clear canvas - matches dark Android View templatebg
    ctx.fillStyle = '#0D0E12';
    ctx.fillRect(0, 0, w, h);
    
    // Draw background outer coordinate ring (1.0 boundary)
    ctx.beginPath();
    ctx.arc(cx, cy, scaleFactor, 0, Math.PI * 2);
    ctx.strokeStyle = '#1F222B';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Draw crosshair axes lines
    ctx.beginPath();
    ctx.moveTo(0, cy); ctx.lineTo(w, cy);
    ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Draw Deadzone Boundary
    if (deadzoneSettings.type === 'radial') {
      const pulse = 1.0 + Math.sin(tick * 0.1) * 0.03; // Subtle breathing deadzone bound
      const rPixel = deadzoneSettings.radialRadius * scaleFactor * pulse;
      ctx.beginPath();
      ctx.arc(cx, cy, rPixel, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.05)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      const dxPixel = deadzoneSettings.axialX * scaleFactor;
      const dyPixel = deadzoneSettings.axialY * scaleFactor;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.03)';
      ctx.fillRect(cx - dxPixel, 0, dxPixel * 2, h);
      ctx.fillRect(0, cy - dyPixel, w, dyPixel * 2);
      
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      // Draw vertical corridor lines
      ctx.moveTo(cx - dxPixel, 0); ctx.lineTo(cx - dxPixel, h);
      ctx.moveTo(cx + dxPixel, 0); ctx.lineTo(cx + dxPixel, h);
      // Draw horizontal corridor lines
      ctx.moveTo(0, cy - dyPixel); ctx.lineTo(w, cy - dyPixel);
      ctx.moveTo(0, cy + dyPixel); ctx.lineTo(w, cy + dyPixel);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // Draw Raw Trail (red line)
    if (rawTrail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(cx + rawTrail[0].x * scaleFactor, cy + rawTrail[0].y * scaleFactor);
      for (let i = 1; i < rawTrail.length; i++) {
        ctx.lineTo(cx + rawTrail[i].x * scaleFactor, cy + rawTrail[i].y * scaleFactor);
      }
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    
    // Draw Corrected Trail (blue line)
    if (corrTrail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(cx + corrTrail[0].x * scaleFactor, cy + corrTrail[0].y * scaleFactor);
      for (let i = 1; i < corrTrail.length; i++) {
        ctx.lineTo(cx + corrTrail[i].x * scaleFactor, cy + corrTrail[i].y * scaleFactor);
      }
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    // Draw dots for historical movement paths (Vector motion paths)
    rawTrail.forEach((p, idx) => {
      const alpha = (idx / rawTrail.length) * 0.45;
      ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
      ctx.beginPath();
      ctx.arc(cx + p.x * scaleFactor, cy + p.y * scaleFactor, 2, 0, Math.PI * 2);
      ctx.fill();
    });
    
    corrTrail.forEach((p, idx) => {
      const alpha = (idx / corrTrail.length) * 0.6;
      ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`;
      ctx.beginPath();
      ctx.arc(cx + p.x * scaleFactor, cy + p.y * scaleFactor, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Draw current raw vector coordinate dot
    const rx = cx + androidRawInput.x * scaleFactor;
    const ry = cy + androidRawInput.y * scaleFactor;
    ctx.beginPath();
    ctx.arc(rx, ry, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.fill();
    ctx.stroke();
    
    // Draw current corrected vector coordinate dot (Blue)
    const cox = cx + correctedVec.x * scaleFactor;
    const coy = cy + correctedVec.y * scaleFactor;
    ctx.beginPath();
    ctx.arc(cox, coy, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.fill();
    ctx.stroke();
    
    // Draw line from center to raw & corrected
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(rx, ry);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cox, coy);
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Draw calibration anchor indicator if active
    if (androidCalibration.isCalibrated) {
      const calX = cx + androidCalibration.x * scaleFactor;
      const calY = cy + androidCalibration.y * scaleFactor;
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      // Draw a tiny star or cross
      ctx.arc(calX, calY, 4, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#f59e0b';
      ctx.font = '8px sans-serif';
      ctx.fillText('Calibrated Offset', calX + 6, calY + 3);
    }
  }, [androidRawInput, correctedVec, deadzoneSettings, androidCalibration, rawTrail, corrTrail, tick]);

  // GUIDED MEDIAN CALIBRATION PROCEDURE
  // Collect joystick data at rest for 3 seconds, calculate the robust median, save it, and apply first.
  const runGuidedCalibration = () => {
    if (calStatus === 'sampling' || calStatus === 'processing') return;
    
    setCalStatus('sampling');
    setCalProgress(0);
    setSamples([]);
    setDiagnosticLogs(prev => [
      `[CALIBRATION] Initiated 3.0s idle calibration sampling.`,
      `[CALIBRATION] GUIDELINE: Release thumbsticks. Maintain complete rest.`,
      ...prev
    ]);
    
    let currentSamples: Vector2D[] = [];
    const samplingDuration = 3000; // 3 seconds
    const intervalTime = 100; // Sample every 100ms (30 samples)
    const totalSteps = samplingDuration / intervalTime;
    let stepCount = 0;
    
    const interval = setInterval(() => {
      stepCount++;
      const progressPercent = (stepCount / totalSteps) * 100;
      setCalProgress(progressPercent);
      
      // Sample current position coordinate with noise
      const activeDs = PRESET_DATASETS.find(d => d.id === selectedDatasetId);
      const baseDriftX = activeDs ? activeDs.reportedDriftX : customDrift.x;
      const baseDriftY = activeDs ? activeDs.reportedDriftY : customDrift.y;
      
      // Introduce raw gamepad fluctuations
      const samplePoint = {
        x: baseDriftX + (Math.random() - 0.5) * 0.02,
        y: baseDriftY + (Math.random() - 0.5) * 0.02
      };
      
      currentSamples.push(samplePoint);
      setSamples([...currentSamples]);
      
      if (stepCount % 5 === 0) {
        setDiagnosticLogs(prev => [
          `[CAL] Sample #${stepCount}/${totalSteps}: X=${samplePoint.x.toFixed(4)}, Y=${samplePoint.y.toFixed(4)}`,
          ...prev
        ]);
      }
      
      if (stepCount >= totalSteps) {
        clearInterval(interval);
        setCalStatus('processing');
        
        // Brief processing delay to simulate heavy mathematical analysis (median matrix calculation)
        setTimeout(() => {
          // Robust Median calculation for both dimensions (ignores single outlier spikes due to analog jumps)
          const sortedX = currentSamples.map(s => s.x).sort((a, b) => a - b);
          const sortedY = currentSamples.map(s => s.y).sort((a, b) => a - b);
          
          const medianIdx = Math.floor(sortedX.length / 2);
          let calcMedianX = sortedX[medianIdx];
          let calcMedianY = sortedY[medianIdx];
          
          // If even, average the middle bounds
          if (sortedX.length % 2 === 0 && sortedX.length > 0) {
            calcMedianX = (sortedX[medianIdx - 1] + sortedX[medianIdx]) / 2;
            calcMedianY = (sortedY[medianIdx - 1] + sortedY[medianIdx]) / 2;
          }
          
          setAndroidCalibration({
            x: calcMedianX,
            y: calcMedianY,
            isCalibrated: true
          });
          setCalStatus('done');
          
          setDiagnosticLogs(prev => [
            `[SHAP_PREF] Evaluated and stored drift: dx=${calcMedianX.toFixed(5)}, dy=${calcMedianY.toFixed(5)}`,
            `[STATUS] Neutralized zero drift. Dynamic offsetting enabled.`,
            ...prev
          ]);
        }, 850);
      }
    }, intervalTime);
  };

  const resetAndroidCalibration = () => {
    setAndroidCalibration({ x: 0, y: 0, isCalibrated: false });
    setCalStatus('idle');
    setDiagnosticLogs(prev => [
      `[CALIBRATION] Rest offsets cleared. Direct hardware report activated.`,
      ...prev
    ]);
  };

  // Search filter for datasets
  const filteredDatasets = PRESET_DATASETS.filter(ds => 
    ds.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ds.manufacture.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ds.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Endpoint simulation triggered
  const triggerEndpointTest = (endpoint: MockEndpoint) => {
    setActiveEndpointPath(endpoint.path);
    setApiLogs('[REST API CLIENT] Executing call to Android Local Server...\n');
    
    // Compile active calibration object
    const payload = JSON.stringify({
      timestamp: Date.now(),
      calibrated: androidCalibration.isCalibrated,
      offsets: {
        dx: androidCalibration.x,
        dy: androidCalibration.y
      },
      settings: {
        type: deadzoneSettings.type,
        radial_r: deadzoneSettings.radialRadius,
        axial_x: deadzoneSettings.axialX,
        axial_y: deadzoneSettings.axialY
      },
      hardware: PRESET_DATASETS.find(d => d.id === selectedDatasetId) || { name: 'Custom Device', id: 'custom-id' }
    }, null, 2);

    let finalResponse = endpoint.responseBody;
    if (endpoint.path === '/api/v1/calibration/save') {
      finalResponse = JSON.stringify({
        status: 200,
        success: true,
        message: "Dynamic calibrator saved successfully to SharedPreferences and cloud persistent storage.",
        applied_offsets: { dx: androidCalibration.x.toFixed(4), dy: androidCalibration.y.toFixed(4) },
        device_active: connectionType === 'Bluetooth' ? 'BT CONTROLLER' : 'USB HOST HID'
      }, null, 2);
    }
    
    setTimeout(() => {
      setApiLogs(prev => 
        prev + 
        `${endpoint.method} ${endpoint.path} HTTP/1.1\n` +
        `Host: localhost:3000\n` +
        `Content-Type: application/json\n` +
        `Authorization: Bearer dev_apk_token_89cf\n` +
        (endpoint.method === 'POST' ? `Payload:\n${payload}\n` : '') +
        `\n---------------------------------------\n` +
        `HTTP/1.1 200 OK\n` +
        `Content-Type: application/json\n\n` +
        finalResponse
      );
    }, 400);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(''), 1500);
  };

  // Actual High-quality Copyable Kotlin Codes and XML files
  const joystickViewCode = `package com.android.hardware.joystick

import android.content.Context
import android.graphics.*
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.View
import kotlin.math.hypot

/**
 * Custom Android View implementing robust stick drift visualization.
 * Renders raw vs corrected inputs, movement trails, and active deadzones
 * with professional visual fidelity.
 */
class JoystickView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    // Calibration biases (Subtracted first)
    var zeroOffsetX = 0f
    var zeroOffsetY = 0f
    var isCalibrated = false

    // Deadzone tuning variables
    var deadzoneType = "radial" // "radial" or "axial"
    var radialDeadzoneRadius = 0.15f // [0f - 1f] range scale
    var axialDeadzoneX = 0.12f
    var axialDeadzoneY = 0.12f

    // Current coordinates report: [-1f to +1f] scaled
    var rawInputX = 0f
    var rawInputY = 0f

    // Historical vector nodes (Movement path trails)
    private val rawTrailHistory = mutableListOf<PointF>()
    private val correctedTrailHistory = mutableListOf<PointF>()
    private val maxTrailBuffer = 40

    // Drawing paints pre-allocation
    private val axisPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#1F222B")
        strokeWidth = 3f
        style = Paint.Style.STROKE
    }

    private val gridPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#334155")
        strokeWidth = 1f
        style = Paint.Style.STROKE
        pathEffect = DashPathEffect(floatArrayOf(10f, 10f), 0f)
    }

    private val deadzonePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#1AEF4444") // 10% translucent red
        style = Paint.Style.FILL
    }
    
    private val deadzoneBorderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#80EF4444") // 50% red
        strokeWidth = 3f
        style = Paint.Style.STROKE
        pathEffect = DashPathEffect(floatArrayOf(8f, 6f), 0f)
    }

    private val labelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#64748B")
        textSize = 24f
        typeface = Typeface.MONOSPACE
    }

    private val rawPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.RED
        style = Paint.Style.FILL
    }

    private val correctedPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#3B82F6") // Blue
        style = Paint.Style.FILL
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        
        val w = width.toFloat()
        val h = height.toFloat()
        val cx = w / 2f
        val cy = h / 2f
        val scale = (w.coerceAtMost(h) / 2f) * 0.9f

        // 1. Draw outer boundary and grid axes
        canvas.drawCircle(cx, cy, scale, axisPaint)
        canvas.drawLine(0f, cy, w, cy, gridPaint)
        canvas.drawLine(cx, 0f, cx, h, gridPaint)

        // 2. Draw Deadzone boundaries
        if (deadzoneType == "radial") {
            val rPixel = radialDeadzoneRadius * scale
            canvas.drawCircle(cx, cy, rPixel, deadzonePaint)
            canvas.drawCircle(cx, cy, rPixel, deadzoneBorderPaint)
        } else {
            val dxPixel = axialDeadzoneX * scale
            val dyPixel = axialDeadzoneY * scale
            // Draw axial bounding box corridors
            canvas.drawRect(cx - dxPixel, 0f, cx + dxPixel, h, deadzonePaint)
            canvas.drawRect(0f, cy - dyPixel, w, cy + dyPixel, deadzonePaint)
            
            canvas.drawLine(cx - dxPixel, 0f, cx - dxPixel, h, deadzoneBorderPaint)
            canvas.drawLine(cx + dxPixel, 0f, cx + dxPixel, h, deadzoneBorderPaint)
            canvas.drawLine(0f, cy - dyPixel, w, cy - dyPixel, deadzoneBorderPaint)
            canvas.drawLine(0f, cy + dyPixel, w, cy + dyPixel, deadzoneBorderPaint)
        }

        // 3. Compute dynamic corrected values (Calibration offset -> Deadzone)
        val cenX = (rawInputX - zeroOffsetX).coerceIn(-1f, 1f)
        val cenY = (rawInputY - zeroOffsetY).coerceIn(-1f, 1f)
        
        val corrected = applyDeadzoneCorrection(cenX, cenY)
        
        // Save current frame into movement trails
        recordTrails(PointF(rawInputX, rawInputY), corrected)

        // 4. Draw Trails
        rawTrailHistory.forEachIndexed { i, p ->
          rawPaint.alpha = ((i.toFloat() / maxTrailBuffer) * 110).toInt()
          canvas.drawCircle(cx + p.x * scale, cy + p.y * scale, 5f, rawPaint)
        }
        correctedTrailHistory.forEachIndexed { i, p ->
          correctedPaint.alpha = ((i.toFloat() / maxTrailBuffer) * 200).toInt()
          canvas.drawCircle(cx + p.x * scale, cy + p.y * scale, 6f, correctedPaint)
        }

        // 5. Draw active vector pointers (vector indicators)
        val rx = cx + rawInputX * scale
        val ry = cy + rawInputY * scale
        canvas.drawCircle(rx, ry, 15f, rawPaint.apply { alpha = 255 })
        
        val cox = cx + corrected.x * scale
        val coy = cy + corrected.y * scale
        canvas.drawCircle(cox, coy, 18f, correctedPaint.apply { alpha = 255 })
        
        // Draw coordinate text label overlay
        canvas.drawText("RAW: (" + String.format("%.2f", rawInputX) + ", " + String.format("%.2f", rawInputY) + ")", 20f, 40f, labelPaint)
        canvas.drawText("CORR: (" + String.format("%.2f", corrected.x) + ", " + String.format("%.2f", corrected.y) + ")", 20f, h - 20f, labelPaint)
    }

    private fun applyDeadzoneCorrection(cx: Float, cy: Float): PointF {
        if (deadzoneType == "radial") {
            val magnitude = hypot(cx, cy)
            if (magnitude <= radialDeadzoneRadius) {
                return PointF(0f, 0f)
            }
            val scale = (magnitude - radialDeadzoneRadius) / (1f - radialDeadzoneRadius)
            return PointF((cx / magnitude) * scale, (cy / magnitude) * scale)
        } else {
            val absX = kotlin.math.abs(cx)
            val absY = kotlin.math.abs(cy)
            
            val targetX = if (absX <= axialDeadzoneX) 0f else {
                kotlin.math.sign(cx) * ((absX - axialDeadzoneX) / (1f - axialDeadzoneX))
            }
            val targetY = if (absY <= axialDeadzoneY) 0f else {
                kotlin.math.sign(cy) * ((absY - axialDeadzoneY) / (1f - axialDeadzoneY))
            }
            return PointF(targetX, targetY)
        }
    }

    private fun recordTrails(raw: PointF, corrected: PointF) {
        rawTrailHistory.add(PointF(raw.x, raw.y))
        correctedTrailHistory.add(PointF(corrected.x, corrected.y))
        
        if (rawTrailHistory.size > maxTrailBuffer) rawTrailHistory.removeAt(0)
        if (correctedTrailHistory.size > maxTrailBuffer) correctedTrailHistory.removeAt(0)
    }
}`;

  const calibrationCode = `package com.android.hardware.joystick

import android.content.Context
import android.graphics.PointF
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn

/**
 * Handles the async sample-gathering process sequence of active analog controllers.
 * Obtains live resting offset inputs, performs robust Median sorting to filter 
 * high-frequency noise outbursts, and writes to SharedPreferences / Jetpack DataStore.
 */
class JoystickCalibrationManager(private val context: Context) {

    private val sharedPrefs = context.getSharedPreferences("joystick_drift_prefs", Context.MODE_PRIVATE)

    data class CalibrationResult(
        val offsetX: Float,
        val offsetY: Float,
        val sampleSize: Int,
        val success: Boolean
    )

    /**
     * Coroutine Flow tracking calibration progress.
     * Suspends for 3 seconds, polls inputs at 100ms intervals, and calculates offsets.
     */
    fun performRestCalibration(rawInputProvider: () -> PointF): Flow<CalibrationState> = flow {
        emit(CalibrationState.Starting)
        delay(300)

        val samples = ArrayList<PointF>()
        val totalSamples = 30
        
        for (i in 1..totalSamples) {
            // Retrieve current physical input reported by hardware Host API
            val currentRestVector = rawInputProvider()
            samples.add(currentRestVector)
            
            emit(CalibrationState.SamplingProgress((i.toFloat() / totalSamples * 100).toInt(), samples.size))
            delay(100) // 100ms interval
        }

        emit(CalibrationState.ProcessingMath)
        delay(600) // Simulate fast block parsing

        val result = calculateRobustMedian(samples)
        if (result.success) {
            // Write results permanently to device storage SharedPreferences block
            sharedPrefs.edit()
                .putFloat("drift_bias_offset_x", result.offsetX)
                .putFloat("drift_bias_offset_y", result.offsetY)
                .putBoolean("is_calibrated_active", true)
                .apply()
                
            emit(CalibrationState.Completed(result))
        } else {
            emit(CalibrationState.Error("Insufficient or unstable input coordinates gather context."))
        }
    }.flowOn(Dispatchers.Default)

    /**
     * Calculates the Median drift offset.
     * Grabbing the Median (sorted midpoint) rather than mean average prevents 
     * single outlier analog signal jumps (potentiometer micro-cracks) from polluting 
     * the calibration offset bounds.
     */
    fun calculateRobustMedian(samples: List<PointF>): CalibrationResult {
        if (samples.isEmpty()) return CalibrationResult(0f, 0f, 0, false)

        val sortedX = samples.map { it.x }.sorted()
        val sortedY = samples.map { it.y }.sorted()
        
        val size = samples.size
        val mid = size / 2

        val medianX = if (size % 2 == 0) {
            (sortedX[mid - 1] + sortedX[mid]) / 2f
        } else {
            sortedX[mid]
        }

        val medianY = if (size % 2 == 0) {
            (sortedY[mid - 1] + sortedY[mid]) / 2f
        } else {
            sortedY[mid]
        }

        return CalibrationResult(medianX, medianY, size, true)
    }

    fun getStoredOffsets(): PointF {
        val dx = sharedPrefs.getFloat("drift_bias_offset_x", 0f)
        val dy = sharedPrefs.getFloat("drift_bias_offset_y", 0f)
        val active = sharedPrefs.getBoolean("is_calibrated_active", false)
        return if (active) PointF(dx, dy) else PointF(0f, 0f)
    }
}

sealed class CalibrationState {
    object Starting : CalibrationState()
    data class SamplingProgress(val percentage: Int, val samplesCount: Int) : CalibrationState()
    object ProcessingMath : CalibrationState()
    data class Completed(val result: JoystickCalibrationManager.CalibrationResult) : CalibrationState()
    data class Error(val message: String) : CalibrationState()
}`;

  const driverCode = `package com.android.hardware.joystick

import android.content.Context
import android.hardware.usb.*
import android.util.Log
import java.nio.ByteBuffer

/**
 * Handles raw USB HID and Bluetooth Low Energy controller endpoint polling.
 * Retrieves hardware packets directly via USB Host APIs at chosen polling rates.
 */
class ControllerHardwareDriver(private val context: Context) {

    private val usbManager = context.getSystemService(Context.USB_SERVICE) as UsbManager
    private var usbThread: Thread? = null
    private var isPolling = false

    interface JoystickInputListener {
        fun onRawCoordinateReceived(rawX: Float, rawY: Float)
        fun onConnectionStatusChanged(isConnected: Boolean)
    }

    /**
     * Initiates low-level USB polling ring on the chosen Gamepad Endpoint.
     * Uses Android Universal Host USB APIs to claim manual interfaces.
     */
    fun startUsbHIDPolling(device: UsbDevice, listener: JoystickInputListener) {
        val usbInterface = device.getInterface(0)
        // Find EP IN Interrupt endpoint
        var endpointIn: UsbEndpoint? = null
        for (i in 0 until usbInterface.endpointCount) {
            val ep = usbInterface.getEndpoint(i)
            if (ep.type == UsbConstants.USB_ENDPOINT_XFER_INT && 
                ep.direction == UsbConstants.USB_DIR_IN) {
                endpointIn = ep
                break
            }
        }

        if (endpointIn == null) {
            Log.e("USB_HID", "Suitable Interrupt Input direction endpoint not discovered.")
            return
        }

        val deviceConnection = usbManager.openDevice(device) ?: return
        deviceConnection.claimInterface(usbInterface, true)

        isPolling = true
        usbThread = Thread {
            val packetSize = endpointIn.maxPacketSize
            val buffer = ByteBuffer.allocate(packetSize)
            
            while (isPolling) {
                // Read synchronous packets from raw USB buffers
                val bytesRead = deviceConnection.bulkTransfer(
                    endpointIn, 
                    buffer.array(), 
                    packetSize, 
                    100 // timeout in ms
                )
                
                if (bytesRead > 0) {
                    // Typical HID Joypad descriptor: Byte 1 is axis X, Byte 2 is Axis Y
                    val rawByteX = buffer.get(1).toInt() and 0xFF
                    val rawByteY = buffer.get(2).toInt() and 0xFF
                    
                    // Normalize standard [0x00 - 0xFF] range to [-1.0f, 1.0f] float coordinate vectors
                    val normalizedX = ((rawByteX - 128) / 128.0f)
                    val normalizedY = ((rawByteY - 128) / 128.0f)
                    
                    // Dispatch directly to UI threads for on-canvas corrections
                    listener.onRawCoordinateReceived(normalizedX, normalizedY)
                    buffer.clear()
                }
            }
            
            deviceConnection.releaseInterface(usbInterface)
            deviceConnection.close()
        }.apply { start() }
    }

    fun stopPolling() {
        isPolling = false
        usbThread?.interrupt()
        usbThread = null
    }
}`;

  return (
    <div className="bg-[#15181F] rounded-2xl border border-slate-800 shadow-xl overflow-hidden relative p-5 md:p-6 space-y-6">
      
      {/* Dynamic Ribbon indicator */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500/50 via-blue-400 to-blue-500/50" />
      
      {/* Title & Core Summary */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-slate-100 font-display uppercase tracking-wide">
              Android View Developer & Hardware Integration Studio
            </h2>
            <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
              Simulation Sandbox
            </span>
          </div>
          <p className="text-xs text-slate-400 font-sans mt-1 leading-relaxed">
            Test custom Android layout canvas drawings, sample dynamic median calibrations, customize multiple Bluetooth/USB profiles, and view deployable Kotlin codes.
          </p>
        </div>
        
        {/* Sync Status Badge */}
        <div className="flex items-center gap-2 text-xs bg-[#0F1115] p-2 rounded-xl border border-slate-800">
          <Layers className="w-4 h-4 text-slate-400" />
          <span className="font-mono text-slate-300">Target: Android API level 35+</span>
        </div>
      </div>

      {/* Main Grid: Left is simulated Android Device Sandbox, Right is datasets browser and endpoints + copyable codebase */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* COLUMN 1: Android Simulated Tablet/Device Frame (xl-span-5) */}
        <div className="xl:col-span-5 flex flex-col items-center">
          
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1">
            <Tablet className="w-3.5 h-3.5" /> High-End Simulated Handset Frame
          </div>
          
          {/* Hardware Frame container */}
          <div className="w-full max-w-[340px] rounded-[3rem] border-[10px] border-slate-800 bg-[#0A0D12] shadow-2xl relative overflow-hidden flex flex-col items-stretch ring-4 ring-slate-800/30">
            {/* Notch Speaker sensor */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-800 rounded-full z-30 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-900 mr-2" />
              <div className="w-8 h-1 bg-slate-900 rounded-full" />
            </div>
            
            {/* Status Info Bar */}
            <div className="bg-[#0F1115] px-6 pt-6 pb-2 flex justify-between items-center text-[10px] font-mono text-slate-450 select-none border-b border-slate-900 relative z-20">
              <div className="font-medium text-slate-300">10:30 AM</div>
              <div className="flex items-center space-x-1.5">
                {connectionType === 'Bluetooth' ? (
                  <div className="flex items-center gap-0.5">
                    <Bluetooth className="w-3 h-3 text-blue-400" />
                    <span className="text-[9px] text-blue-300">{btRssi}dBm</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-0.5">
                    <Usb className="w-3 h-3 text-amber-500" />
                    <span className="text-[9px] text-amber-400">{usbPollingRate}Hz</span>
                  </div>
                )}
                <Wifi className="w-3 h-3 text-slate-400" />
                <Battery className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
            
            {/* IN-PHONE APP SPACE */}
            <div className="flex-1 bg-[#0D0E12] p-5 flex flex-col items-stretch space-y-4">
              
              {/* Internal App Header Title */}
              <div className="text-center">
                <h3 className="text-xs font-bold text-slate-200">System Calibration Controller</h3>
                <span className="text-[8.5px] font-mono text-slate-500 uppercase tracking-widest block mt-0.5">Custom Android Canvas drawing</span>
              </div>
              
              {/* Android View HTML5 Canvas */}
              <div className="flex justify-center items-center">
                <div className="relative border border-slate-800 bg-[#0D0E12] rounded-xl overflow-hidden shadow-inner w-[240px] h-[240px]">
                  <canvas 
                    ref={canvasRef} 
                    width={240} 
                    height={240} 
                    className="w-full h-full select-none"
                  />
                  
                  {/* Internal Compass indicator label overlays */}
                  <div className="absolute top-2 left-2 text-[8px] font-mono bg-slate-950/80 px-1 py-0.5 text-slate-400 rounded">
                    Deadzone: {(deadzoneSettings.type === 'radial' ? deadzoneSettings.radialRadius : deadzoneSettings.axialX).toFixed(2)}
                  </div>
                </div>
              </div>
              
              {/* Embedded Guided Calibration Progress Frame */}
              <div className="bg-[#13161D] rounded-xl p-3 border border-slate-800 text-xs">
                {calStatus === 'idle' && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-[11px] text-slate-300">Automatic Median Drift Calibrator</span>
                      {androidCalibration.isCalibrated && (
                        <span className="text-[9px] font-mono text-emerald-450 bg-emerald-500/10 px-1.5 rounded border border-emerald-500/20">Calibrated</span>
                      )}
                    </div>
                    <p className="text-[9.5px] text-slate-400 leading-normal">
                      Release thumbstick completely to rest before clicking below to sample the robust 3-second median.
                    </p>
                    <button
                      onClick={runGuidedCalibration}
                      className="w-full flex items-center justify-center space-x-1.5 py-1.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-550 hover:to-blue-450 text-slate-900 font-bold rounded-lg transition-all text-[10.5px] cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-slate-900" />
                      <span>Start Android Calibrate</span>
                    </button>
                  </div>
                )}
                
                {calStatus === 'sampling' && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] leading-none">
                      <span className="text-slate-450 animate-pulse">GUIDE: Leaving joystick at physical rest...</span>
                      <span className="text-blue-400 font-mono font-bold">{Math.round(calProgress)}%</span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-[#0A0D12] rounded-full overflow-hidden border border-slate-900">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full transition-all duration-75"
                        style={{ width: `${calProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[8px] font-mono text-slate-500 leading-none">
                      <span>Samples: {samples.length}/30</span>
                      <span>Freq: 10Hz</span>
                    </div>
                  </div>
                )}

                {calStatus === 'processing' && (
                  <div className="space-y-1.5 text-center py-1">
                    <RefreshCw className="w-4 h-4 text-amber-500 animate-spin mx-auto" />
                    <span className="text-[10px] font-mono text-amber-400 block">Evaluating coordinates sorting matrix...</span>
                  </div>
                )}

                {calStatus === 'done' && (
                  <div className="space-y-2">
                    <div className="flex items-start space-x-1.5 bg-emerald-500/5 p-1.5 rounded border border-emerald-500/20 text-[9.5px] text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="font-bold text-emerald-400">Neutralized Median Zero-Bias!</span>
                        <div className="font-mono text-[9px] text-slate-400 leading-none">
                          Bias stored: X={androidCalibration.x.toFixed(4)} , Y={androidCalibration.y.toFixed(4)}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        onClick={runGuidedCalibration}
                        className="py-1 px-1.5 bg-slate-800 hover:bg-slate-750 rounded text-[9.5px] text-slate-350 cursor-pointer text-center font-semibold"
                      >
                        Recalibrate
                      </button>
                      <button
                        onClick={resetAndroidCalibration}
                        className="py-1 px-1.5 bg-red-950/10 hover:bg-red-950/20 border border-red-950/30 text-red-400 rounded text-[9.5px] cursor-pointer text-center"
                      >
                        Clear Offset
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Diagnostic Terminal Scroll Box */}
              <div className="bg-[#07080B] rounded-xl border border-slate-900 p-2.5">
                <div className="text-[8px] text-slate-500 font-mono uppercase tracking-wider mb-1">Android Logcat (/dev/input/event3)</div>
                <div className="h-16 overflow-y-auto font-mono text-[9px] text-slate-400 space-y-1 scrollbar-hidden">
                  {diagnosticLogs.map((log, idx) => (
                    <div key={idx} className="truncate select-none leading-tight">{log}</div>
                  ))}
                </div>
              </div>

            </div>
            
            {/* Simulated home button bezel */}
            <div className="bg-[#0F1115] py-3.5 flex justify-center items-center border-t border-slate-900">
              <div className="w-24 h-1 bg-slate-650 rounded-full" />
            </div>
          </div>
          
        </div>

        {/* COLUMN 2: Configuration Controls & Code viewer (xl-span-7) */}
        <div className="xl:col-span-7 space-y-6">
          
          {/* 1. DATASETS BROWSER WITH SEARCH */}
          <div className="bg-[#0F1115] rounded-xl border border-slate-800 p-4 space-y-3.5">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Select Prepacked Hardware Calibration Datasets
                </h3>
              </div>
              
              {/* Simple Search Component */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search gamepad..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#15181F] text-slate-300 placeholder-slate-500 border border-slate-800 rounded-lg py-1 pl-8 pr-2.5 text-xs focus:outline-none focus:border-blue-500 w-full sm:w-44"
                />
              </div>
            </div>
            
            {/* Grid list of matched gamepads */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[175px] overflow-y-auto pr-1">
              {filteredDatasets.length > 0 ? (
                filteredDatasets.map((ds) => (
                  <button
                    key={ds.id}
                    onClick={() => handleSelectDataset(ds)}
                    className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col focus:outline-none cursor-pointer ${
                      selectedDatasetId === ds.id 
                        ? 'bg-blue-500/10 border-blue-500/40' 
                        : 'bg-[#15181F] hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-bold text-[11px] text-slate-200 truncate pr-2 max-w-[85%]">{ds.name}</span>
                      <span className={`text-[8px] font-mono font-bold px-1 rounded uppercase shrink-0 ${
                        ds.deviceType === 'USB' ? 'bg-amber-500/10 text-amber-450 border border-amber-550/20' : 'bg-blue-500/10 text-blue-400 border border-blue-550/20'
                      }`}>
                        {ds.deviceType}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-450 block mt-0.5">
                      Manufacture: {ds.manufacture}
                    </span>
                    <span className="text-[9px] text-slate-400 mt-1 line-clamp-1 italic text-[10px]">
                      "{ds.description}"
                    </span>
                    
                    {/* Live drift specs overlay */}
                    <div className="flex justify-between items-center w-full border-t border-slate-800/60 pt-1.5 mt-2 text-[9px] font-mono text-slate-450 leading-none">
                      <span>Rest Vector: <strong className="text-red-400">({ds.reportedDriftX.toFixed(2)}, {ds.reportedDriftY.toFixed(2)})</strong></span>
                      <span>Jitter: <strong className="text-slate-300">{(ds.reportedJitter * 100).toFixed(2)}%</strong></span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="col-span-2 text-center py-6 text-xs text-slate-500">
                  No calibration data models match your query "<strong>{searchQuery}</strong>"
                </div>
              )}
            </div>
          </div>

          {/* 2. USB INTEGRATION AND BLUETOOTH INPUTS TOGGLES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Input integration method Selector */}
            <div className="bg-[#0F1115] rounded-xl border border-slate-800 p-4 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div className="flex items-center space-x-1.5">
                  <Usb className="w-4 h-4 text-blue-400" />
                  <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    Simulate Device Protocol
                  </h3>
                </div>
                <div className="flex bg-[#15181F] p-0.5 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setConnectionType('Bluetooth')}
                    className={`py-0.5 px-2 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      connectionType === 'Bluetooth' ? 'bg-blue-500 shadow text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    Bluetooth
                  </button>
                  <button
                    onClick={() => setConnectionType('USB')}
                    className={`py-0.5 px-2 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      connectionType === 'USB' ? 'bg-blue-500 shadow text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    USB
                  </button>
                </div>
              </div>

              {connectionType === 'Bluetooth' ? (
                <div className="space-y-3 text-xs">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="text-slate-400">Connection Strength RSSI:</span>
                      <span className={`font-mono font-bold ${btRssi >= -65 ? 'text-emerald-400' : 'text-amber-500'}`}>{btRssi} dBm (Excellent)</span>
                    </div>
                    <input
                      type="range"
                      min="-95"
                      max="-35"
                      step="5"
                      value={btRssi}
                      onChange={(e) => setBtRssi(parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-800 accent-blue-500 rounded"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="text-slate-400">Simulate Input Latency:</span>
                      <span className="text-blue-400 font-mono font-bold">{btLatency} ms</span>
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="45"
                      step="1"
                      value={btLatency}
                      onChange={(e) => setBtLatency(parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-800 accent-blue-500 rounded"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="text-slate-400">Simulated Packet Loss:</span>
                      <span className={`font-mono font-bold ${btPacketLoss > 5 ? 'text-red-400' : 'text-slate-400'}`}>{btPacketLoss}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      step="1"
                      value={btPacketLoss}
                      onChange={(e) => setBtPacketLoss(parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-800 accent-blue-500 rounded"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="space-y-1.5">
                    <div className="text-[10.5px] text-slate-400">Simulated USB Endpoint Address:</div>
                    <select
                      value={usbEndpoint}
                      onChange={(e) => setUsbEndpoint(e.target.value)}
                      className="w-full bg-[#15181F] text-slate-300 text-[10.5px] rounded-lg border border-slate-800 p-1.5 focus:outline-none"
                    >
                      <option value="0x81 (EP 1 IN)">0x81 (EP 1 IN) - Host Interrupt [Read polling]</option>
                      <option value="0x02 (EP 2 OUT)">0x02 (EP 2 OUT) - Force Feedback / Rumbles</option>
                      <option value="0x03 (EP 3 CONTROL)">0x03 (EP 3 REG Control) - Mode configurations</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="text-slate-400">USB Polling Rate Speed:</span>
                      <span className="text-amber-400 font-mono font-bold">{usbPollingRate} Hz</span>
                    </div>
                    <input
                      type="range"
                      min="125"
                      max="1000"
                      step="125"
                      value={usbPollingRate}
                      onChange={(e) => setUsbPollingRate(parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-800 accent-blue-500 rounded"
                    />
                    <div className="text-[8.5px] font-mono text-slate-500 text-right uppercase">
                      Latency threshold: {(1000 / usbPollingRate).toFixed(2)}ms
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. API ENDPOINTS CLIENT AND SENSORS LISTS */}
            <div className="bg-[#0F1115] rounded-xl border border-slate-800 p-4 space-y-3.5">
              <div className="flex items-center space-x-1.5 border-b border-slate-800/80 pb-2">
                <FileJson className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Mock Android Hardware REST Endpoints
                </h3>
              </div>
              
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <button
                    onClick={() => triggerEndpointTest({
                      method: 'GET',
                      path: '/api/v1/hardware/devices',
                      description: 'Lists connected controllers',
                      responseBody: JSON.stringify({
                        timestamp: Date.now(),
                        active_connections: 1,
                        devices: [
                          {
                            driver_id: "android.hardware.input.gamepad.event3",
                            device_name: PRESET_DATASETS.find(d => d.id === selectedDatasetId)?.name || 'Generic controller',
                            connection: connectionType,
                            serial_num: "SN-982-CHIP8-89CF",
                            raw_offsets: { dx: androidCalibration.x, dy: androidCalibration.y }
                          }
                        ]
                      }, null, 2)
                    })}
                    className={`py-1.5 px-2 bg-[#15181F] hover:bg-slate-900 border text-left rounded-lg font-mono transition-all truncate cursor-pointer ${
                      activeEndpointPath === '/api/v1/hardware/devices' ? 'border-blue-500 text-blue-400' : 'border-slate-800 text-slate-300'
                    }`}
                  >
                    GET /hardware/devices
                  </button>
                  
                  <button
                    onClick={() => triggerEndpointTest({
                      method: 'POST',
                      path: '/api/v1/calibration/save',
                      description: 'Saves dynamic center calibration bias offsets',
                      responseBody: ''
                    })}
                    className={`py-1.5 px-2 bg-[#15181F] hover:bg-slate-900 border text-left rounded-lg font-mono transition-all truncate cursor-pointer ${
                      activeEndpointPath === '/api/v1/calibration/save' ? 'border-blue-500 text-blue-400' : 'border-slate-800 text-slate-300'
                    }`}
                  >
                    POST /calibration/save
                  </button>
                </div>
                
                {/* Console view */}
                <div className="bg-[#07080B] rounded-lg border border-slate-900 p-2 font-mono text-[9px] text-slate-400 overflow-x-auto min-h-[90px] max-h-[105px]">
                  {apiLogs ? (
                    <pre className="text-slate-300 leading-tight block select-text whitespace-pre-wrap">{apiLogs}</pre>
                  ) : (
                    <div className="text-slate-500 text-center py-6">
                      Click any endpoint button above to query simulated Android Client outputs.
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* 4. CODE VIEWER CONSOLE WITH COPY FUNCTIONALITY (COPIES PRODUCTION KOTLIN FILES) */}
          <div className="bg-[#0F1115] rounded-xl border border-slate-800 shadow-md overflow-hidden flex flex-col items-stretch">
            <div className="bg-[#15181F] px-4 py-3 border-b border-slate-800/80 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div className="flex items-center space-x-2">
                <Code className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-semibold text-slate-205 uppercase tracking-wider">
                  Android Code Studio (Production Kotlin Reference)
                </h3>
              </div>
              
              <div className="flex bg-[#0F1115] p-0.5 rounded-lg border border-slate-800 shrink-0">
                <button
                  onClick={() => setActiveCodeTab('view')}
                  className={`py-1 px-2 rounded font-mono text-[9.5px] leading-none cursor-pointer transition-all ${
                    activeCodeTab === 'view' ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400' : 'text-slate-500'
                  }`}
                >
                  JoystickView.kt
                </button>
                <button
                  onClick={() => setActiveCodeTab('calibration')}
                  className={`py-1 px-2 rounded font-mono text-[9.5px] leading-none cursor-pointer transition-all ${
                    activeCodeTab === 'calibration' ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400' : 'text-slate-500'
                  }`}
                >
                  CalibrationManager.kt
                </button>
                <button
                  onClick={() => setActiveCodeTab('driver')}
                  className={`py-1 px-2 rounded font-mono text-[9.5px] leading-none cursor-pointer transition-all ${
                    activeCodeTab === 'driver' ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400' : 'text-slate-500'
                  }`}
                >
                  InputDriver.kt
                </button>
              </div>
            </div>

            {/* Viewer pane */}
            <div className="relative group bg-[#07080B] p-4 text-xs font-mono max-h-[350px] overflow-y-auto w-full border-t border-slate-900">
              <div className="absolute top-2.5 right-2 px-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={() => {
                    const textToCopy = 
                      activeCodeTab === 'view' ? joystickViewCode :
                      activeCodeTab === 'calibration' ? calibrationCode : driverCode;
                    copyToClipboard(textToCopy, activeCodeTab);
                  }}
                  className="bg-[#15181F] hover:bg-[#1E232F] border border-slate-700 hover:border-slate-600 text-slate-300 p-1.5 rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition-all shadow"
                  title="Copy dynamic module code"
                >
                  {copiedText === activeCodeTab ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 text-[9.5px]">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Clipboard className="w-3.5 h-3.5" />
                      <span className="text-[9.5px]">Copy</span>
                    </>
                  )}
                </button>
              </div>
              
              <pre className="text-[11px] text-slate-350 leading-relaxed font-mono select-text whitespace-pre overflow-x-auto selection:bg-slate-750">
                <code>
                  {activeCodeTab === 'view' && joystickViewCode}
                  {activeCodeTab === 'calibration' && calibrationCode}
                  {activeCodeTab === 'driver' && driverCode}
                </code>
              </pre>
            </div>
            
            <div className="bg-[#15181F] py-2 px-4 border-t border-slate-800 text-[9.5px] text-slate-500 flex items-center gap-1 select-none font-sans justify-between">
              <span>* Complete copyable files with custom onDraw layouts and median matrix sorting.</span>
              <span className="font-mono text-slate-600">UTF-8 / Kotlin K2</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
