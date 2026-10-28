import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  Camera,
  CameraOff,
  Keyboard,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Zap,
  ShieldAlert,
  ArrowRight
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
  const { user, role } = useAuth();
  const {
    shipments,
    containers,
    products,
    processScan,
    scanRecords,
    reportDiscrepancy
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
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'warning' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Damage reporting modal state
  const [damageModalOpen, setDamageModalOpen] = useState(false);
  const [damagedItemSku, setDamagedItemSku] = useState('');
  const [damageNotes, setDamageNotes] = useState('');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader-container';

  const selectedShipment = shipments.find(s => s.id === selectedShipmentId);
  const selectedContainer = containers.find(c => c.id === selectedContainerId);

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

  const startScanner = async () => {
    setCameraError(null);
    setFeedback({ type: 'info', message: 'Requesting camera device access...' });

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
      setFeedback({ type: 'success', message: 'Live camera active. Position barcode inside reticle.' });
    } catch (err: any) {
      console.warn('Camera start error:', err);
      setIsScanning(false);
      setCameraError(
        err?.message || 'Unable to access camera. Please allow camera permissions or use manual entry below.'
      );
      setFeedback({
        type: 'warning',
        message: 'Camera unavailable on this hardware. Use manual barcode input or one-click simulation buttons below.'
      });
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        setIsScanning(false);
        setFeedback({ type: 'info', message: 'Camera stopped.' });
      } catch (err) {
        console.error('Stop scanner error:', err);
      }
    }
  };

  const handleScannedCode = (code: string) => {
    if (!code || !code.trim()) return;

    const res = processScan(
      code.trim(),
      selectedShipmentId,
      selectedContainerId,
      user?.name || 'Operator',
      role || 'VENDOR'
    );

    if (res.valid) {
      setFeedback({ type: 'success', message: res.message });
      // Play a soft beep if audio is available
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      } catch {}
    } else {
      if (res.result === 'Duplicate Attempt') {
        setFeedback({ type: 'warning', message: res.message });
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleScannedCode(manualCode);
    setManualCode('');
  };

  const handleReportDamage = () => {
    if (!damagedItemSku) return;
    const targetProduct = products.find(p => p.sku === damagedItemSku || p.barcode === damagedItemSku);

    reportDiscrepancy(
      {
        shipmentId: selectedShipment?.id || '',
        shipmentTracking: selectedShipment?.trackingNumber || 'UNASSIGNED',
        containerId: selectedContainer?.id,
        containerNumber: selectedContainer?.containerNumber,
        productId: targetProduct?.id,
        productName: targetProduct?.name || damagedItemSku,
        sku: targetProduct?.sku || damagedItemSku,
        type: 'Damaged Goods',
        severity: 'High',
        status: 'Detected',
        expectedQuantity: 1,
        observedQuantity: 0,
        detectionStage: role === 'OWNER' ? 'Owner Packing' : 'Vendor Receiving',
        detectedBy: `${user?.name} (${role} Scanner)`,
        evidence: [
          {
            id: `evd-${Date.now()}`,
            type: 'Inspection Report',
            description: damageNotes || 'Physical damage identified during verification scanning.',
            timestamp: new Date().toISOString(),
            uploadedBy: user?.name || 'Operator'
          }
        ],
        resolutionNotes: 'Flagged by scanner operator. Product quarantined.',
        resolutionOutcome: 'Pending'
      },
      user?.name || 'Operator',
      role || 'VENDOR'
    );

    setDamageModalOpen(false);
    setDamageNotes('');
    setFeedback({
      type: 'warning',
      message: `🚨 Damage reported for ${damagedItemSku}. Product flagged in Discrepancy Engine.`
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
            <div className="relative w-full aspect-video sm:h-72 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
              <div id={scannerContainerId} className="w-full h-full" />

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

            {/* Realtime Feedback Banner */}
            {feedback && (
              <div
                className={`mt-4 p-3 rounded-xl border text-xs font-medium flex items-start gap-2.5 transition-all ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : feedback.type === 'warning'
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : feedback.type === 'error'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-800'
                }`}
              >
                {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                {feedback.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
                {feedback.type === 'error' && <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
                {feedback.type === 'info' && <Zap className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* Manual Barcode Input Fallback */}
            <form onSubmit={handleManualSubmit} className="mt-4 flex items-center gap-2">
              <div className="relative flex-1">
                <Keyboard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
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

            {/* Quick Testing Shortcuts (Pre-configured sample scenarios for instant evaluation) */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                <span>Quick Scenario Simulators</span>
                <span className="text-[10px] text-slate-400 font-normal">Click to trigger event</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleScannedCode('BC-901-CRYO-8821')}
                  className="p-2 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-semibold text-left transition"
                  title="Scan Expected Item"
                >
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Expected Item</span>
                  </div>
                  <div className="text-[9.5px] text-emerald-600 font-mono mt-0.5 truncate">
                    BC-901-CRYO-8821
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleScannedCode('BC-901-CRYO-8821')}
                  className="p-2 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100 text-amber-800 text-[11px] font-semibold text-left transition"
                  title="Simulate Duplicate Scan Attempt"
                >
                  <div className="flex items-center gap-1">
                    <Copy className="w-3 h-3 text-amber-600" />
                    <span>Duplicate Scan</span>
                  </div>
                  <div className="text-[9.5px] text-amber-600 font-mono mt-0.5 truncate">
                    Rapid 2nd scan
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleScannedCode('BC-UNKNOWN-9999')}
                  className="p-2 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-100 text-red-800 text-[11px] font-semibold text-left transition"
                  title="Simulate Unknown Barcode"
                >
                  <div className="flex items-center gap-1">
                    <XCircle className="w-3 h-3 text-red-600" />
                    <span>Unknown Code</span>
                  </div>
                  <div className="text-[9.5px] text-red-600 font-mono mt-0.5 truncate">
                    BC-UNKNOWN-9999
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleScannedCode('CNT-ALPHA-881')}
                  className="p-2 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-800 text-[11px] font-semibold text-left transition"
                  title="Scan Container QR"
                >
                  <div className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-indigo-600" />
                    <span>Container QR</span>
                  </div>
                  <div className="text-[9.5px] text-indigo-600 font-mono mt-0.5 truncate">
                    CNT-ALPHA-881
                  </div>
                </button>
              </div>
            </div>
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
              onClick={() => setDamageModalOpen(true)}
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
              {selectedShipment?.items.map(item => (
                <div
                  key={item.productId}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs"
                >
                  <div className="max-w-[65%]">
                    <div className="font-bold text-slate-800 truncate">
                      {item.productName}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      SKU: {item.sku}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-slate-900 font-mono">
                      {item.verifiedQuantity || 0} / {item.expectedQuantity}
                    </div>
                    <span
                      className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-md ${
                        item.verifiedQuantity >= item.expectedQuantity
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {item.verifiedQuantity >= item.expectedQuantity ? 'Complete' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Finish Verification Action */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  if (onFinishVerification) {
                    onFinishVerification(selectedShipmentId);
                  } else {
                    alert('Shipment verification completed and logged to audit trail.');
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Confirm & Finish Verification</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Recent Scan History Feed */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Live Scan Activity Stream
            </h4>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {scanRecords.slice(0, 6).map(r => (
                <div
                  key={r.id}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-[11px]"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {r.result === 'Expected Match' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                    {r.result === 'Duplicate Attempt' && (
                      <Copy className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    )}
                    {(r.result === 'Unexpected Product' || r.result === 'Wrong Container') && (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    )}
                    <div className="overflow-hidden">
                      <div className="font-mono font-bold text-slate-800 truncate">
                        {r.scannedCode}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {r.result} • {new Date(r.scannedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {r.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Damaged Item Reporting Modal */}
      {damageModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <span>Flag Damaged / Compromised Item</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Create an exception case in the Discrepancy Engine and quarantine the unit immediately.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product / SKU
                </label>
                <select
                  value={damagedItemSku}
                  onChange={e => setDamagedItemSku(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200"
                >
                  <option value="">Select product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.sku}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Inspection Notes & Defect Description
                </label>
                <textarea
                  rows={3}
                  value={damageNotes}
                  onChange={e => setDamageNotes(e.target.value)}
                  placeholder="E.g., Broken seal, liquid leak, fractured outer shell..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setDamageModalOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReportDamage}
                disabled={!damagedItemSku}
                className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                Submit Discrepancy & Quarantine
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
