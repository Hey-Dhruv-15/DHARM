import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  HelpCircle,
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  FileText,
  Clock,
  ShieldCheck,
  Package,
  XCircle,
  FileSpreadsheet
} from 'lucide-react';
import type { DiscrepancyType } from '../../types';
import { validateEvidenceFile } from '../../services/customerApi';

export const CustomerIssues: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillShipmentId = searchParams.get('shipmentId') || '';
  const prefillSku = searchParams.get('sku') || '';

  const { user } = useAuth();
  const {
    orders,
    shipments,
    discrepancies,
    submitCustomerDiscrepancy
  } = useData();

  // Filter orders and shipments for current customer
  const customerOrders = useMemo(() => {
    return orders.filter(o => o.customerId === (user?.id || 'usr-cust-03'));
  }, [orders, user?.id]);

  const customerShipments = useMemo(() => {
    return shipments.filter(s => s.customerId === (user?.id || 'usr-cust-03'));
  }, [shipments, user?.id]);

  // Form State
  const [selectedOrderId, setSelectedOrderId] = useState<string>(() => {
    if (prefillShipmentId) {
      const match = customerOrders.find(o => o.shipmentId === prefillShipmentId);
      if (match) return match.id;
    }
    return customerOrders[0]?.id || '';
  });

  const selectedOrder = useMemo(() => {
    return customerOrders.find(o => o.id === selectedOrderId) || customerOrders[0];
  }, [customerOrders, selectedOrderId]);

  // Auto-derived related shipment
  const relatedShipment = useMemo(() => {
    if (!selectedOrder) return null;
    return customerShipments.find(s => s.id === selectedOrder.shipmentId || s.trackingNumber === selectedOrder.trackingNumber);
  }, [selectedOrder, customerShipments]);

  const [selectedProductId, setSelectedProductId] = useState<string>(() => {
    if (prefillSku && selectedOrder) {
      const match = selectedOrder.items.find(i => i.sku.toLowerCase() === prefillSku.toLowerCase());
      if (match) return match.productId;
    }
    return selectedOrder?.items[0]?.productId || '';
  });

  const selectedItem = useMemo(() => {
    return selectedOrder?.items.find(i => i.productId === selectedProductId) || selectedOrder?.items[0];
  }, [selectedOrder, selectedProductId]);

  const [category, setCategory] = useState<DiscrepancyType>('Damaged Goods');
  const [expectedQty, setExpectedQty] = useState<number>(selectedItem?.quantity || 1);
  const [receivedQty, setReceivedQty] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [preferredResolution, setPreferredResolution] = useState<'Replacement' | 'Return' | 'Refund' | 'Assistance'>('Replacement');

  // File Upload State
  const [evidenceFiles, setEvidenceFiles] = useState<Array<{ name: string; size: number; type: string; dataUrl?: string }>>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedCaseNumber, setSubmittedCaseNumber] = useState<string | null>(null);

  // Sync expected quantity when selected item changes
  const handleItemChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const item = selectedOrder?.items.find(i => i.productId === prodId);
    if (item) {
      setExpectedQty(item.quantity);
      setReceivedQty(category === 'Missing Item' ? 0 : item.quantity);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: Array<{ name: string; size: number; type: string; dataUrl?: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const err = validateEvidenceFile({ name: f.name, size: f.size, type: f.type });
      if (err) {
        setFileError(err);
        return;
      }

      // Convert to small dataURL for preview
      const reader = new FileReader();
      reader.onload = () => {
        newFiles.push({
          name: f.name,
          size: f.size,
          type: f.type,
          dataUrl: reader.result as string
        });
        if (newFiles.length === files.length) {
          setEvidenceFiles(prev => [...prev, ...newFiles]);
        }
      };
      reader.readAsDataURL(f);
    }
  };

  const removeFile = (idx: number) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedOrder) {
      setFormError('Please select a valid customer purchase order.');
      return;
    }
    if (!relatedShipment) {
      setFormError('This order has not yet been allocated to an active shipment consignment.');
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setFormError('Please provide a descriptive explanation of the problem (at least 10 characters).');
      return;
    }

    setIsSubmitting(true);

    try {
      const created = submitCustomerDiscrepancy(
        {
          orderId: selectedOrder.id,
          shipmentId: relatedShipment.id,
          productId: selectedItem?.productId || 'prod-001',
          category,
          expectedQuantity: Number(expectedQty),
          observedQuantity: Number(receivedQty),
          description: description.trim(),
          preferredResolution,
          evidenceFiles
        },
        user?.id || 'usr-cust-03',
        user?.name || 'Customer'
      );

      setSubmittedCaseNumber(created.discrepancyNumber);
      setIsSubmitting(false);
    } catch (err: any) {
      setFormError(err.message || 'Error filing discrepancy complaint.');
      setIsSubmitting(false);
    }
  };

  // Customer Discrepancies list
  const customerDiscrepancies = useMemo(() => {
    return discrepancies.filter(
      d => d.customerId === (user?.id || 'usr-cust-03') || d.detectedBy.includes('Anusha')
    );
  }, [discrepancies, user?.id]);

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Reconciliation & Exception Engine
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Report a Problem or Discrepancy
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            File claims for missing items, excess quantities, packaging damage, or mismatched cargo.
          </p>
        </div>

        <button
          onClick={() => navigate('/customer/returns')}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition cursor-pointer self-start sm:self-auto"
        >
          <RotateCcw className="w-4 h-4" />
          <span>View Return Claims</span>
        </button>
      </div>

      {/* Success Confirmation Card */}
      {submittedCaseNumber ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs text-center space-y-4 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Complaint Reference Number
            </span>
            <div className="text-xl font-mono font-extrabold text-indigo-700 mt-0.5">
              {submittedCaseNumber}
            </div>
          </div>

          <h3 className="text-lg font-extrabold text-slate-900">
            Discrepancy Registered Under Quality Review
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Your complaint has been immutably recorded in DHARM. The Product Owner and Trans-Express Regional Hub have been alerted to inspect packaging telemetry and coordinate resolution.
          </p>

          <div className="pt-3 flex justify-center gap-3">
            <button
              onClick={() => {
                setSubmittedCaseNumber(null);
                setDescription('');
                setEvidenceFiles([]);
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Report Another Issue
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('my-discrepancies-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              Track Active Complaints
            </button>
          </div>
        </div>
      ) : (
        /* Discrepancy Form */
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          {formError && (
            <div className="p-3 bg-red-50 text-red-800 rounded-xl border border-red-200 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Section 1: Order & Shipment Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Your Order <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedOrderId}
                onChange={e => {
                  setSelectedOrderId(e.target.value);
                  const order = customerOrders.find(o => o.id === e.target.value);
                  if (order && order.items.length > 0) {
                    setSelectedProductId(order.items[0].productId);
                    setExpectedQty(order.items[0].quantity);
                  }
                }}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-semibold"
              >
                {customerOrders.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.orderNumber} ({new Date(o.orderDate).toLocaleDateString()}) — {o.status}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Restricted to authorized consignments for this account
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Related Consignment / Shipment
              </label>
              <input
                type="text"
                disabled
                value={
                  relatedShipment
                    ? `${relatedShipment.trackingNumber} (${relatedShipment.status} via ${relatedShipment.vendorName})`
                    : 'Awaiting dispatch manifest allocation'
                }
                className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-slate-100 text-slate-600 border border-slate-200 rounded-lg cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Auto-populated from selected order manifest
              </span>
            </div>
          </div>

          {/* Section 2: Affected Product and Quantities */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Affected Product Line <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedProductId}
                onChange={e => handleItemChange(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium"
              >
                {selectedOrder?.items.map((item, idx) => (
                  <option key={idx} value={item.productId}>
                    {item.productName} ({item.sku})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Expected Consignment Qty
              </label>
              <input
                type="number"
                disabled
                value={expectedQty}
                className="w-full px-3 py-2 text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 rounded-lg cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Observed / Received Qty <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                required
                value={receivedQty}
                onChange={e => setReceivedQty(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Section 3: Problem Category & Preferred Resolution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Problem Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={e => {
                  const cat = e.target.value as DiscrepancyType;
                  setCategory(cat);
                  if (cat === 'Missing Item') setReceivedQty(0);
                  if (cat === 'Unexpected Product') setReceivedQty(expectedQty + 1);
                }}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
              >
                                <option value="Damaged Goods">Damaged Goods (Vial broken, seal breach, leak)</option>
                <option value="Missing Item">Missing Item (Shortage in packing container)</option>
                <option value="Unexpected Product">Unexpected Product / Extra Items</option>
                <option value="Wrong Container">Wrong Container (Mismatched cargo)</option>
                <option value="Conflicting Record">Conflicting Record / Other</option>
                <option value="Wrong Container">Wrong Product (Incorrect SKU received)</option>
                <option value="Conflicting Record">Other Logistics / Data Discrepancy</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Preferred Resolution <span className="text-red-500">*</span>
              </label>
              <select
                value={preferredResolution}
                onChange={e => setPreferredResolution(e.target.value as any)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg font-semibold text-indigo-700"
              >
                <option value="Replacement">Immediate Replacement Shipment</option>
                <option value="Return">Authorized Return & Quarantine Pickup</option>
                <option value="Refund">Credit Note / Payment Refund</option>
                <option value="Assistance">Technical & Quality Auditor Assistance</option>
              </select>
            </div>
          </div>

          {/* Section 4: Evidence Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Photographic / Inspection Document Evidence
            </label>
            <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-4 text-center bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer relative">
              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <Upload className="w-8 h-8 mx-auto text-indigo-600 mb-1.5" />
              <p className="text-xs font-bold text-slate-800">
                Click to browse or drop container photos / inspection PDF here
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Supported formats: PNG, JPG, WEBP, PDF (Maximum file size: 5 MB)
              </p>
            </div>

            {fileError && (
              <div className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{fileError}</span>
              </div>
            )}

            {/* Evidence Chips */}
            {evidenceFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {evidenceFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-lg text-xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="truncate max-w-[160px] font-medium">{file.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ({Math.round(file.size / 1024)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-slate-400 hover:text-red-600 ml-1 cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 5: Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Detailed Description of the Discrepancy <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe package condition, temperature indicator state, container seal numbers, or missing item count..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Discrepancies are cryptographically registered to prevent unauthorized dispute tampering.
            </span>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-2"
            >
              <span>{isSubmitting ? 'Registering...' : 'Submit Discrepancy Report'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Section 6: Active Customer Discrepancies Tracker */}
      <div id="my-discrepancies-section" className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              My Discrepancy Claims & Complaint Tracker ({customerDiscrepancies.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Follow real-time investigation stages, auditor remarks, and resolution outcomes.
            </p>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Workflow: Submitted ➔ Under Review ➔ Resolved</span>
        </div>

        <div className="space-y-3">
          {customerDiscrepancies.map(c => (
            <div
              key={c.id}
              className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition bg-slate-50/50 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-extrabold text-slate-900">{c.discrepancyNumber}</span>
                  <StatusBadge status={c.status} />
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    {c.type}
                  </span>
                </div>

                <span className="text-[11px] text-slate-400">
                  Filed on {new Date(c.detectedAt).toLocaleDateString('en-IN')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Product / Scope</span>
                  <span className="font-bold text-slate-800">{c.productName}</span>
                  <span className="text-[10px] font-mono text-indigo-600 block">{c.sku}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Quantity Reported</span>
                  <span className="font-bold text-slate-800">
                    {c.observedQuantity} received / {c.expectedQuantity} expected
                  </span>
                  <span className="text-[10px] text-slate-500 block">Consignment: {c.shipmentTracking}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Resolution Status</span>
                  <span className="font-bold text-emerald-700">
                    {c.resolutionOutcome || 'Under Technical Review'}
                  </span>
                  {c.preferredResolution && (
                    <span className="text-[10px] text-slate-500 block">Preferred: {c.preferredResolution}</span>
                  )}
                </div>
              </div>

              {c.resolutionNotes && (
                <div className="text-xs text-slate-600 p-2.5 bg-slate-100 rounded-lg">
                  <strong className="text-slate-800">Auditor Notes:</strong> {c.resolutionNotes}
                </div>
              )}
            </div>
          ))}

          {customerDiscrepancies.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-xs">
              No discrepancy complaints filed. All your delivered items match verified consignment manifests.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
