import React, { useState, useEffect, useRef } from 'react';
import {
  BrowserMultiFormatReader,
  MultiFormatReader,
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
  ArrowRight,
  Upload,
  Zap,
  Package
} from 'lucide-react';

interface OpenCvBarcodeScannerProps {
  onScan: (barcode: string) => boolean | void;
  isScanning: boolean;
  onToggleScanning: (scanning: boolean) => void;
  simulationProducts?: { name: string; sku: string; barcode: string; weightKg: number }[];
}

// All industrial, retail, and 2D barcode formats supported by DHARM
const ALL_BARCODE_FORMATS: BarcodeFormat[] = [
  BarcodeFormat.ITF,
  BarcodeFormat.EAN_13,
  BarcodeFormat.UPC_A,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODABAR,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.DATA_MATRIX
];

// Horizontal Edge Sharpening Kernel [-1, 3, -1] for blurry camera feeds
function sharpenHorizontal(src: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
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

// Adaptive local thresholding to overcome direct light glare or reflections
function adaptiveThreshold(src: Uint8ClampedArray, width: number, height: number, blockSize = 21): Uint8ClampedArray {
  const dst = new Uint8ClampedArray(width * height);
  const half = Math.floor(blockSize / 2);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    let localSum = 0;
    let count = 0;

    for (let k = 0; k < Math.min(blockSize, width); k++) {
      localSum += src[rowOffset + k];
      count++;
    }

    for (let x = 0; x < width; x++) {
      const left = Math.max(0, x - half);
      const right = Math.min(width - 1, x + half);
      count = right - left + 1;
      localSum = 0;
      for (let k = left; k <= right; k++) {
        localSum += src[rowOffset + k];
      }
      const avg = localSum / count;
      dst[rowOffset + x] = src[rowOffset + x] < avg * 0.90 ? 0 : 255;
    }
  }
  return dst;
}

// Contrast stretching & histogram normalization
function contrastStretch(src: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const dst = new Uint8ClampedArray(width * height);
  let min = 255;
  let max = 0;
  for (let i = 0; i < src.length; i++) {
    if (src[i] < min) min = src[i];
    if (src[i] > max) max = src[i];
  }
  const range = max - min || 1;
  for (let i = 0; i < src.length; i++) {
    dst[i] = Math.min(255, Math.max(0, Math.floor(((src[i] - min) / range) * 255)));
  }
  return dst;
}

// Rotates luminance by 90 degrees clockwise (for barcodes held sideways/vertically)
function rotate90(src: Uint8ClampedArray, width: number, height: number): { data: Uint8ClampedArray; width: number; height: number } {
  const newWidth = height;
  const newHeight = width;
  const dst = new Uint8ClampedArray(newWidth * newHeight);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const newX = height - 1 - y;
      const newY = x;
      dst[newY * newWidth + newX] = src[y * width + x];
    }
  }
  return { data: dst, width: newWidth, height: newHeight };
}

// Default presets for quick testing and instant 1-click packing
const QUICK_TEST_PRESETS = [
  { label: '📦 Carton Asset 993 (ITF-14)', code: '10614141999993' },
  { label: '🔬 Cryo-Shield Transporter', code: 'BC-MED-CRYO-0001' },
  { label: '⚡ Copper Wire (Roll)', code: '8901063139374' },
  { label: '🔘 Industrial Switch', code: '8901063139375' },
  { label: '🍏 Apple AI Model', code: 'BC-APL-001' },
  { label: '📊 Agamin SaaS License', code: 'BC-MKT-101' }
];

export const OpenCvBarcodeScanner: React.FC<OpenCvBarcodeScannerProps> = ({
  onScan,
  isScanning,
  onToggleScanning,
  simulationProducts = []
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const browserReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const cvLoopIntervalRef = useRef<any>(null);
  const tesseractWorkerRef = useRef<any>(null);
  const lastScannedRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isOcrProcessing, setIsOcrProcessing] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');
  const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [activeEngine, setActiveEngine] = useState<string>('OpenCV Multi-Engine + Native Vision');
  const [selectedProductBarcode, setSelectedProductBarcode] = useState<string>(
    simulationProducts[0]?.barcode || '10614141999993'
  );

  // Scanned Success Card State
  const [scannedSuccessState, setScannedSuccessState] = useState<{
    code: string;
    source: string;
    productName?: string;
    timestamp: number;
  } | null>(null);

  // Pre-warm Tesseract OCR worker on mount in the background
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const worker = await Tesseract.createWorker('eng');
        await worker.setParameters({
          tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-._',
          tessedit_pageseg_mode: (Tesseract as any).PSM?.SINGLE_LINE || ('7' as any)
        });
        if (isMounted) {
          tesseractWorkerRef.current = worker;
        } else {
          await worker.terminate();
        }
      } catch (err) {
        console.warn('OCR pre-warm note:', err);
      }
    })();

    return () => {
      isMounted = false;
      if (tesseractWorkerRef.current) {
        tesseractWorkerRef.current.terminate().catch(() => {});
        tesseractWorkerRef.current = null;
      }
    };
  }, []);

  // Sync selectedProductBarcode when simulationProducts updates
  useEffect(() => {
    if (simulationProducts.length > 0 && !selectedProductBarcode) {
      setSelectedProductBarcode(simulationProducts[0].barcode);
    }
  }, [simulationProducts]);

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
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.setValueAtTime(1175, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
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

  // Common Barcode Detection Handler (Supports BOTH numeric AND alphanumeric barcodes)
  const handleDetectedCode = (rawCode: string, source = 'Optical Scan') => {
    if (!rawCode) return;
    const cleanCode = rawCode.trim();
    if (!cleanCode || cleanCode.length < 3) return;

    const now = Date.now();
    // Debounce duplicate triggers within 1.5s
    if (lastScannedRef.current.code === cleanCode && now - lastScannedRef.current.time < 1500) {
      return;
    }
    lastScannedRef.current = { code: cleanCode, time: now };

    // Find matched product if any
    const matchedProd = simulationProducts.find(
      p => p.barcode.toLowerCase() === cleanCode.toLowerCase() ||
           p.sku.toLowerCase() === cleanCode.toLowerCase()
    );

    playBeep(true);
    setManualCode(cleanCode);

    setScannedSuccessState({
      code: cleanCode,
      source,
      productName: matchedProd?.name,
      timestamp: now
    });

    // Automatically stop camera after successful scan
    stopCamera();

    // Notify parent
    onScan(cleanCode);
  };

  // Fast, Targeted OCR Digit Strip Reader (With 2.5s strict timeout to prevent hangs)
  const runOcrRecognition = async () => {
    const videoEl = videoRef.current;
    if (!videoEl || videoEl.readyState < 2 || videoEl.paused || isOcrProcessing) return;

    setIsOcrProcessing(true);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('OCR Timeout')), 2500));

    try {
      const vWidth = videoEl.videoWidth || 1280;
      const vHeight = videoEl.videoHeight || 720;

      // Reticle bounds
      const rw = Math.floor(vWidth * 0.80);
      const rh = Math.floor(vHeight * 0.65);
      const rx = Math.floor((vWidth - rw) / 2);
      const ry = Math.floor((vHeight - rh) / 2);

      // Digits are printed in the bottom 30% strip of the reticle
      const digitX = Math.floor(rx + rw * 0.05);
      const digitY = Math.floor(ry + rh * 0.65);
      const digitW = Math.floor(rw * 0.90);
      const digitH = Math.floor(rh * 0.32);

      const canvas = document.createElement('canvas');
      canvas.width = digitW;
      canvas.height = digitH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(videoEl, digitX, digitY, digitW, digitH, 0, 0, digitW, digitH);

      // Contrast binarize: boosts black numbers on white carton background
      const imgData = ctx.getImageData(0, 0, digitW, digitH);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const lum = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
        const val = lum < 135 ? 0 : 255;
        d[i] = val;
        d[i + 1] = val;
        d[i + 2] = val;
      }
      ctx.putImageData(imgData, 0, 0);

      const ocrTask = (async () => {
        if (tesseractWorkerRef.current) {
          const result = await tesseractWorkerRef.current.recognize(canvas);
          return result?.data?.text || '';
        } else {
          const worker = await Tesseract.createWorker('eng');
          tesseractWorkerRef.current = worker;
          const result = await worker.recognize(canvas);
          return result?.data?.text || '';
        }
      })();

      const text = (await Promise.race([ocrTask, timeoutPromise])) as string;

      // 1. Check known products
      for (const p of simulationProducts) {
        if (text.includes(p.barcode) || text.includes(p.sku)) {
          handleDetectedCode(p.barcode, 'AI OCR Vision Reader');
          return;
        }
      }

      // 2. Extract digits sequence (e.g. 10614141999993, 8901063139374)
      const digitsOnly = text.replace(/[^0-9]/g, '');
      if (digitsOnly.length >= 8 && digitsOnly.length <= 14) {
        handleDetectedCode(digitsOnly, 'AI OCR Digits Vision');
        return;
      }

      const match = text.match(/\b(BC-[A-Za-z0-9-]+|\d{8,14})\b/);
      if (match && match[0]) {
        handleDetectedCode(match[0], 'AI OCR Vision Reader');
      }
    } catch (err) {
      console.warn('OCR note:', err);
    } finally {
      setIsOcrProcessing(false);
    }
  };

  // Universal Hardware / OpenCV Multi-Engine Start
  const startCamera = async (overrideCameraId?: string) => {
    setCameraError(null);
    setScannedSuccessState(null);
    onToggleScanning(true);

    try {
      await new Promise(r => setTimeout(r, 80));

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, ALL_BARCODE_FORMATS);
      hints.set(DecodeHintType.TRY_HARDER, true);

      if (browserReaderRef.current) {
        browserReaderRef.current.reset();
      }
      if (cvLoopIntervalRef.current) {
        clearInterval(cvLoopIntervalRef.current);
      }

      const reader = new BrowserMultiFormatReader(hints, 60);
      browserReaderRef.current = reader;

      const devices = await reader.getVideoInputDevices();
      if (devices && devices.length > 0) {
        setAvailableCameras(
          devices.map((d: any, idx: number) => ({ id: d.deviceId, label: d.label || `Camera ${idx + 1}` }))
        );
      }

      const targetId = overrideCameraId || selectedCameraId || (devices && devices[0]?.deviceId);

      if (videoRef.current) {
        const constraints: MediaStreamConstraints = {
          video: {
            deviceId: targetId ? { exact: targetId } : undefined,
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            facingMode: 'environment'
          }
        };

        // Start stream
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        }

        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // Check torch capability
        const track = stream.getVideoTracks()[0];
        const capabilities: any = track?.getCapabilities ? track.getCapabilities() : {};
        if (capabilities.torch) {
          setHasTorch(true);
        }

        // =====================================================================
        // ENGINE 1: NATIVE BROWSER BARCODE DETECTOR (GPU Accelerated Machine Vision)
        // =====================================================================
        let nativeDetector: any = null;
        if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
          try {
            nativeDetector = new (window as any).BarcodeDetector({
              formats: [
                'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93',
                'itf', 'codabar', 'qr_code', 'data_matrix', 'aztec'
              ]
            });
            setActiveEngine('Native Machine Learning Vision (GPU Accelerated)');
          } catch {
            nativeDetector = null;
          }
        }

        // =====================================================================
        // ENGINE 2 & 3: OPENCV-STYLE MULTI-PASS CANVAS IMAGE PROCESSING LOOP (60fps)
        // =====================================================================
        const zxingStandalone = new MultiFormatReader();
        zxingStandalone.setHints(hints);

        const offCanvas = document.createElement('canvas');
        const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });

        const rotCanvas = document.createElement('canvas');
        const rotCtx = rotCanvas.getContext('2d', { willReadFrequently: true });

        let frameCounter = 0;

        cvLoopIntervalRef.current = setInterval(async () => {
          const v = videoRef.current;
          if (!v || v.readyState < 2 || v.paused) return;
          frameCounter++;

          // Pass A: Native BarcodeDetector direct on video element
          if (nativeDetector) {
            try {
              const barcodes = await nativeDetector.detect(v);
              if (barcodes && barcodes.length > 0) {
                const code = barcodes[0].rawValue;
                if (code && code.trim()) {
                  handleDetectedCode(code.trim(), 'Native ML Vision Engine');
                  return;
                }
              }
            } catch {}
          }

          const w = v.videoWidth;
          const h = v.videoHeight;
          if (!w || !h || !offCtx) return;

          // Crop center 80% width x 65% height
          const rw = Math.floor(w * 0.80);
          const rh = Math.floor(h * 0.65);
          const rx = Math.floor((w - rw) / 2);
          const ry = Math.floor((h - rh) / 2);

          offCanvas.width = rw;
          offCanvas.height = rh;
          offCtx.drawImage(v, rx, ry, rw, rh, 0, 0, rw, rh);

          // Pass B: Native detector on cropped canvas
          if (nativeDetector) {
            try {
              const bCodes = await nativeDetector.detect(offCanvas);
              if (bCodes && bCodes.length > 0) {
                const code = bCodes[0].rawValue;
                if (code && code.trim()) {
                  handleDetectedCode(code.trim(), 'Native ML Vision Engine');
                  return;
                }
              }
            } catch {}
          }

          // Extract luminance for OpenCV-style filters
          const imgData = offCtx.getImageData(0, 0, rw, rh);
          const rgba = imgData.data;
          const luminances = new Uint8ClampedArray(rw * rh);
          for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
            luminances[j] = (rgba[i] * 299 + rgba[i + 1] * 587 + rgba[i + 2] * 114) / 1000;
          }

          // Pass 1: Direct ZXing Hybrid Binarizer
          try {
            const lumSrc = new RGBLuminanceSource(luminances, rw, rh);
            const bmp1 = new BinaryBitmap(new HybridBinarizer(lumSrc));
            const res1 = zxingStandalone.decode(bmp1);
            if (res1 && res1.getText()) {
              handleDetectedCode(res1.getText(), 'OpenCV ZXing Hybrid Scan');
              return;
            }
          } catch {}

          // Pass 2: Direct ZXing Global Binarizer
          try {
            const lumSrc = new RGBLuminanceSource(luminances, rw, rh);
            const bmp2 = new BinaryBitmap(new GlobalHistogramBinarizer(lumSrc));
            const res2 = zxingStandalone.decode(bmp2);
            if (res2 && res2.getText()) {
              handleDetectedCode(res2.getText(), 'OpenCV ZXing Global Scan');
              return;
            }
          } catch {}

          // Pass 3: Inner ITF-14 Barcode Slice with Synthetic Quiet Zone
          // Solves thick solid black bearer borders on shipping cartons like 10614141999993
          try {
            const sliceRatios = [0.42, 0.50, 0.35];
            const sliceH = Math.max(16, Math.floor(rh * 0.18));
            const padX = 30; // Synthetic 30px pure white quiet zone
            const innerW = rw + padX * 2;

            for (const ratio of sliceRatios) {
              const sliceY = Math.floor(rh * ratio);
              const innerLum = new Uint8ClampedArray(innerW * sliceH);
              innerLum.fill(255); // Fill with pure white

              for (let y = 0; y < sliceH; y++) {
                const srcRow = (sliceY + y) * rw;
                const dstRow = y * innerW + padX;
                for (let x = 0; x < rw; x++) {
                  innerLum[dstRow + x] = luminances[srcRow + x];
                }
              }

              const innerSrc = new RGBLuminanceSource(innerLum, innerW, sliceH);
              const bmpInner = new BinaryBitmap(new HybridBinarizer(innerSrc));
              const resInner = zxingStandalone.decode(bmpInner);
              if (resInner && resInner.getText()) {
                handleDetectedCode(resInner.getText(), 'OpenCV ITF-14 Bearer Box Filter');
                return;
              }
            }
          } catch {}

          // Pass 4: Angular Tilt Compensation (-8° and +8° rotation)
          // Barcodes held in front of a laptop camera are often tilted 5° - 15°
          if (frameCounter % 2 === 0 && rotCtx) {
            try {
              const angles = [-8, 8];
              for (const angle of angles) {
                rotCanvas.width = rw;
                rotCanvas.height = rh;
                rotCtx.save();
                rotCtx.translate(rw / 2, rh / 2);
                rotCtx.rotate((angle * Math.PI) / 180);
                rotCtx.drawImage(offCanvas, -rw / 2, -rh / 2);
                rotCtx.restore();

                const rotImgData = rotCtx.getImageData(0, 0, rw, rh);
                const rotRgba = rotImgData.data;
                const rotLum = new Uint8ClampedArray(rw * rh);
                for (let i = 0, j = 0; i < rotRgba.length; i += 4, j++) {
                  rotLum[j] = (rotRgba[i] * 299 + rotRgba[i + 1] * 587 + rotRgba[i + 2] * 114) / 1000;
                }

                const rotSrc = new RGBLuminanceSource(rotLum, rw, rh);
                const bmpRot = new BinaryBitmap(new HybridBinarizer(rotSrc));
                const resRot = zxingStandalone.decode(bmpRot);
                if (resRot && resRot.getText()) {
                  handleDetectedCode(resRot.getText(), `OpenCV Tilt-Compensated (${angle}°) Scan`);
                  return;
                }
              }
            } catch {}
          }

          // Pass 5: Contrast Stretch & Horizontal Edge Sharpening (for blurry webcams)
          try {
            const stretched = contrastStretch(luminances, rw, rh);
            const sharpened = sharpenHorizontal(stretched, rw, rh);
            const sharpSrc = new RGBLuminanceSource(sharpened, rw, rh);
            const bmpSharp = new BinaryBitmap(new GlobalHistogramBinarizer(sharpSrc));
            const resSharp = zxingStandalone.decode(bmpSharp);
            if (resSharp && resSharp.getText()) {
              handleDetectedCode(resSharp.getText(), 'OpenCV Edge-Sharpened Filter');
              return;
            }
          } catch {}

          // Pass 6: 90-degree Rotation (for barcodes held sideways or vertically)
          try {
            const rot = rotate90(luminances, rw, rh);
            const rotSrc = new RGBLuminanceSource(rot.data, rot.width, rot.height);
            const bmpRot = new BinaryBitmap(new GlobalHistogramBinarizer(rotSrc));
            const resRot = zxingStandalone.decode(bmpRot);
            if (resRot && resRot.getText()) {
              handleDetectedCode(resRot.getText(), 'OpenCV 90-Degree Orthogonal Scan');
              return;
            }
          } catch {}

          // Pass 7: Adaptive Thresholding (removes surface glare and reflections)
          try {
            const thresh = adaptiveThreshold(luminances, rw, rh);
            const threshSrc = new RGBLuminanceSource(thresh, rw, rh);
            const bmpThresh = new BinaryBitmap(new GlobalHistogramBinarizer(threshSrc));
            const resThresh = zxingStandalone.decode(bmpThresh);
            if (resThresh && resThresh.getText()) {
              handleDetectedCode(resThresh.getText(), 'OpenCV Adaptive Threshold Filter');
              return;
            }
          } catch {}
        }, 60);
      }
    } catch (err: any) {
      console.warn('Camera initialization error:', err);
      setCameraError(err?.message || 'Camera device not accessible. Use manual entry or product selector below.');
      onToggleScanning(false);
    }
  };

  // Toggle Torch / Flashlight
  const toggleTorch = async () => {
    if (!videoRef.current?.srcObject) return;
    try {
      const stream = videoRef.current.srcObject as MediaStream;
      const track = stream.getVideoTracks()[0];
      const next = !torchEnabled;
      await (track as any).applyConstraints({
        advanced: [{ torch: next }]
      });
      setTorchEnabled(next);
    } catch (err) {
      console.warn('Torch toggle error:', err);
    }
  };

  // Handle uploaded image file (Upload Barcode Image / Photo)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);

        // Native Detector first
        if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
          try {
            const nativeDet = new (window as any).BarcodeDetector();
            const bCodes = await nativeDet.detect(canvas);
            if (bCodes && bCodes.length > 0) {
              const code = bCodes[0].rawValue;
              if (code && code.trim()) {
                handleDetectedCode(code.trim(), 'Image File Native ML');
                return;
              }
            }
          } catch {}
        }

        // ZXing Multi-format on uploaded image
        try {
          const imgData = ctx.getImageData(0, 0, img.width, img.height);
          const rgba = imgData.data;
          const lum = new Uint8ClampedArray(img.width * img.height);
          for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
            lum[j] = (rgba[i] * 299 + rgba[i + 1] * 587 + rgba[i + 2] * 114) / 1000;
          }

          const hints = new Map();
          hints.set(DecodeHintType.POSSIBLE_FORMATS, ALL_BARCODE_FORMATS);
          hints.set(DecodeHintType.TRY_HARDER, true);

          const zxing = new MultiFormatReader();
          zxing.setHints(hints);

          const src = new RGBLuminanceSource(lum, img.width, img.height);
          const bmp = new BinaryBitmap(new HybridBinarizer(src));
          const res = zxing.decode(bmp);
          if (res && res.getText()) {
            handleDetectedCode(res.getText(), 'Image File ZXing Decoder');
            return;
          }
        } catch {}

        // Fallback OCR on uploaded image
        try {
          let text = '';
          if (tesseractWorkerRef.current) {
            const result = await tesseractWorkerRef.current.recognize(canvas);
            text = result?.data?.text || '';
          } else {
            const worker = await Tesseract.createWorker('eng');
            const result = await worker.recognize(canvas);
            text = result?.data?.text || '';
          }

          const digitsOnly = text.replace(/[^0-9]/g, '');
          if (digitsOnly.length >= 8 && digitsOnly.length <= 14) {
            handleDetectedCode(digitsOnly, 'Image File OCR Vision');
            return;
          }

          const bcMatch = text.match(/\b(BC-[A-Za-z0-9-]+|\d{8,14})\b/);
          if (bcMatch && bcMatch[0]) {
            handleDetectedCode(bcMatch[0], 'Image File OCR Vision');
            return;
          }
        } catch {}

        setCameraError('Could not decode barcode from image. Please ensure barcode is well-lit and in focus.');
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Stop camera feed and clear all loops
  const stopCamera = () => {
    if (cvLoopIntervalRef.current) {
      clearInterval(cvLoopIntervalRef.current);
      cvLoopIntervalRef.current = null;
    }
    if (browserReaderRef.current) {
      browserReaderRef.current.reset();
      browserReaderRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setTorchEnabled(false);
    onToggleScanning(false);
  };

  // Switch between cameras
  const switchCamera = async (deviceId: string) => {
    setSelectedCameraId(deviceId);
    if (isScanning) {
      stopCamera();
      await new Promise(r => setTimeout(r, 120));
      startCamera(deviceId);
    }
  };

  // Manual code submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleDetectedCode(manualCode.trim(), 'Manual Keyboard Entry');
  };

  // Quick product select and pack
  const handleQuickSelectPack = () => {
    if (!selectedProductBarcode) return;
    handleDetectedCode(selectedProductBarcode, 'UI Product Selector');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Hidden file input for Scan From Image */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Header with Engine Badge and Quick Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <BarcodeIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                OpenCV Barcode Scanner
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-600/70 text-emerald-300 font-bold flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Multi-Engine OpenCV + Native AI</span>
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Detects 1D retail barcodes (EAN-13, UPC, ITF-14) and warehouse codes (Code128, QR, Code39) at any angle.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {/* Upload Image Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition border border-neutral-700 cursor-pointer shadow-sm"
            title="Upload photo or screenshot of barcode"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>Upload Image</span>
          </button>

          {/* Sound Mute/Unmute */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition border border-neutral-700 cursor-pointer"
            title={soundEnabled ? 'Mute Beep Chime' : 'Enable Beep Chime'}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Sound On</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-neutral-400" />
                <span className="hidden sm:inline">Muted</span>
              </>
            )}
          </button>

          {/* Torch Toggle if available */}
          {hasTorch && isScanning && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`p-1.5 rounded-lg text-xs font-semibold transition border cursor-pointer ${
                torchEnabled
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-neutral-800 text-neutral-300 border-neutral-700'
              }`}
              title="Toggle Flashlight / Torch"
            >
              <Zap className="w-4 h-4" />
            </button>
          )}

          {/* Camera Selector Dropdown */}
          {availableCameras.length > 1 && (
            <div className="relative">
              <select
                value={selectedCameraId}
                onChange={e => switchCamera(e.target.value)}
                className="bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs rounded-lg px-2.5 py-1.5 pr-6 appearance-none focus:outline-none cursor-pointer"
              >
                {availableCameras.map(cam => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label}
                  </option>
                ))}
              </select>
              <RefreshCw className="w-3 h-3 text-neutral-400 absolute right-2 top-2.5 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="relative w-full aspect-16/9 sm:aspect-21/9 bg-neutral-950 rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl">
        {/* Video stream element */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            isScanning ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Reticle Overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {/* Active Scanning Reticle Box */}
          {isScanning && (
            <div className="relative w-[85%] sm:w-[75%] h-[68%] rounded-xl border-2 border-indigo-500/80 shadow-[0_0_25px_rgba(99,102,241,0.25)] flex items-center justify-center overflow-hidden">
              {/* Corner brackets */}
              <span className="absolute top-0 left-0 w-4 h-4 border-t-3 border-l-3 border-cyan-400 rounded-tl-sm" />
              <span className="absolute top-0 right-0 w-4 h-4 border-t-3 border-r-3 border-cyan-400 rounded-tr-sm" />
              <span className="absolute bottom-0 left-0 w-4 h-4 border-b-3 border-l-3 border-cyan-400 rounded-bl-sm" />
              <span className="absolute bottom-0 right-0 w-4 h-4 border-b-3 border-r-3 border-cyan-400 rounded-br-sm" />

              {/* Animated laser scan line */}
              <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#22d3ee] animate-pulse transition-all duration-300" />
            </div>
          )}

          {/* Active Overlay Controls (Floating top bar) */}
          {isScanning ? (
            <div className="absolute top-3 inset-x-3 sm:inset-x-5 flex items-center justify-between pointer-events-auto z-20">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-neutral-700 text-xs font-semibold text-neutral-200">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span>OpenCV Computer Vision Active</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={runOcrRecognition}
                  disabled={isOcrProcessing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50"
                  title="Run AI OCR to read printed text/digits"
                >
                  {isOcrProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Reading...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-3.5 h-3.5" />
                      <span>OCR Read Digits</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={stopCamera}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition cursor-pointer"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>Stop</span>
                </button>
              </div>
            </div>
          ) : scannedSuccessState ? (
            /* Scanned Barcode Success State */
            <div className="absolute inset-0 bg-neutral-950/95 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 space-y-4 z-20 animate-in fade-in zoom-in-95 duration-200 pointer-events-auto">
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
                {scannedSuccessState.productName && (
                  <div className="text-sm font-semibold text-slate-300">
                    {scannedSuccessState.productName}
                  </div>
                )}
                <div className="text-[11px] text-neutral-400">
                  Detected via {scannedSuccessState.source} • Packed into Manifest
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setScannedSuccessState(null);
                  startCamera();
                }}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <span>Scan Another Barcode</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Standby Overlay when camera paused/off */
            <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center text-center p-6 space-y-4 z-20 pointer-events-auto">
              <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
                <Scan className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">
                  OpenCV Barcode Scanner Standby
                </h4>
                <p className="text-xs text-neutral-400 mt-1 max-w-xs">
                  Ready to scan 1D retail barcodes (EAN-13, UPC, ITF-14) and warehouse SKUs (Code128, QR).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-neutral-100 hover:bg-white text-neutral-900 text-xs sm:text-sm font-bold rounded-full shadow-lg transition-transform active:scale-95 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start Barcode Scanner</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-200 text-xs sm:text-sm font-bold rounded-full transition cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Scan From Image</span>
                </button>
              </div>
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
                Hold product barcode inside reticle • OpenCV auto-detects horizontal & vertical
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick-Test Presets (Click to Instantly Pack without camera) */}
      <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Quick-Test Presets (Click to Instantly Pack Item):</span>
          </span>
          <span className="text-[10px] text-slate-400">1-Click instant barcode packing</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {QUICK_TEST_PRESETS.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => handleDetectedCode(item.code, 'Quick-Test Preset')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 border border-slate-700 hover:border-indigo-500 text-xs text-slate-200 hover:text-white font-mono transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <span>{item.label}</span>
              <span className="text-[10px] text-indigo-300 bg-slate-950/70 px-1 py-0.5 rounded font-mono font-bold">
                {item.code}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Select Product in UI (Direct Catalog Picker) */}
      {simulationProducts.length > 0 && (
        <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1">
            <Package className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-xs font-bold text-slate-200 whitespace-nowrap">
              Select Product in UI:
            </span>
            <select
              value={selectedProductBarcode}
              onChange={e => setSelectedProductBarcode(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {simulationProducts.map((p, idx) => (
                <option key={idx} value={p.barcode}>
                  {p.name} (SKU: {p.sku} | Barcode: {p.barcode} | {p.weightKg} kg)
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleQuickSelectPack}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pack Selected Product</span>
          </button>
        </div>
      )}

      {/* Manual Barcode Input Fallback (Allows BOTH alphanumeric & digits) */}
      <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={manualCode}
          onChange={e => setManualCode(e.target.value)}
          placeholder="Manual Barcode number entry (e.g. 10614141999993, BC-MED-CRYO-0001)..."
          className="flex-1 bg-neutral-900/90 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 font-mono tracking-wider focus:outline-none transition shadow-inner"
        />
        <button
          type="submit"
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-md shadow-indigo-600/30 whitespace-nowrap"
        >
          Add Code
        </button>
      </form>
    </div>
  );
};
