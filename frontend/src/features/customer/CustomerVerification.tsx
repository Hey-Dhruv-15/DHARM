import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  ScanLine,
  Camera,
  CameraOff,
  Keyboard,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  HelpCircle,
  Layers,
  Building,
  Truck,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import type { ProductVerificationResult } from '../../types';

export const CustomerVerification: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillCode = searchParams.get('code') || '';

  const { user } = useAuth();
  const { verifyCustomerProduct, scanRecords, shipments, products } = useData();

  const [code, setCode] = useState(prefillCode);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<ProductVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'customer-qr-scanner-container';

  // Automatically verify if prefilled from URL
  useEffect(() => {
    if (prefillCode) {
      handleVerify(prefillCode);
    }
  }, [prefillCode]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current
          .stop()
          .then(() => html5QrCodeRef.current?.clear())
          .catch(err => console.error('Error stopping scanner:', err));
      }
    };
  }, []);

  const startScanner = async () => {
    setCameraError(null);
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);
      }

      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        throw new Error('No physical camera device detected on this workstation.');
      }

      const cameraId = devices.length > 1 ? devices[1].id : devices[0].id;

      await html5QrCodeRef.current.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        decodedText => {
          handleVerify(decodedText);
          stopScanner();
        },
        () => {}
      );

      setIsScanning(true);
    } catch (err: any) {
      setIsScanning(false);
      setCameraError(
        err?.message || 'Camera device unavailable. Please enter verification code or SKU manually below.'
      );
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error('Stop scanner error:', err);
      }
    }
  };

  const handleVerify = (codeToTest: string) => {
    const clean = codeToTest.trim();
    if (!clean) return;

    setIsVerifying(true);
    setCode(clean);

    // Call customer verification service
    setTimeout(() => {
      const res = verifyCustomerProduct(clean, user?.id || 'usr-cust-03');
      setVerificationResult(res);
      setIsVerifying(false);
    }, 250);
  };

  const customerScans = scanRecords.filter(s => s.role === 'CUSTOMER' || s.scannedBy.includes('Anusha'));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              End-to-End Cryptographic Traceability
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Product Verification Portal
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Scan packaging QR codes, barcodes, or serialized tamper seals to verify authenticity, origin, and cold-chain custody.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/customer/issues')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Report a Discrepancy</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scanner & Input Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Scanner Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ScanLine className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  Barcode / QR Code Scanner
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Live Verification
              </span>
            </div>

            {/* Camera Viewport */}
            <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-slate-800">
              <div id={scannerContainerId} className="w-full h-full" />

              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-slate-950/90 text-slate-400 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">Optical Camera Scanner Ready</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Aim camera at medicine vial, cargo carton, or tamper seal barcode
                    </p>
                  </div>
                  <button
                    onClick={startScanner}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-2"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Start Live Camera</span>
                  </button>
                </div>
              )}

              {isScanning && (
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <span className="text-[10px] text-white font-mono bg-slate-900/80 px-2.5 py-1 rounded-full border border-slate-700">
                    Scanning active...
                  </span>
                  <button
                    onClick={stopScanner}
                    className="px-3 py-1 bg-red-600/90 hover:bg-red-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Stop Camera
                  </button>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="p-3 bg-amber-50 text-amber-900 rounded-xl border border-amber-200 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-700 inline-block mr-1.5" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Manual Code Input Form */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Or Enter Code / SKU Manually
              </label>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleVerify(code);
                }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <Keyboard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="e.g. BC-901-CRYO-8821 or MED-CRYO-901"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 uppercase"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isVerifying || !code.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer shrink-0"
                >
                  {isVerifying ? 'Verifying...' : 'Verify'}
                </button>
              </form>
            </div>

            {/* Quick Demo Code Pills for testing convenience */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Quick Test Samples:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => handleVerify('BC-901-CRYO-8821')}
                  className="text-[10px] font-mono px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold cursor-pointer"
                >
                  BC-901-CRYO-8821 (Cryo-Shield)
                </button>
                <button
                  onClick={() => handleVerify('BC-440-SENS-7719')}
                  className="text-[10px] font-mono px-2 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold cursor-pointer"
                >
                  BC-440-SENS-7719 (Sensor)
                </button>
                <button
                  onClick={() => handleVerify('BC-UNKNOWN-999')}
                  className="text-[10px] font-mono px-2 py-1 rounded-md bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-bold cursor-pointer"
                >
                  BC-UNKNOWN-999 (Invalid Code)
                </button>
              </div>
            </div>
          </div>

          {/* Traceability Guarantee Info Box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>DHARM Cryptographic Authenticity Rule</span>
            </div>
            <p className="leading-relaxed text-[11px] text-slate-500">
              A barcode or QR scan alone does not prove authenticity. Verification is confirmed only when server-side manifest hashes, authorized customer consignee records, and custody handover timestamps are validated against the immutable ledger.
            </p>
          </div>
        </div>

        {/* Right Column: Verification Results & Custody Chain (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {verificationResult ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
              {/* Status Header Banner */}
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  verificationResult.status === 'VERIFIED'
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : verificationResult.status === 'MISMATCH_DETECTED'
                    ? 'bg-rose-50 border-rose-200 text-rose-950'
                    : verificationResult.status === 'DUPLICATE_SCAN'
                    ? 'bg-amber-50 border-amber-200 text-amber-950'
                    : 'bg-red-50 border-red-200 text-red-950'
                }`}
              >
                <div className="flex items-start gap-3">
                  {verificationResult.status === 'VERIFIED' ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  ) : verificationResult.status === 'DUPLICATE_SCAN' ? (
                    <Clock className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider block">
                      Verification Result
                    </span>
                    <h3 className="text-base font-extrabold tracking-tight">
                      {verificationResult.status === 'VERIFIED' && 'Verified Authentic Product'}
                      {verificationResult.status === 'MISMATCH_DETECTED' && 'Discrepancy / Mismatch Detected'}
                      {verificationResult.status === 'VERIFICATION_PENDING' && 'Verification In Progress (Transit)'}
                      {verificationResult.status === 'DUPLICATE_SCAN' && 'Duplicate Scan Warning'}
                      {verificationResult.status === 'INVALID_CODE' && 'Record Not Found / Invalid Code'}
                    </h3>
                    <p className="text-xs mt-1 leading-relaxed opacity-90">
                      {verificationResult.message}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border ${
                      verificationResult.status === 'VERIFIED'
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : verificationResult.status === 'MISMATCH_DETECTED'
                        ? 'bg-rose-600 text-white border-rose-700'
                        : 'bg-amber-600 text-white border-amber-700'
                    }`}
                  >
                    {verificationResult.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Product Specifications & Traceability Identifiers */}
              {verificationResult.product && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Product Master & Lot Traceability
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Product Name</span>
                      <span className="font-extrabold text-slate-900 mt-0.5 block">{verificationResult.product.name}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">SKU Code</span>
                      <span className="font-mono font-bold text-indigo-700 mt-0.5 block">{verificationResult.product.sku}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Batch / Lot Number</span>
                      <span className="font-mono font-bold text-slate-800 mt-0.5 block">{verificationResult.batchNumber}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Serial Hash</span>
                      <span className="font-mono text-slate-700 mt-0.5 block">{verificationResult.serialNumber}</span>
                    </div>
                  </div>

                  {/* Shipment & Consignment Reference */}
                  {verificationResult.shipment && (
                    <div className="p-4 bg-indigo-50/40 rounded-xl border border-indigo-200 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-indigo-600" />
                          <span className="font-bold text-indigo-900">
                            Assigned Consignment: {verificationResult.shipment.trackingNumber}
                          </span>
                        </div>
                        <StatusBadge status={verificationResult.shipment.status} />
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] text-slate-600">
                        <div>
                          <span className="text-slate-400 block">Origin:</span>
                          <span className="font-semibold text-slate-800">{verificationResult.shipment.origin}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Carrier:</span>
                          <span className="font-semibold text-slate-800">{verificationResult.shipment.vendorName}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Consignment Scope:</span>
                          <span className="font-semibold text-slate-800">
                            {verificationResult.verifiedQuantity || 0} / {verificationResult.expectedQuantity || 0} Units Verified
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Chronological Custody Chain */}
                  {verificationResult.custodyEvents && verificationResult.custodyEvents.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Chronological Chain of Custody
                      </h4>

                      <div className="space-y-2.5">
                        {verificationResult.custodyEvents.map((ev, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-white rounded-xl border border-slate-200 flex items-start gap-3 text-xs"
                          >
                            <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-slate-900">{ev.stage}</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(ev.timestamp).toLocaleString('en-IN')}
                                </span>
                              </div>
                              <p className="text-slate-600 mt-0.5">
                                Responsible Organization: <strong>{ev.organization}</strong>
                              </p>
                              <p className="text-slate-500 text-[11px]">
                                Location: {ev.location} • Sign-off: {ev.verifiedBy}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <button
                      onClick={() =>
                        navigate(
                          `/customer/issues?code=${encodeURIComponent(
                            verificationResult.scannedCode
                          )}&sku=${encodeURIComponent(
                            verificationResult.product?.sku || ''
                          )}&shipmentId=${encodeURIComponent(
                            verificationResult.shipment?.id || ''
                          )}`
                        )
                      }
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Report Discrepancy for this Item</span>
                    </button>

                    <button
                      onClick={() => {
                        setVerificationResult(null);
                        setCode('');
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Verify Another Item
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Idle Placeholder */
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-8 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                <ScanLine className="w-8 h-8" />
              </div>
              <h3 className="text-base font-extrabold text-slate-800">
                Awaiting Barcode or QR Code Input
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                Scan or enter the serialized code on the incoming item packaging. DHARM will interrogate the cryptographic ledger to verify batch integrity and custody handover.
              </p>
            </div>
          )}

          {/* Historical Scans for this Customer */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                My Recent Verification Scans
              </h3>
              <span className="text-[10px] text-slate-400">
                Preserved historical verification records
              </span>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              {customerScans.slice(0, 5).map(scan => (
                <div key={scan.id} className="p-3 bg-white flex items-center justify-between text-xs hover:bg-slate-50/50">
                  <div className="space-y-0.5">
                    <span className="font-mono font-bold text-slate-800">{scan.scannedCode}</span>
                    <p className="text-[11px] text-slate-500">{scan.notes || 'Verified by customer'}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        scan.result === 'Expected Match'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : scan.result === 'Duplicate Attempt'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {scan.result}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {new Date(scan.scannedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}

              {customerScans.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-400">
                  No previous scans recorded for this customer session.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

