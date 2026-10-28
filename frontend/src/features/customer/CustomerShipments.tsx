import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import {
  Truck,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Calendar,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Clock,
  MapPin,
  ScanLine,
  ArrowRight,
  HelpCircle,
  Copy,
  Info
} from 'lucide-react';
import type { Shipment, ShipmentStatus } from '../../types';

export const CustomerShipments: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { shipments, confirmCustomerDelivery } = useData();

  // State: Search & Expanded Card
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);

  // Delivery confirmation modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [handoverNotes, setHandoverNotes] = useState('All packages received intact. Cold-chain seal inspected and verified.');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Strictly filter for authenticated customer
  const customerShipments = useMemo(() => {
    return shipments.filter(s => s.customerId === (user?.id || 'usr-cust-03'));
  }, [shipments, user?.id]);

  // Set default expanded card to the first shipment
  React.useEffect(() => {
    if (customerShipments.length > 0 && !expandedId) {
      setExpandedId(customerShipments[0].id);
    }
  }, [customerShipments, expandedId]);

  // Filtered shipments
  const filteredShipments = useMemo(() => {
    let list = [...customerShipments];

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        s =>
          s.trackingNumber.toLowerCase().includes(q) ||
          s.destination.toLowerCase().includes(q) ||
          s.origin.toLowerCase().includes(q) ||
          s.vendorName.toLowerCase().includes(q) ||
          s.items.some(i => i.productName.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== 'ALL') {
      list = list.filter(s => s.status === statusFilter);
    }

    return list;
  }, [customerShipments, search, statusFilter]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTracking(text);
    setTimeout(() => setCopiedTracking(null), 2500);
  };

  const handleOpenConfirmModal = (s: Shipment) => {
    setSelectedShipment(s);
    setHandoverNotes('All units inspected. Tamper seals verified intact upon physical delivery.');
    setConfirmModalOpen(true);
  };

  const handleConfirmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment) return;

    confirmCustomerDelivery(
      selectedShipment.id,
      user?.name || 'Customer Consignee',
      handoverNotes
    );

    setConfirmModalOpen(false);
  };

  // Helper to determine active timeline stage
  const getTimelineStageIndex = (status: ShipmentStatus) => {
    switch (status) {
      case 'Draft':
        return 0;
      case 'Ready for Dispatch':
        return 1;
      case 'Dispatched':
        return 2;
      case 'In Transit':
      case 'Received':
        return 3;
      case 'Discrepancy Detected':
      case 'Under Investigation':
        return 3;
      case 'Partially Delivered':
        return 4;
      case 'Delivered':
        return 5;
      case 'Cancelled':
        return -1;
      default:
        return 2;
    }
  };

  const timelineStages = [
    { name: 'Order Confirmed', desc: 'Requisition Approved' },
    { name: 'Processing & Packing', desc: 'Depot Allocation' },
    { name: 'Dispatched', desc: 'Handed to Transporter' },
    { name: 'In Transit', desc: 'Regional Hub Sorting' },
    { name: 'Out for Delivery', desc: 'Courier En Route' },
    { name: 'Delivered', desc: 'Customer Handover Sign-off' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Consignment Tracking & Custody Verification
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Track Consignments & Shipments
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time delivery progress, chronological custody handover log, and digital delivery confirmation.
          </p>
        </div>

        <button
          onClick={() => navigate('/customer/verify')}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition cursor-pointer self-start sm:self-auto"
        >
          <ScanLine className="w-4 h-4" />
          <span>Verify Product QR</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by tracking number (TRK-...), SKU, carrier, or destination..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700"
          >
            <option value="ALL">All Shipment Statuses</option>
            <option value="In Transit">In Transit</option>
            <option value="Dispatched">Dispatched</option>
            <option value="Discrepancy Detected">Discrepancy Detected</option>
            <option value="Delivered">Delivered</option>
            <option value="Ready for Dispatch">Ready for Dispatch</option>
          </select>
        </div>
      </div>

      {/* Shipments List */}
      <div className="space-y-4">
        {filteredShipments.map(s => {
          const isExpanded = expandedId === s.id;
          const stageIdx = getTimelineStageIndex(s.status);
          const totalExpectedUnits = s.items.reduce((sum, item) => sum + item.expectedQuantity, 0);
          const isDelivered = s.status === 'Delivered';
          const isDiscrepancy = s.status === 'Discrepancy Detected';

          return (
            <div
              key={s.id}
              className={`bg-white rounded-2xl border shadow-xs transition overflow-hidden ${
                isExpanded ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              {/* Header Card */}
              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-base font-extrabold text-slate-900">
                      {s.trackingNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(s.trackingNumber)}
                      title="Copy Tracking Number"
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {copiedTracking === s.trackingNumber && (
                      <span className="text-[10px] text-emerald-600 font-bold">Copied!</span>
                    )}
                    <StatusBadge status={s.status} />
                  </div>

                  <p className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                    <span>Carrier: <strong>{s.vendorName}</strong></span>
                    <span>•</span>
                    <span>Origin: <strong>{s.origin}</strong></span>
                    <span>•</span>
                    <span>Destination: <strong>{s.destination}</strong></span>
                  </p>

                  <div className="flex items-center gap-3 text-xs text-slate-600 pt-0.5">
                    <span>
                      Dispatched:{' '}
                      <strong>
                        {s.dispatchDate ? new Date(s.dispatchDate).toLocaleDateString('en-IN') : 'Scheduled'}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Expected Delivery:{' '}
                      <strong className={isDelivered ? 'text-slate-700' : 'text-indigo-700'}>
                        {s.estimatedDelivery ? new Date(s.estimatedDelivery).toLocaleDateString('en-IN') : 'Pending'}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  {!isDelivered && s.status !== 'Draft' && (
                    <button
                      onClick={() => handleOpenConfirmModal(s)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                    >
                      Confirm Receipt
                    </button>
                  )}

                  <button
                    onClick={() => navigate(`/customer/verify?shipmentId=${encodeURIComponent(s.id)}`)}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Verify QR
                  </button>

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
                    className="p-2 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer transition"
                    title={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Exception or Delay Alert Banner */}
              {isDiscrepancy && (
                <div className="mx-5 mb-4 p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-900 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Consignment Exception Logged:</span>
                    <p className="text-red-700 mt-0.5">
                      Verification discrepancy detected at sorting hub. Quality auditors have flagged item count deviation. You may file a discrepancy complaint or request a replacement.
                    </p>
                  </div>
                </div>
              )}

              {/* Chronological Lifecycle Timeline */}
              <div className="border-t border-slate-100 bg-slate-50/60 p-5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
                  Chronological Consignment Handover Progress
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {timelineStages.map((stage, idx) => {
                    const isPassed = idx <= stageIdx && stageIdx !== -1;
                    const isCurrent = idx === stageIdx;

                    return (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border text-center transition ${
                          isCurrent
                            ? isDiscrepancy
                              ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold'
                              : 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                            : isPassed
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 font-semibold'
                            : 'bg-white border-slate-200/80 text-slate-400 font-normal'
                        }`}
                      >
                        <div className="text-[9px] uppercase font-bold tracking-wider opacity-75">
                          Stage {idx + 1}
                        </div>
                        <div className="text-xs font-bold mt-0.5 truncate">{stage.name}</div>
                        <div className="text-[10px] opacity-80 mt-0.5 truncate">{stage.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Expanded Consignment Scope & Custody Log */}
              {isExpanded && (
                <div className="border-t border-slate-100 p-5 space-y-5 bg-white">
                  {/* Items Manifest */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Consignment Deliverables ({s.items.length} product lines, {totalExpectedUnits} total units)
                      </h4>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Containers: {s.containerIds.join(', ')}
                      </span>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3">Product Name</th>
                            <th className="py-2.5 px-3">SKU Code</th>
                            <th className="py-2.5 px-3">Container</th>
                            <th className="py-2.5 px-3 text-center">Expected Qty</th>
                            <th className="py-2.5 px-3 text-center">Carrier Verified</th>
                            <th className="py-2.5 px-3 text-right">Verification Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {s.items.map((it, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 font-semibold text-slate-900">{it.productName}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">{it.sku}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-600">{it.containerNumber}</td>
                              <td className="py-2.5 px-3 text-center font-bold text-slate-800">{it.expectedQuantity}</td>
                              <td className="py-2.5 px-3 text-center font-bold text-emerald-600">{it.verifiedQuantity || 0}</td>
                              <td className="py-2.5 px-3 text-right">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    it.status === 'Verified'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : it.status === 'Mismatch'
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  {it.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Custody Event Logs */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Custody Handover Trail
                    </h4>
                    <div className="space-y-2">
                      {s.events.map(ev => (
                        <div
                          key={ev.id}
                          className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start justify-between text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900">{ev.status}</span>
                              <span className="text-slate-400">•</span>
                              <span className="text-slate-600 font-medium">{ev.location}</span>
                            </div>
                            <p className="text-slate-500 text-[11px]">{ev.notes}</p>
                          </div>

                          <div className="text-right text-[11px] text-slate-400">
                            <div>{new Date(ev.timestamp).toLocaleDateString('en-IN')}</div>
                            <div className="font-mono">{new Date(ev.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Action Jump */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                    <button
                      onClick={() => navigate(`/customer/issues?shipmentId=${encodeURIComponent(s.id)}`)}
                      className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Report Damage or Missing Items in this Consignment</span>
                    </button>

                    <button
                      onClick={() => navigate(`/customer/verify?shipmentId=${encodeURIComponent(s.id)}`)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      <ScanLine className="w-3.5 h-3.5" />
                      <span>Verify Barcodes for this Shipment</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredShipments.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-8 space-y-3">
            <Truck className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-extrabold text-slate-800">No consignments found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No shipments match your search filter. Your dispatched consignments will appear here automatically.
            </p>
          </div>
        )}
      </div>

      {/* Modal: Confirm Delivery Receipt */}
      {selectedShipment && (
        <Modal
          isOpen={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          title={`Confirm Delivery Sign-Off: ${selectedShipment.trackingNumber}`}
          subtitle="Acknowledge receipt and verify physical package tamper seals."
          maxWidth="md"
        >
          <form onSubmit={handleConfirmSubmit} className="space-y-4">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Authorized Custody Transfer Sign-off</span>
              </div>
              <p className="text-[11px] text-emerald-800">
                By confirming receipt, you certify that transporter {selectedShipment.vendorName} handed over {selectedShipment.items.length} product lines at {selectedShipment.destination}.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Handover Notes / Inspection Sign-off <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={handoverNotes}
                onChange={e => setHandoverNotes(e.target.value)}
                placeholder="Confirm seals intact, temperature loggers within range, and box condition..."
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition cursor-pointer"
              >
                Confirm Physical Handover
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
