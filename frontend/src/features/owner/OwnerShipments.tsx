import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Send,
  Hash,
  Box,
  Archive,
  ArrowRight,
  Shield,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { Shipment, ShipmentItem, ShipmentStatus } from '../../types';

export const OwnerShipments: React.FC = () => {
  const { shipments, products, containers, createShipment, dispatchShipment } = useData();
  const { user, role } = useAuth();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedShipmentId, setExpandedShipmentId] = useState<string | null>(shipments[0]?.id || null);

  // New Shipment Form State
  const [origin, setOrigin] = useState('Apex Central Logistics Hub Alpha');
  const [destination, setDestination] = useState('BioMed Advanced Research Campus Bay 2');
  const [vendorName, setVendorName] = useState('Trans-Express Regional Logistics');
  const [customerName, setCustomerName] = useState('Anusha S (BioMed Research)');
  const [selectedItems, setSelectedItems] = useState<{ productId: string; quantity: number; containerId: string }[]>([
    { productId: products[0]?.id || '', quantity: 10, containerId: containers[0]?.id || '' }
  ]);
  const [notes, setNotes] = useState('Cold-chain priority handling required.');

  const handleAddItemLine = () => {
    setSelectedItems(prev => [
      ...prev,
      { productId: products[0]?.id || '', quantity: 5, containerId: containers[0]?.id || '' }
    ]);
  };

  const handleRemoveItemLine = (idx: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCreateShipment = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedItems.length === 0) {
      alert('Please add at least one product line item to the manifest.');
      return;
    }

    const items: ShipmentItem[] = selectedItems.map(item => {
      const prod = products.find(p => p.id === item.productId)!;
      const cont = containers.find(c => c.id === item.containerId);
      return {
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        barcode: prod.barcode,
        containerId: cont?.id || '',
        containerNumber: cont?.containerNumber || 'Unassigned',
        expectedQuantity: Number(item.quantity),
        verifiedQuantity: 0,
        scannedQuantity: 0,
        status: 'Pending'
      };
    });

    const uniqueContainerIds = Array.from(new Set(items.map(i => i.containerId).filter(Boolean)));

    const created = createShipment(
      {
        origin,
        destination,
        vendorName,
        customerName,
        items,
        containerIds: uniqueContainerIds,
        notes
      },
      user?.name || 'Dhruva (Owner)',
      role || 'OWNER'
    );

    setModalOpen(false);
    setExpandedShipmentId(created.id);
  };

  const handleDispatch = (shipment: Shipment) => {
    if (confirm(`Confirm dispatch for shipment ${shipment.trackingNumber}? Manifest will be locked and custody handed to carrier.`)) {
      dispatchShipment(shipment.id, user?.name || 'Dhruva (Owner)', role || 'OWNER');
    }
  };

  const filtered = shipments.filter(s => {
    const matchSearch =
      s.trackingNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.destination.toLowerCase().includes(search.toLowerCase()) ||
      s.customerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statuses: ('ALL' | ShipmentStatus)[] = [
    'ALL',
    'Draft',
    'Ready for Dispatch',
    'Dispatched',
    'In Transit',
    'Received',
    'Discrepancy Detected',
    'Delivered'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Shipment Manifests & Custody Tracking
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Generate tamper-sealed cryptographic manifests, dispatch to vendors, and trace verified handovers.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm shadow-indigo-600/30 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Shipment</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by tracking number, customer, or destination..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider shrink-0">
            Status:
          </span>
          {statuses.map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Shipment Manifest List */}
      <div className="space-y-4">
        {filtered.map(shipment => {
          const isExpanded = expandedShipmentId === shipment.id;
          const totalExpected = shipment.items.reduce((acc, i) => acc + i.expectedQuantity, 0);
          const totalVerified = shipment.items.reduce((acc, i) => acc + (i.verifiedQuantity || 0), 0);
          const matchPercent = totalExpected > 0 ? Math.min(100, Math.round((totalVerified / totalExpected) * 100)) : 0;

          return (
            <div
              key={shipment.id}
              className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs transition"
            >
              {/* Manifest Card Header */}
              <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-base font-extrabold text-slate-900 tracking-tight">
                      {shipment.trackingNumber}
                    </span>
                    <StatusBadge status={shipment.status} />
                    <span className="text-xs text-slate-400 font-mono">
                      Hash: {shipment.manifestHash.substring(0, 16)}...
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>
                      <strong className="text-slate-700">Origin:</strong> {shipment.origin}
                    </span>
                    <span>→</span>
                    <span>
                      <strong className="text-slate-700">Destination:</strong> {shipment.destination}
                    </span>
                    <span>•</span>
                    <span>
                      <strong className="text-slate-700">Recipient:</strong> {shipment.customerName}
                    </span>
                  </div>
                </div>

                {/* Right side KPIs & Actions */}
                <div className="flex items-center gap-3">
                  <div className="text-right pr-3 border-r border-slate-100">
                    <div className="text-xs text-slate-400">Reconciliation</div>
                    <div className="text-sm font-bold text-slate-800">
                      {totalVerified} / {totalExpected} units ({matchPercent}%)
                    </div>
                  </div>

                  {/* Dispatch Action Button if Draft or Ready */}
                  {(shipment.status === 'Draft' || shipment.status === 'Ready for Dispatch') && (
                    <button
                      onClick={() => handleDispatch(shipment)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch</span>
                    </button>
                  )}

                  <button
                    onClick={() => setExpandedShipmentId(isExpanded ? null : shipment.id)}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                    title={isExpanded ? 'Collapse' : 'Expand Details'}
                  >
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Expanded Manifest Table & Audit Trail */}
              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-5 space-y-5">
                  {/* Manifest Cryptographic Seal */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-indigo-600" />
                      <span className="font-bold text-slate-700">SHA-256 Manifest Lock:</span>
                      <span className="font-mono text-slate-500 break-all">{shipment.manifestHash}</span>
                    </div>
                    <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Immutable Seal Verified
                    </span>
                  </div>

                  {/* Manifest Line Items Table */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-600">
                      Manifest Product Lines ({shipment.items.length})
                    </div>
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <tr>
                          <th className="py-2.5 px-4">SKU / Code</th>
                          <th className="py-2.5 px-4">Product Name</th>
                          <th className="py-2.5 px-4">Container</th>
                          <th className="py-2.5 px-4">Expected</th>
                          <th className="py-2.5 px-4">Verified</th>
                          <th className="py-2.5 px-4">Line Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {shipment.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-4 font-mono font-bold text-indigo-600">
                              {item.sku}
                            </td>
                            <td className="py-2.5 px-4 font-medium text-slate-900">
                              {item.productName}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-slate-600">
                              {item.containerNumber}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-slate-800">
                              {item.expectedQuantity}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-emerald-600">
                              {item.verifiedQuantity || 0}
                            </td>
                            <td className="py-2.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  item.status === 'Verified'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : item.status === 'Mismatch'
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Chain of Custody Events */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Chain of Custody Events
                    </h4>
                    <div className="space-y-2">
                      {shipment.events.map(ev => (
                        <div key={ev.id} className="flex items-start gap-3 text-xs">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                          <div className="space-y-0.5 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{ev.status}</span>
                              <span className="text-slate-400">•</span>
                              <span className="text-slate-500">{ev.location}</span>
                              <span className="text-slate-400">•</span>
                              <span className="font-semibold text-indigo-600">{ev.performedBy}</span>
                            </div>
                            <p className="text-slate-600">{ev.notes}</p>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            {new Date(ev.timestamp).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal: Create Shipment Manifest */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Draft Shipment Manifest"
        subtitle="Pack containers, assign products, and lock with SHA-256 tamper-proof seal."
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateShipment} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Origin Depot
              </label>
              <input
                type="text"
                required
                value={origin}
                onChange={e => setOrigin(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Destination Facility
              </label>
              <input
                type="text"
                required
                value={destination}
                onChange={e => setDestination(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Logistics Vendor Partner
              </label>
              <input
                type="text"
                required
                value={vendorName}
                onChange={e => setVendorName(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Customer Consignee
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          {/* Product Line Items */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Manifest Product Line Items
              </label>
              <button
                type="button"
                onClick={handleAddItemLine}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item Line</span>
              </button>
            </div>

            {selectedItems.map((item, index) => (
              <div
                key={index}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
              >
                <div className="sm:col-span-5">
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                    Product SKU
                  </label>
                  <select
                    value={item.productId}
                    onChange={e => {
                      const val = e.target.value;
                      setSelectedItems(prev =>
                        prev.map((it, i) => (i === index ? { ...it, productId: val } : it))
                      );
                    }}
                    className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                    Assigned Container
                  </label>
                  <select
                    value={item.containerId}
                    onChange={e => {
                      const val = e.target.value;
                      setSelectedItems(prev =>
                        prev.map((it, i) => (i === index ? { ...it, containerId: val } : it))
                      );
                    }}
                    className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                  >
                    {containers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.containerNumber} ({c.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setSelectedItems(prev =>
                        prev.map((it, i) => (i === index ? { ...it, quantity: val } : it))
                      );
                    }}
                    className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-1 text-right pt-4 sm:pt-0">
                  {selectedItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItemLine(index)}
                      className="text-xs text-red-500 hover:text-red-700 font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Dispatch Instructions
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm shadow-indigo-600/30 transition cursor-pointer"
            >
              Generate Sealed Manifest
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
