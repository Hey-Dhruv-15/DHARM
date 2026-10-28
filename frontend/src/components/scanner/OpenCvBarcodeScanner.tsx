import React, { useState, useEffect, useRef } from 'react';
import {
  BrowserBarcodeReader,
  MultiFormatOneDReader,
  BarcodeFormat,
  DecodeHintType,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
  GlobalHistogramBinarizer
} from '@zxing/library';
import Tesseract from 'tesseract.js';
import {
  Camera,
  CameraOff,
  Scan,
  Volume2,
  VolumeX,
  CheckCircle2,
  RefreshCw,
  FileText,
  Loader2,
  Barcode as BarcodeIcon,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface OpenCvBarcodeScannerProps {
  onScan: (barcode: string) => boolean | void;
  isScanning: boolean;
  onToggleScanning: (scanning: boolean) => void;
  simulationProducts?: { name: string; sku: string; barcode: string; weightKg: number }[];
}

// Checksum validators
function isValidEAN13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = parseInt(code[i], 10);
    sum += i % 2 === 0 ? d : d * 3;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(code[12], 10);
}

function isValidUPCA(code: string): boolean {
  if (!/^\d{12}$/.test(code)) return false;
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const d = parseInt(code[i], 10);
    sum += i % 2 === 0 ? d * 3 : d;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(code[11], 10);
}

// Extract barcode digits (8 to 14 numbers) strictly from OCR or raw strings
function extractBestBarcodeFromText(rawText: string): string | null {
  if (!rawText) return null;

  // 1. Spaced digits (e.g. "8 901063 139374" or "8 903754 000086")
  const spacedMatches = rawText.match(/\b\d[\d\s]{6,18}\d\b/g);
  if (spacedMatches) {
    for (const m of spacedMatches) {
      const clean = m.replace(/[^\d]/g, '');
      if (clean.length === 13 && isValidEAN13(clean)) return clean;
      if (clean.length === 12 && isValidUPCA(clean)) return clean;
      if (clean.length >= 8 && clean.length <= 14) return clean;
    }
  }

  // 2. Continuous digit sequences of 8 to 14 digits
  const digitSequences = rawText.match(/\d{8,14}/g);
  if (digitSequences && digitSequences.length > 0) {
    for (const seq of digitSequences) {
      if (seq.length === 13 && isValidEAN13(seq)) return seq;
      if (seq.length === 12 && isValidUPCA(seq)) return seq;
    }
    return digitSequences.sort((a, b) => b.length - a.length)[0];
  }

  // 3. Fallback: clean all non-digits
  const allClean = rawText.replace(/[^\d]/g, '');
  if (allClean.length >= 8 && allClean.length <= 14) {
    return allClean;
  }

  return null;
}

// 1D Horizontal Edge Sharpening Kernel [-1, 3, -1] for blurry barcode vertical bars
function sharpenHorizontalLuminance(src: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const dst = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    dst[rowOffset] = src[rowOffset];
    dst[rowOffset + width - 1] = src[rowOffset + width - 1];
    for (let x = 1; x < width - 1; x++) {
      const idx = rowOffset + x;
      const val = 3 * src[idx] - src[idx - 1] - src[idx + 1];
      dst[idx] = val < 0 ? 0 : val > 255 ? 255 : val;
    }
  }
  return dst;
}

// Local Adaptive 1D Thresholding for high-contrast barcode binarization
function adaptiveThreshold1D(src: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const dst = new Uint8ClampedArray(width * height);
  const windowSize = Math.max(8, Math.floor(width / 32));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    let localSum = 0;
    for (let x = 0; x < width; x++) {
      const left = Math.max(0, x - Math.floor(windowSize / 2));
      const right = Math.min(width - 1, x + Math.floor(windowSize / 2));
      const count = right - left + 1;
      localSum = 0;
      for (let k = left; k <= right; k++) {
        localSum += src[rowOffset + k];
      }
      const avg = localSum / count;
      dst[rowOffset + x] = src[rowOffset + x] < avg * 0.92 ? 0 : 255;
    }
  }
  return dst;
}

export const OpenCvBarcodeScanner: React.FC<OpenCvBarcodeScannerProps> = ({
  onScan,
  isScanning,
  onToggleScanning
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserBarcodeReader | null>(null);
  const secondaryFrameIntervalRef = useRef<any>(null);
  const ocrIntervalRef = useRef<any>(null);
  const tesseractWorkerRef = useRef<any>(null);
  const lastScannedRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isOcrProcessing, setIsOcrProcessing] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');

  // Scanned Success Card State ("camera should say scanned barcode for product and stop should go")
  const [scannedSuccessState, setScannedSuccessState] = useState<{
    code: string;
    source: string;
    timestamp: number;
  } | null>(null);

  // 1D retail and logistics product barcodes
  const barcodeFormats = [
    BarcodeFormat.EAN_13,
    BarcodeFormat.UPC_A,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_E,
    BarcodeFormat.ITF,
    BarcodeFormat.CODABAR
  ];

  // Pre-warm Tesseract OCR worker on mount so it's instantly ready
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const worker = await Tesseract.createWorker('eng', 1);
        await worker.setParameters({
          tessedit_char_whitelist: '0123456789 ',
          tessedit_pageseg_mode: (Tesseract as any).PSM?.SINGLE_LINE || ('7' as any)
        });
        if (isMounted) {
          tesseractWorkerRef.current = worker;
          console.log('Tesseract OCR worker pre-warmed & ready for barcode digits');
        } else {
          await worker.terminate();
        }
      } catch (err) {
        console.warn('OCR pre-warming notice:', err);
      }
    })();

    return () => {
      isMounted = false;
      if (tesseractWorkerRef.current) {
        tesseractWorkerRef.current.terminate();
        tesseractWorkerRef.current = null;
      }
    };
  }, []);

  // Web Audio chime
  const playBeep = (success = true) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (success) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(940, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.28, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.22);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.22);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch {}
  };

  // Run AI OCR specifically targeting barcode numbers underneath barcode lines
  const runOcrRecognition = async () => {
    const videoEl = videoRef.current;
    if (!videoEl || videoEl.readyState < 2 || videoEl.paused) return;

    setIsOcrProcessing(true);
    try {
      const vWidth = videoEl.videoWidth || 1280;
      const vHeight = videoEl.videoHeight || 720;

      // Crop specifically to the lower portion of the central reticle where barcode numbers are printed
      const cropWidth = Math.floor(vWidth * 0.70);
      const cropHeight = Math.floor(vHeight * 0.45);
      const cropX = Math.floor((vWidth - cropWidth) / 2);
      const cropY = Math.floor((vHeight - cropHeight) / 2) + Math.floor(cropHeight * 0.15);

      const canvas = document.createElement('canvas');
      canvas.width = cropWidth * 2;
      canvas.height = cropHeight * 2;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        setIsOcrProcessing(false);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(videoEl, cropX, cropY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);

      // Contrast stretching & binarization for digit clarity
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const lum = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
        const val = lum < 140 ? 0 : 255;
        d[i] = val;
        d[i + 1] = val;
        d[i + 2] = val;
      }
      ctx.putImageData(imgData, 0, 0);

      let rawText = '';
      if (tesseractWorkerRef.current) {
        const result = await tesseractWorkerRef.current.recognize(canvas);
        rawText = result?.data?.text || '';
      } else {
        const result: any = await (Tesseract as any).recognize(canvas, 'eng');
        rawText = result?.data?.text || '';
      }

      const extracted = extractBestBarcodeFromText(rawText);
      if (extracted) {
        handleDetectedCode(extracted, 'AI OCR Number Reader');
      }
    } catch (ocrErr) {
      console.warn('OCR attempt note:', ocrErr);
    } finally {
      setIsOcrProcessing(false);
    }
  };

  // Start Camera with universal 1D barcode scanner & HD constraints
  const startCamera = async (overrideCameraId?: string) => {
    setCameraError(null);
    setScannedSuccessState(null);
    onToggleScanning(true);

    try {
      await new Promise(r => setTimeout(r, 60));

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, barcodeFormats);
      hints.set(DecodeHintType.TRY_HARDER, true);

      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
      if (secondaryFrameIntervalRef.current) {
        clearInterval(secondaryFrameIntervalRef.current);
      }
      if (ocrIntervalRef.current) {
        clearInterval(ocrIntervalRef.current);
      }

      // BrowserBarcodeReader specializes strictly in 1D retail barcodes
      const reader = new BrowserBarcodeReader(60, hints);
      codeReaderRef.current = reader;

      const devices = await reader.getVideoInputDevices();
      if (devices && devices.length > 0) {
        setAvailableCameras(
          devices.map((d, idx) => ({ id: d.deviceId, label: d.label || `Camera ${idx + 1}` }))
        );
      }

      const targetId = overrideCameraId || selectedCameraId || (devices && devices[0]?.deviceId);

      if (videoRef.current) {
        // High Definition Media Constraints (1080p / 720p) for sharp barcode resolution
        const hdConstraints: MediaStreamConstraints = {
          video: {
            deviceId: targetId ? { exact: targetId } : undefined,
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            facingMode: 'environment',
            advanced: [{ focusMode: 'continuous' }] as any
          }
        };

        try {
          await reader.decodeFromConstraints(hdConstraints, videoRef.current, (result) => {
            if (result) {
              const text = result.getText();
              if (text && text.trim()) {
                handleDetectedCode(text.trim(), 'HD 1D Barcode Scanner');
              }
            }
          });
        } catch {
          // Fallback to standard resolution if hardware cannot do 1080p
          await reader.decodeFromConstraints({
            video: {
              deviceId: targetId ? { exact: targetId } : undefined,
              width: { ideal: 1280, min: 640 },
              height: { ideal: 720, min: 480 },
              facingMode: 'environment'
            }
          }, videoRef.current, (result) => {
            if (result) {
              const text = result.getText();
              if (text && text.trim()) {
                handleDetectedCode(text.trim(), '1D Barcode Scanner');
              }
            }
          });
        }

        // Multi-Pass Frame Loop with Edge Sharpening & Adaptive Thresholding (every 90ms)
        const standalone1DReader = new MultiFormatOneDReader(hints);
        const offscreenCanvas = document.createElement('canvas');
        const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });

        secondaryFrameIntervalRef.current = setInterval(() => {
          const v = videoRef.current;
          if (!v || v.readyState < 2 || v.paused) return;

          const w = v.videoWidth;
          const h = v.videoHeight;
          if (!w || !h || !offscreenCtx) return;

          // Crop center 75% width x 60% height
          const rw = Math.floor(w * 0.75);
          const rh = Math.floor(h * 0.60);
          const rx = Math.floor((w - rw) / 2);
          const ry = Math.floor((h - rh) / 2);

          offscreenCanvas.width = rw;
          offscreenCanvas.height = rh;
          offscreenCtx.drawImage(v, rx, ry, rw, rh, 0, 0, rw, rh);

          const imgData = offscreenCtx.getImageData(0, 0, rw, rh);
          const rgba = imgData.data;
          const luminances = new Uint8ClampedArray(rw * rh);
          for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
            luminances[j] = (rgba[i] * 299 + rgba[i + 1] * 587 + rgba[i + 2] * 114) / 1000;
          }

          // Pass 1: GlobalHistogramBinarizer on raw crop
          try {
            const lumSource = new RGBLuminanceSource(luminances, rw, rh);
            const bitmap = new BinaryBitmap(new GlobalHistogramBinarizer(lumSource));
            const res = standalone1DReader.decode(bitmap);
            if (res && res.getText()) {
              handleDetectedCode(res.getText(), 'Laser 1D Scan');
              return;
            }
          } catch {}

          // Pass 2: Horizontal Edge Sharpening (for blurry webcams)
          try {
            const sharpLuminance = sharpenHorizontalLuminance(luminances, rw, rh);
            const sharpSource = new RGBLuminanceSource(sharpLuminance, rw, rh);
            const sharpBitmap = new BinaryBitmap(new GlobalHistogramBinarizer(sharpSource));
            const res2 = standalone1DReader.decode(sharpBitmap);
            if (res2 && res2.getText()) {
              handleDetectedCode(res2.getText(), 'Enhanced Sharp Scan');
              return;
            }
          } catch {}

          // Pass 3: Adaptive 1D Thresholding
          try {
            const threshLuminance = adaptiveThreshold1D(luminances, rw, rh);
            const threshSource = new RGBLuminanceSource(threshLuminance, rw, rh);
            const threshBitmap = new BinaryBitmap(new GlobalHistogramBinarizer(threshSource));
            const res3 = standalone1DReader.decode(threshBitmap);
            if (res3 && res3.getText()) {
              handleDetectedCode(res3.getText(), 'Adaptive Binarized Scan');
              return;
            }
          } catch {}
        }, 90);

        // Auto-OCR background loop every 1.6s
        ocrIntervalRef.current = setInterval(() => {
          if (!isOcrProcessing) {
            runOcrRecognition();
          }
        }, 1600);
      }
    } catch (err: any) {
      console.warn('Camera start error:', err);
      setCameraError(
        err?.message || 'Camera device not accessible. Use manual barcode input.'
      );
      onToggleScanning(false);
    }
  };

  // Stop Camera cleanly
  const stopCamera = () => {
    if (secondaryFrameIntervalRef.current) {
      clearInterval(secondaryFrameIntervalRef.current);
      secondaryFrameIntervalRef.current = null;
    }
    if (ocrIntervalRef.current) {
      clearInterval(ocrIntervalRef.current);
      ocrIntervalRef.current = null;
    }

    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch (err) {
        console.warn('Stop scanner note:', err);
      }
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }

    onToggleScanning(false);
  };

  // Switch Camera
  const handleSwitchCamera = async (camId: string) => {
    setSelectedCameraId(camId);
    if (isScanning) {
      stopCamera();
      await startCamera(camId);
    }
  };

  // Handle scanned barcode: STRICT NUMBERS ONLY (digits 8 to 14)
  const handleDetectedCode = (rawCode: string, source = 'Optical Scan') => {
    if (!rawCode) return;

    // Filter out letters, packaging URLs, and special characters
    const cleanDigits = rawCode.replace(/[^0-9]/g, '');

    // STRICT CHECK: Must be NUMBERS ONLY and 8 to 14 digits!
    if (!cleanDigits || cleanDigits.length < 8 || cleanDigits.length > 14) {
      return;
    }

    const now = Date.now();
    // Prevent duplicate triggers within 1.8s
    if (lastScannedRef.current.code === cleanDigits && now - lastScannedRef.current.time < 1800) {
      return;
    }
    lastScannedRef.current = { code: cleanDigits, time: now };

    // 1. Play confirmation audio chime
    playBeep(true);

    // 2. Put pure numbers into manual input box
    setManualCode(cleanDigits);

    // 3. Set prominent on-screen Scanned Success banner
    setScannedSuccessState({
      code: cleanDigits,
      source,
      timestamp: now
    });

    // 4. Automatically stop the camera ("as soon as code is scanned stop should go and camera should say scanned barcode")
    stopCamera();

    // 5. Fire onScan to select product dynamically and add to container manifest
    onScan(cleanDigits);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    const digitsOnly = manualCode.replace(/[^0-9]/g, '');
    if (digitsOnly.length >= 8 && digitsOnly.length <= 14) {
      handleDetectedCode(digitsOnly, 'Manual Barcode Entry');
    }
  };

  // Auto-start camera when isScanning becomes true
  useEffect(() => {
    if (isScanning && !videoRef.current?.srcObject) {
      startCamera();
    }
  }, [isScanning]);

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-700/50 flex items-center justify-center text-indigo-400">
            <Scan className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>Barcode Number Scanner</span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-700 text-indigo-300 font-mono font-bold flex items-center gap-1">
                <BarcodeIcon className="w-3 h-3" />
                <span>Numbers Only (1D)</span>
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Hold barcode numbers inside the reticle. Captures product digits (EAN-13, UPC).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {availableCameras.length > 1 && (
            <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-700 rounded-xl px-2.5 py-1 text-xs text-neutral-300">
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <select
                value={selectedCameraId}
                onChange={e => handleSwitchCamera(e.target.value)}
                className="bg-transparent text-xs text-neutral-200 focus:outline-none cursor-pointer max-w-[130px] truncate"
              >
                {availableCameras.map(cam => (
                  <option key={cam.id} value={cam.id} className="bg-neutral-900 text-white">
                    {cam.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border text-xs transition cursor-pointer flex items-center gap-1.5 ${
              soundEnabled
                ? 'border-indigo-800 bg-indigo-950/40 text-indigo-300'
                : 'border-slate-800 bg-slate-900 text-slate-500'
            }`}
            title={soundEnabled ? 'Mute Audio' : 'Enable Audio'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline text-[11px] font-semibold">
              {soundEnabled ? 'Sound On' : 'Muted'}
            </span>
          </button>
        </div>
      </div>

      {/* Main Scanner Container (Video ALWAYS mounted in DOM) */}
      <div className="bg-black rounded-2xl border border-neutral-800 overflow-hidden relative shadow-2xl">
        <div className="relative w-full aspect-video sm:h-84 bg-neutral-950 flex items-center justify-center overflow-hidden">
          {/* The Direct HTML5 Video Element (ALWAYS MOUNTED) */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />

          {/* Glowing Laser Sweep and Scanning Reticle Frame */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-[85%] sm:w-[75%] h-[75%] sm:h-[70%] border-2 border-indigo-400/90 rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/20">
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-laser-sweep shadow-lg shadow-cyan-400" />
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-indigo-400 rounded-br-lg" />
              </div>
            </div>
          )}

          {/* Top Bar Controls when Camera is Active */}
          {isScanning ? (
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto z-20">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-neutral-700 text-xs font-semibold text-white">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Scanning Barcode Numbers</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={runOcrRecognition}
                  disabled={isOcrProcessing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50"
                  title="Run AI OCR to read printed barcode numbers"
                >
                  {isOcrProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Reading Numbers...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-3.5 h-3.5" />
                      <span>OCR Read Numbers</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={stopCamera}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition cursor-pointer"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>Stop</span>
                </button>
              </div>
            </div>
          ) : scannedSuccessState ? (
            /* Scanned Barcode Success State (Stop goes away, camera says scanned barcode for product) */
            <div className="absolute inset-0 bg-neutral-950/95 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 space-y-4 z-20 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-emerald-950 border-2 border-emerald-500/80 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Scanned Barcode for Product</span>
                </div>
                <div className="text-2xl sm:text-3xl font-mono font-extrabold text-white tracking-wide">
                  {scannedSuccessState.code}
                </div>
                <p className="text-xs text-neutral-400 max-w-sm mt-1">
                  Product loaded into container manifest.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setScannedSuccessState(null);
                  startCamera();
                }}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold rounded-full shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Scan Next Product / Open Camera</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Standby Overlay when camera paused/off */
            <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center text-center p-6 space-y-4 z-20">
              <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
                <Scan className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">
                  Barcode Scanner Standby
                </h4>
                <p className="text-xs text-neutral-400 mt-1 max-w-xs">
                  Ready to scan 1D retail barcode numbers (EAN-13, UPC).
                </p>
              </div>
              <button
                type="button"
                onClick={() => startCamera()}
                className="flex items-center gap-2 px-6 py-2.5 bg-neutral-100 hover:bg-white text-neutral-900 text-xs sm:text-sm font-bold rounded-full shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Start Barcode Scanner</span>
              </button>
              {cameraError && (
                <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-800 text-xs text-rose-300 max-w-sm">
                  {cameraError}
                </div>
              )}
            </div>
          )}

          {/* Bottom floating instruction while scanning */}
          {isScanning && (
            <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none z-20">
              <div className="px-4 py-1.5 rounded-full bg-black/85 backdrop-blur-md border border-neutral-700 text-[11px] text-neutral-200 font-medium">
                Hold product barcode inside reticle • Digits-only capture
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual Barcode Input Fallback */}
      <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={manualCode}
          onChange={e => setManualCode(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="Manual Barcode number entry (e.g. 8901063139374)..."
          className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm bg-neutral-900 border border-neutral-700 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 font-mono font-bold"
        />
        <button
          type="submit"
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
        >
          Add Code
        </button>
      </form>
    </div>
  );
};
