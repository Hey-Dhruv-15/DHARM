import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import {
  Plus,
  MoreVertical,
  QrCode,
  Edit,
  Trash2,
  Box,
  Eye,
  Check,
  CheckCircle2,
  Copy,
  Sparkles,
  Camera,
  CameraOff,
  X,
  ShieldCheck
} from 'lucide-react';
import { BrowserQRCodeSvgWriter } from '@zxing/browser';
import { Html5Qrcode } from 'html5-qrcode';
import type { Product } from '../../types';

// Standalone Vector QR Code Renderer using native client-side SVG
const QrCodeVisual: React.FC<{ value: string; size?: number; className?: string }> = ({
  value,
  size = 140,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';
    if (!value || !value.trim()) return;

    try {
      const writer = new BrowserQRCodeSvgWriter();
      const svg = writer.write(value.trim(), size, size);
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
      svg.style.display = 'block';
      svg.style.borderRadius = '8px';
      containerRef.current.appendChild(svg);
    } catch (err) {
      console.warn('QR code generation failed:', err);
    }
  }, [value, size]);

  if (!value || !value.trim()) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 ${className}`}
        style={{ width: size, height: size }}
      >
        <QrCode className="w-8 h-8 opacity-30 mb-1" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          No QR Code
        </span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`inline-flex items-center justify-center bg-white p-2 rounded-xl shadow-2xs border border-slate-200 shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
};

export const OwnerProducts: React.FC = () => {
  const navigate = useNavigate();
  const { products, updateProduct, deleteProduct } = useData();
  const { user, role } = useAuth();

  // Modal & Selection States
  const [detailsModalProduct, setDetailsModalProduct] = useState<Product | null>(null);
  const [assignQrModalProduct, setAssignQrModalProduct] = useState<Product | null>(null);
  const [qrInput, setQrInput] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isCameraScanning, setIsCameraScanning] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Number & Currency formatting helper for Indian Rupee (₹)
  const formatPrice = (val: number | undefined | null): string => {
    if (val === undefined || val === null || isNaN(val)) return '0';
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: Number.isInteger(val) ? 0 : 2
    }).format(val);
  };

  const formatGst = (rate: number | undefined | null): string => {
    if (rate === undefined || rate === null) return '18%';
    return rate === 0.1 ? '0.10%' : `${rate}%`;
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove "${name}" from the catalog?`)) {
      deleteProduct(id, user?.name || 'Dhruva (Owner)', role || 'OWNER');
      setActionMenuOpenId(null);
    }
  };

  const openAssignQrModal = (product: Product) => {
    setAssignQrModalProduct(product);
    setQrInput(product.qrCode || product.barcode || '');
    setIsCameraScanning(false);
    setCameraError(null);
  };

  const handleAutoGenerateQr = () => {
    if (!assignQrModalProduct) return;
    const cleanSku =
      assignQrModalProduct.sku.replace(/[^A-Za-z0-9]/g, '').toUpperCase() || 'PROD';
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const generated = `QR-${cleanSku}-${randomSuffix}`;
    setQrInput(generated);
  };

  const handleSaveAssignQr = () => {
    if (!assignQrModalProduct || !qrInput.trim()) return;
    const cleanVal = qrInput.trim();

    updateProduct(
      assignQrModalProduct.id,
      {
        barcode: cleanVal,
        qrCode: cleanVal
      },
      user?.name || 'Dhruva (Owner)',
      role || 'OWNER'
    );

    // If details modal is open for this product, update it
    if (detailsModalProduct && detailsModalProduct.id === assignQrModalProduct.id) {
      setDetailsModalProduct({
        ...detailsModalProduct,
        barcode: cleanVal,
        qrCode: cleanVal
      });
    }

    setSuccessToast(`QR code "${cleanVal}" successfully assigned to ${assignQrModalProduct.name}!`);
    setTimeout(() => setSuccessToast(null), 4000);

    stopCamera();
    setAssignQrModalProduct(null);
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping camera:', err);
      }
    }
    setIsCameraScanning(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    setIsCameraScanning(true);

    setTimeout(async () => {
      try {
        if (!html5QrCodeRef.current) {
          html5QrCodeRef.current = new Html5Qrcode('assign-qr-camera-stream');
        }

        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) {
          setCameraError('No camera found on this device. Please use manual entry or auto-generate.');
          setIsCameraScanning(false);
          return;
        }

        const cameraId = devices.length > 1 ? devices[1].id : devices[0].id;

        await html5QrCodeRef.current.start(
          cameraId,
          {
            fps: 10,
            qrbox: { width: 220, height: 220 }
          },
          decodedText => {
            setQrInput(decodedText);
            stopCamera();
          },
          () => {}
        );
      } catch (err: any) {
        setCameraError(err?.message || 'Unable to access camera.');
        setIsCameraScanning(false);
      }
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="space-y-4 pb-12">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-emerald-600 text-white rounded-xl shadow-xl animate-in fade-in slide-in-from-top-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
          <span className="text-xs font-semibold">{successToast}</span>
          <button
            onClick={() => setSuccessToast(null)}
            className="ml-2 text-white/80 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Action: Only Add Product */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => navigate('/owner/products/new')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-5">PRODUCT</th>
                <th className="py-3.5 px-4">CATEGORY</th>
                <th className="py-3.5 px-4">BILLING UNIT</th>
                <th className="py-3.5 px-4">LIST PRICE</th>
                <th className="py-3.5 px-4">GST</th>
                <th className="py-3.5 px-4">TOTAL (INCL. GST)</th>
                <th className="py-3.5 px-4 text-center">STATUS</th>
                <th className="py-3.5 px-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {products.map(p => {
                const isBlueLink = p.name.trim().toLowerCase() === 'apple';
                const computedGross =
                  p.grossPrice !== undefined
                    ? p.grossPrice
                    : p.unitPrice + (p.unitPrice * (p.gstRate ?? 18)) / 100;

                return (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* PRODUCT COLUMN */}
                    <td className="py-4 px-5">
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => setDetailsModalProduct(p)}
                          className={`text-left font-semibold text-xs sm:text-sm tracking-tight ${
                            isBlueLink
                              ? 'text-blue-600 hover:text-blue-800 hover:underline cursor-pointer'
                              : 'text-slate-900 hover:text-blue-600 cursor-pointer'
                          }`}
                          title="Click to view details"
                        >
                          {p.name}
                        </button>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="font-mono text-[10.5px] text-slate-400">
                            SKU: {p.sku}
                          </span>
                          {p.barcode ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                              <QrCode className="w-2.5 h-2.5" />
                              <span className="font-mono truncate max-w-[120px]">{p.barcode}</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                openAssignQrModal(p);
                              }}
                              className="text-[10px] font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 cursor-pointer"
                            >
                              + Assign QR
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* CATEGORY COLUMN */}
                    <td className="py-4 px-4 text-slate-600 text-xs sm:text-sm">
                      {p.category || 'General / Uncategorized'}
                    </td>

                    {/* BILLING UNIT COLUMN */}
                    <td className="py-4 px-4 text-slate-600 text-xs sm:text-sm">
                      {p.billingUnit || 'One-time'}
                    </td>

                    {/* LIST PRICE COLUMN */}
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm font-mono">
                        ₹{formatPrice(p.unitPrice)}
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-slate-400 font-normal mt-0.5">
                        Excl. taxes
                      </div>
                    </td>

                    {/* GST COLUMN */}
                    <td className="py-4 px-4 text-slate-600 text-xs sm:text-sm font-mono">
                      {formatGst(p.gstRate)}
                    </td>

                    {/* TOTAL (INCL. GST) COLUMN */}
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm font-mono">
                        ₹{formatPrice(computedGross)}
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-slate-400 font-normal mt-0.5">
                        Gross Price
                      </div>
                    </td>

                    {/* STATUS COLUMN */}
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                        {p.status || 'Active'}
                      </span>
                    </td>

                    {/* ACTIONS COLUMN */}
                    <td className="py-4 px-4 text-center">
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          onClick={() =>
                            setActionMenuOpenId(actionMenuOpenId === p.id ? null : p.id)
                          }
                          className="w-7 h-7 rounded-full border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer mx-auto shadow-2xs"
                          title="Actions"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {/* Dropdown Menu */}
                        {actionMenuOpenId === p.id && (
                          <div
                            className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200/90 py-1.5 z-20"
                            onMouseLeave={() => setActionMenuOpenId(null)}
                          >
                            <button
                              onClick={() => {
                                setActionMenuOpenId(null);
                                setDetailsModalProduct(p);
                              }}
                              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition"
                            >
                              <Eye className="w-3.5 h-3.5 text-emerald-600" />
                              <span>View Details</span>
                            </button>

                            <button
                              onClick={() => {
                                setActionMenuOpenId(null);
                                openAssignQrModal(p);
                              }}
                              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition"
                            >
                              <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Assign QR Code</span>
                            </button>

                            <button
                              onClick={() => {
                                setActionMenuOpenId(null);
                                navigate(`/owner/products/new?id=${p.id}`);
                              }}
                              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition"
                            >
                              <Edit className="w-3.5 h-3.5 text-blue-600" />
                              <span>Edit Product</span>
                            </button>

                            <div className="my-1 border-t border-slate-100" />

                            <button
                              onClick={() => handleDelete(p.id, p.name)}
                              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete / Archive</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {products.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Box className="w-12 h-12 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="font-semibold text-slate-600 text-sm">No products found</p>
            <p className="text-xs text-slate-400 mt-1">
              Register a product using Add Product button above
            </p>
          </div>
        )}
      </div>

      {/* Product Details Modal */}
      {detailsModalProduct && (
        <Modal
          isOpen={!!detailsModalProduct}
          onClose={() => setDetailsModalProduct(null)}
          title={detailsModalProduct.name}
          subtitle="Catalog Specifications, Commercials & Tamper-Evident QR Tracking"
          maxWidth="lg"
        >
          <div className="space-y-5">
            {/* Top Identity Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/40 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {detailsModalProduct.status || 'Active'}
                  </span>
                  <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-white text-slate-600 border border-slate-200">
                    {detailsModalProduct.category || 'General / Uncategorized'}
                  </span>
                  <span className="px-2.5 py-0.5 text-xs font-mono font-medium rounded-full bg-slate-100 text-slate-700">
                    SKU: {detailsModalProduct.sku}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 pt-1">
                  {detailsModalProduct.name}
                </h3>
              </div>

              <button
                onClick={() => {
                  const target = detailsModalProduct;
                  setDetailsModalProduct(null);
                  openAssignQrModal(target);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer shrink-0"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Assign / Update QR</span>
              </button>
            </div>

            {/* QR Identity & Verification Box */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs flex flex-col sm:flex-row items-center gap-5">
              <QrCodeVisual
                value={detailsModalProduct.barcode || detailsModalProduct.qrCode || ''}
                size={110}
              />
              <div className="flex-1 space-y-2 text-center sm:text-left w-full">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Assigned Product QR Code
                  </span>
                  {detailsModalProduct.barcode && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <ShieldCheck className="w-3 h-3" />
                      Verified QR Bound
                    </span>
                  )}
                </div>

                <div className="font-mono text-sm font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 break-all select-all">
                  {detailsModalProduct.barcode || detailsModalProduct.qrCode || (
                    <span className="text-slate-400 font-normal italic">
                      No QR code currently assigned
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1 flex-wrap justify-center sm:justify-start">
                  {detailsModalProduct.barcode && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          detailsModalProduct.barcode || detailsModalProduct.qrCode || ''
                        );
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy QR String</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => {
                      const target = detailsModalProduct;
                      setDetailsModalProduct(null);
                      openAssignQrModal(target);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {detailsModalProduct.barcode ? 'Reassign QR Code' : 'Assign QR Code Now'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Financial & Pricing Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                  List Price (Excl. Tax)
                </span>
                <span className="text-sm sm:text-base font-bold font-mono text-slate-900 mt-0.5 block">
                  ₹{formatPrice(detailsModalProduct.unitPrice)}
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                  GST Rate
                </span>
                <span className="text-sm sm:text-base font-bold font-mono text-slate-900 mt-0.5 block">
                  {formatGst(detailsModalProduct.gstRate)}
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                  Gross Price (Incl. GST)
                </span>
                <span className="text-sm sm:text-base font-bold font-mono text-indigo-600 mt-0.5 block">
                  ₹
                  {formatPrice(
                    detailsModalProduct.grossPrice !== undefined
                      ? detailsModalProduct.grossPrice
                      : detailsModalProduct.unitPrice +
                          (detailsModalProduct.unitPrice * (detailsModalProduct.gstRate ?? 18)) /
                            100
                  )}
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                  Billing Unit
                </span>
                <span className="text-sm font-semibold text-slate-800 mt-0.5 block capitalize">
                  {detailsModalProduct.billingUnit || 'One-time'}
                </span>
              </div>
            </div>

            {/* Inventory & Tracking Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-[11px] font-medium text-slate-400 block">Stock Level</span>
                <span className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5 block">
                  {detailsModalProduct.stockQuantity ?? 100} {detailsModalProduct.unit || 'units'}
                </span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-[11px] font-medium text-slate-400 block">Reorder Level</span>
                <span className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5 block">
                  {detailsModalProduct.reorderLevel ?? 20} {detailsModalProduct.unit || 'units'}
                </span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-[11px] font-medium text-slate-400 block">
                  Serialized Tracking
                </span>
                <span className="text-xs sm:text-sm font-bold text-emerald-600 mt-0.5 block">
                  {detailsModalProduct.isSerialized ? 'Serialized Unit' : 'Standard Lot'}
                </span>
              </div>
            </div>

            {/* Description or Deliverables */}
            {(detailsModalProduct.deliverables || detailsModalProduct.description) && (
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Deliverables & Scope
                </span>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {detailsModalProduct.deliverables || detailsModalProduct.description}
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <button
                onClick={() => {
                  const id = detailsModalProduct.id;
                  setDetailsModalProduct(null);
                  navigate(`/owner/products/new?id=${id}`);
                }}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5 text-blue-600" />
                <span>Edit Full Product</span>
              </button>

              <button
                onClick={() => setDetailsModalProduct(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Assign QR to Product Modal */}
      {assignQrModalProduct && (
        <Modal
          isOpen={!!assignQrModalProduct}
          onClose={() => {
            stopCamera();
            setAssignQrModalProduct(null);
          }}
          title={`Assign QR Code: ${assignQrModalProduct.name}`}
          subtitle={`SKU: ${assignQrModalProduct.sku} • Link a physical barcode or generate an industrial QR identifier.`}
          maxWidth="md"
        >
          <div className="space-y-4">
            {/* Target Product Badge */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Target Product
                </span>
                <p className="text-xs sm:text-sm font-bold text-slate-800">
                  {assignQrModalProduct.name}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Current Barcode / QR
                </span>
                <span className="font-mono text-xs font-semibold text-slate-600">
                  {assignQrModalProduct.barcode || 'None'}
                </span>
              </div>
            </div>

            {/* Input & Generator Toolbar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  QR Code / Barcode Identifier
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleAutoGenerateQr}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-Generate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (isCameraScanning) {
                        stopCamera();
                      } else {
                        startCamera();
                      }
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg transition cursor-pointer ${
                      isCameraScanning
                        ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isCameraScanning ? (
                      <>
                        <CameraOff className="w-3 h-3" />
                        <span>Stop Camera</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-3 h-3" />
                        <span>Scan Camera</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={qrInput}
                  onChange={e => setQrInput(e.target.value)}
                  placeholder="e.g. QR-APPLE-882941 or scan packaging sticker..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                  autoFocus
                />
                {qrInput && (
                  <button
                    type="button"
                    onClick={() => setQrInput('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Live Camera Scanner Box */}
            {isCameraScanning && (
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-white space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Scanning Camera for QR / Barcode...</span>
                  </div>
                  <button
                    onClick={stopCamera}
                    className="text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Close
                  </button>
                </div>
                <div
                  id="assign-qr-camera-stream"
                  className="w-full h-48 rounded-xl overflow-hidden bg-black flex items-center justify-center"
                />
                {cameraError && (
                  <p className="text-xs text-rose-400 font-medium">{cameraError}</p>
                )}
              </div>
            )}

            {/* Dynamic QR Preview & Visual Card */}
            <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50 flex flex-col items-center justify-center text-center space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Live QR Code Vector Preview
              </span>

              <QrCodeVisual value={qrInput} size={150} />

              <div className="space-y-0.5">
                <p className="font-mono text-xs font-bold text-slate-800 break-all max-w-[280px]">
                  {qrInput || 'Enter or generate a QR code above'}
                </p>
                <p className="text-[11px] text-slate-500">
                  DHARM ERP Asset • {assignQrModalProduct.name}
                </p>
              </div>

              {qrInput.trim() && (
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mt-1">
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>Valid QR Format Ready for Assignment</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setAssignQrModalProduct(null);
                }}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!qrInput.trim()}
                onClick={handleSaveAssignQr}
                className={`flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer ${
                  qrInput.trim()
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Save & Assign QR</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
