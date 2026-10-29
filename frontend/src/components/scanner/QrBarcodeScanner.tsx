import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Modal } from '../common/Modal';
import {
  Camera,
  CameraOff,
  Keyboard,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ShieldAlert,
  ArrowRight,
  RotateCcw
} from 'lucide-react';

interface QrBarcodeScannerProps {
  title?: string;
  defaultShipmentId?: string;
  defaultContainerId?: string;
  onFinishVerification?: (shipmentId?: string) => void;
}

export const QrBarcodeScanner: React.FC<QrBarcodeScannerProps> = ({
  title = 'Intelligent Barcode & QR Verification Engine',
  defaultShipmentId,
  defaultContainerId,
  onFinishVerification
}) => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const {
    shipments,
    containers,
    products,
    processScan,
    reconcileShipmentReceiving
  } = useData();

  // State
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>(
    defaultShipmentId || shipments[0]?.id || ''
  );
  const [selectedContainerId, setSelectedContainerId] = useState<string>(
    defaultContainerId || containers[0]?.id || ''
  );
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraNotice, setCameraNotice] = useState<string | null>(null);
  const [lastMatchedProductId, setLastMatchedProductId] = useState<string | null>(null);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [scanAlert, setScanAlert] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
    code: string;
    productName?: string;
  } | null>(null);

  const manualInputRef = useRef<HTMLInputElement | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader-container';

  const selectedShipment = shipments.find(s => s.id === selectedShipmentId);

  // Compute live verification progress
  const totalExpected = selectedShipment?.items.reduce((acc, i) => acc + i.expectedQuantity, 0) || 0;
  const totalVerified = selectedShipment?.items.reduce((acc, i) => acc + (i.verifiedQuantity || 0), 0) || 0;
  const matchRate = totalExpected > 0 ? Math.min(100, Math.round((totalVerified / totalExpected) * 100)) : 0;

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current
          .stop()
          .then(() => html5QrCodeRef.current?.clear())
          .catch(err => console.error('Error stopping QR scanner:', err));
      }
    };
  }, []);

  const playScanAudio = (isSuccess: boolean) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (isSuccess) {
        // High two-tone success chime (880Hz -> 1175Hz)
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.setValueAtTime(1175, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } else {
        // Low alert buzz (260Hz -> 160Hz)
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, audioCtx.currentTime);
        osc.frequency.setValueAtTime(160, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch {
      // Audio autoplay policy or not supported
    }
  };

  const startScanner = async () => {
    setCameraError(null);
    setCameraNotice('Requesting camera device access...');

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);
      }

      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        throw new Error('No physical camera device detected on this system.');
      }

      // Prefer back camera on mobile or default first camera
      const cameraId = devices.length > 1 ? devices[1].id : devices[0].id;

      await html5QrCodeRef.current.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        decodedText => {
          handleScannedCode(decodedText);
        },
        () => {
          // Frame error (silently ignore normal non-detection frames)
        }
      );

      setIsScanning(true);
      setCameraNotice('Live camera active. Position barcode inside reticle.');
    } catch (err: any) {
      console.warn('Camera start error:', err);
      setIsScanning(false);
      setCameraError(
        err?.message || 'Unable to access camera. Please allow camera permissions or use manual entry below.'
      );
      setCameraNotice('Camera unavailable on this hardware. Use manual barcode input or quick scenario simulators.');
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        setIsScanning(false);
        setCameraNotice('Camera standby mode.');
      } catch (err) {
        console.error('Stop scanner error:', err);
      }
    }
  };

  const handleScannedCode = (code: string) => {
    if (!code || !code.trim()) return;

    const cleanCode = code.trim();
    const res = processScan(
      cleanCode,
      selectedShipmentId,
      selectedContainerId,
      user?.name || 'Operator',
      role || 'VENDOR'
    );

    if (res.valid) {
      const pName = res.matchedProduct?.name || res.matchedContainer?.containerNumber || cleanCode;
      if (res.matchedProduct?.id) {
        setLastMatchedProductId(res.matchedProduct.id);
      }
      setScanAlert({
        type: 'success',
        title: 'Successfully matched the products!',
        message: `Successfully matched ${pName} (${res.matchedProduct?.sku || cleanCode}) against shipment manifest.`,
        productName: pName,
        code: cleanCode
      });
      playScanAudio(true);
    } else {
      setLastMatchedProductId(null);
      setScanAlert({
        type: 'error',
        title: 'Scan Failed — Please Scan Again',
        message: res.message,
        code: cleanCode
      });
      playScanAudio(false);
    }
  };

  const handleProceedToNextScreen = async () => {
    setCompleteModalOpen(false);
    if (totalVerified < totalExpected) {
      await reconcileShipmentReceiving(selectedShipmentId, user?.name || 'Vendor Operator', role || 'VENDOR');
    }
    if (onFinishVerification) {
      onFinishVerification(selectedShipmentId);
      return;
    }
    if (role === 'VENDOR') {
      navigate('/vendor/shipments/outgoing');
    } else if (role === 'OWNER') {
      navigate('/owner/shipments');
    } else {
      navigate('/customer/shipments');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleScannedCode(manualCode);
    setManualCode('');
  };

  const handleNavigateReportDamage = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error('Stop scanner error:', err);
      }
    }

    let targetProductId = lastMatchedProductId;
    let targetSku = '';
    let targetQty = 1;

    if (targetProductId) {
      const prod = products.find(p => p.id === targetProductId);
      targetSku = prod?.sku || '';
      const manifestItem = selectedShipment?.items.find(
        i => i.productId === targetProductId || i.sku === prod?.sku
      );
      if (manifestItem) {
        targetQty = manifestItem.expectedQuantity;
      }
    } else if (selectedShipment?.items && selectedShipment.items.length > 0) {
      const firstItem = selectedShipment.items[0];
      targetProductId = firstItem.productId;
      targetSku = firstItem.sku;
      targetQty = firstItem.expectedQuantity;
    } else if (products.length > 0) {
      targetProductId = products[0].id;
      targetSku = products[0].sku;
    }

    const targetRoute = role === 'OWNER' ? '/owner/discrepancies' : '/vendor/discrepancies';

    navigate(targetRoute, {
      state: {
        openReportModal: true,
        shipmentId: selectedShipmentId,
        productId: targetProductId,
        sku: targetSku,
        type: 'Damaged Goods' as const,
        severity: 'Medium' as const,
        expectedQty: targetQty,
        observedQty: 0,
        notes: ''
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Shipment Context Selector */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span>{title}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {role} Mode
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time reconciliation of physical barcode/QR scans against cryptographic shipment manifests.
          </p>
        </div>

        {/* Shipment & Container Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Active Shipment
            </label>
            <select
              value={selectedShipmentId}
              onChange={e => setSelectedShipmentId(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {shipments.map(s => (
                <option key={s.id} value={s.id}>
                  {s.trackingNumber} ({s.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Container / Tote
            </label>
            <select
              value={selectedContainerId}
              onChange={e => setSelectedContainerId(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">No Container (Loose Items)</option>
              {containers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.containerNumber} ({c.type})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Scanner Camera + Quick Simulators, Right Manifest Reconciliation Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scanner Viewport (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${isScanning ? 'bg-emerald-500 animate-ping' : 'bg-slate-300'}`} />
                <span className="text-xs font-bold text-slate-700">
                  {isScanning ? 'Scanner Active & Listening' : 'Camera Standby'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {!isScanning ? (
                  <button
                    onClick={startScanner}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Start Camera</span>
                  </button>
                ) : (
                  <button
                    onClick={stopScanner}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
                  >
                    <CameraOff className="w-3.5 h-3.5" />
                    <span>Stop Camera</span>
                  </button>
                )}
              </div>
            </div>

            {/* Camera Viewport Canvas */}
            <div
              className={`relative w-full aspect-video sm:h-72 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border-2 transition-all ${
                scanAlert?.type === 'success'
                  ? 'border-emerald-500 shadow-md shadow-emerald-500/20'
                  : scanAlert?.type === 'error'
                  ? 'border-rose-500 shadow-md shadow-rose-500/20 ring-2 ring-rose-500/20'
                  : 'border-slate-800'
              }`}
            >
              <div id={scannerContainerId} className="w-full h-full" />

              {/* In-viewport Live HUD Status Badge */}
              {scanAlert?.type === 'success' && (
                <div className="absolute top-3 right-3 bg-emerald-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg border border-emerald-400 z-10 animate-in fade-in duration-150">
                  <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                  <span>Successfully matched the products!</span>
                </div>
              )}

              {scanAlert?.type === 'error' && (
                <div className="absolute top-3 right-3 bg-rose-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg border border-rose-400 z-10 animate-in fade-in duration-150">
                  <AlertTriangle className="w-4 h-4 text-rose-100" />
                  <span>Scan Failed — Please Scan Again</span>
                </div>
              )}

              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-slate-900/95">
                  <Camera className="w-12 h-12 text-slate-600 mb-3" />
                  <p className="text-sm font-semibold text-slate-300">
                    Live Barcode / QR Scanner
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    Click "Start Camera" to scan with your physical camera, or use the manual barcode field and quick simulators below.
                  </p>
                  {cameraError && (
                    <div className="mt-3 px-3 py-1.5 rounded-lg bg-red-950/80 border border-red-800 text-[11px] text-red-300">
                      {cameraError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Realtime Feedback Banner: Scanned Successfully / Scan Again */}
            {scanAlert && (
              <div
                className={`mt-4 p-4 rounded-2xl border transition-all ${
                  scanAlert.type === 'success'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950 ring-2 ring-emerald-500/20'
                    : 'bg-rose-50 border-rose-300 text-rose-950 ring-2 ring-rose-500/20'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        scanAlert.type === 'success'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-rose-600 text-white shadow-xs'
                      }`}
                    >
                      {scanAlert.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-extrabold tracking-tight">
                          {scanAlert.title}
                        </h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            scanAlert.type === 'success'
                              ? 'bg-emerald-200 text-emerald-900'
                              : 'bg-rose-200 text-rose-900'
                          }`}
                        >
                          {scanAlert.type === 'success' ? 'Verified' : 'Please Scan Again'}
                        </span>
                      </div>

                      <p className="text-xs mt-1 font-medium text-slate-700">
                        {scanAlert.message}
                      </p>

                      {scanAlert.productName && (
                        <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                          Product: {scanAlert.productName}
                        </p>
                      )}

                      {scanAlert.type === 'error' && (
                        <p className="text-[11px] text-rose-700 font-medium mt-1">
                          Barcode <span className="font-mono font-bold">"{scanAlert.code}"</span> was not recognized or has an issue. Please realign the label and scan again.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={handleNavigateReportDamage}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Report Damaged</span>
                    </button>
                    {scanAlert.type === 'error' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setScanAlert(null);
                          setManualCode('');
                          manualInputRef.current?.focus();
                        }}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Scan Again</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setScanAlert(null);
                          setManualCode('');
                          manualInputRef.current?.focus();
                        }}
                        className="px-3.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!scanAlert && cameraNotice && (
              <div className="mt-4 p-3 rounded-xl border border-indigo-200 bg-indigo-50/70 text-indigo-800 text-xs font-medium flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>{cameraNotice}</span>
              </div>
            )}

            {/* Manual Barcode Input Fallback */}
            <form onSubmit={handleManualSubmit} className="mt-4 flex items-center gap-2">
              <div className="relative flex-1">
                <Keyboard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={manualInputRef}
                  type="text"
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value)}
                  placeholder="Enter Barcode / QR / Container / Seal ID..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Scan Code
              </button>
            </form>
          </div>

          {/* Damage & Exception Reporting CTA */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-900">
                  Item Damaged or Packaging Compromised?
                </h4>
                <p className="text-[11px] text-amber-700">
                  Do not accept broken units into active stock. Quarantine immediately.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleNavigateReportDamage}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition shrink-0 cursor-pointer"
            >
              Report Damaged
            </button>
          </div>
        </div>

        {/* Right Column: Manifest Live Reconciliation Table & Progress (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Progress Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700">Manifest Match Progress</span>
              <span className="text-sm font-extrabold text-indigo-600">{matchRate}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  matchRate === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${matchRate}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-medium">
              <span>{totalVerified} of {totalExpected} units scanned</span>
              <span>{totalExpected - totalVerified} remaining</span>
            </div>

            {/* Manifest Itemized Comparison */}
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Expected Manifest Items
              </div>
              {selectedShipment?.items.map(item => {
                const isJustMatched = item.productId === lastMatchedProductId || item.sku === lastMatchedProductId;
                const isComplete = (item.verifiedQuantity || 0) >= item.expectedQuantity;

                return (
                  <div
                    key={item.productId}
                    className={`p-3 rounded-xl border transition-all duration-300 flex items-center justify-between text-xs ${
                      isJustMatched
                        ? 'ring-2 ring-emerald-500 bg-emerald-50/90 border-emerald-300 shadow-sm scale-[1.01]'
                        : isComplete
                        ? 'bg-emerald-50/40 border-emerald-100'
                        : 'border-slate-100 bg-slate-50/60'
                    }`}
                  >
                    <div className="max-w-[65%] space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 truncate">
                          {item.productName}
                        </span>
                        {isJustMatched && (
                          <span className="inline-flex items-center gap-1 text-[9.5px] font-extrabold text-emerald-800 bg-emerald-200/90 px-1.5 py-0.5 rounded-md animate-pulse">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            Matched!
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        SKU: {item.sku}
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <div className="font-extrabold text-slate-900 font-mono text-xs">
                        {item.verifiedQuantity || 0} / {item.expectedQuantity}
                      </div>
                      <span
                        className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md inline-block ${
                          isComplete
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isComplete ? 'Complete ✓' : 'Pending'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Finish Verification Action */}
            <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
              <button
                onClick={() => setCompleteModalOpen(true)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Confirm & Finish Verification</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>



      {/* Success Modal: Successfully Matched the Products */}
      <Modal
        isOpen={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        title="Successfully Matched the Products!"
        subtitle={`Shipment ${selectedShipment?.trackingNumber || ''} reconciliation complete.`}
        maxWidth="md"
      >
        <div className="space-y-4">
          {totalVerified < totalExpected ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-rose-950">
                  Discrepancy Alert: Product Loss / Shortage Detected!
                </h4>
                <p className="text-xs text-rose-800 mt-1">
                  Physical count ({totalVerified} units) is short of the manifest expectation ({totalExpected} units). {totalExpected - totalVerified} units missing / lost! A shortage discrepancy has been logged and the Owner has been notified.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-emerald-950">
                  Successfully Matched the Products!
                </h4>
                <p className="text-xs text-emerald-800 mt-1">
                  All physical line items match the manifest specifications with {matchRate}% accuracy. Verified units have been recorded and reconciled against immutable chain custody.
                </p>
              </div>
            </div>
          )}

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Verified Quantity:</span>
              <span className="font-bold font-mono text-slate-900">{totalVerified} / {totalExpected} units</span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Shipment Tracking:</span>
              <span className="font-mono text-indigo-700">{selectedShipment?.trackingNumber}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Destination:</span>
              <span className="text-slate-800">{selectedShipment?.customerName}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCompleteModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Continue Scanning
            </button>
            <button
              type="button"
              onClick={handleProceedToNextScreen}
              className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 ${
                totalVerified < totalExpected
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <span>{totalVerified < totalExpected ? 'Proceed & Flag Product Loss' : 'Proceed to Next Screen'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
