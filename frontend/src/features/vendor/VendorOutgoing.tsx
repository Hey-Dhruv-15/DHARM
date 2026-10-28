import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import {
  Send,
  Plus,
  Truck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
  Box
} from 'lucide-react';
import type { Shipment } from '../../types';

export const VendorOutgoing: React.FC = () => {
  const { shipments, products, containers, createShipment } = useData();
  const { user, role } = useAuth();

  const [modalOpen, setModalOpen] = useState(false);
  const [destination, setDestination] = useState('BioMed Research Campus Bay 2 (Tech Park)');
  const [customerName, setCustomerName] = useState('Anusha S (BioMed Diagnostics)');
  const [carrierVehicle, setCarrierVehicle] = useState('Midwest Van Express #402');
  const [notes, setNotes] = useState('Final mile expedited courier delivery.');

  // Outgoing shipments are shipments dispatched or delivered from vendor to customer
  const outgoingList = shipments.filter(
    s => s.status === 'In Transit' || s.status === 'Delivered' || s.status === 'Partially Delivered'
  );

  const handleCreateOutgoing = async (e: React.FormEvent) => {
    e.preventDefault();

    // Call backend API to persist to PostgreSQL
    try {
      await fetch('http://localhost:8000/api/shipments/outbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_consignee: customerName,
          facility_address: destination,
          courier_vehicle: carrierVehicle,
          delivery_notes: notes,
          origin: 'Midwest Sorting Hub 4 (Cross-Dock)',
          vendor_name: 'Trans-Express Regional Logistics',
          status: 'In Transit'
        })
      });
    } catch (err) {
      console.warn('Backend API call note:', err);
    }

    createShipment(
      {
        origin: 'Midwest Sorting Hub 4 (Cross-Dock)',
        destination,
        vendorName: 'Trans-Express Regional Logistics',
        customerName,
        items: [
          {
            productId: products[0]?.id || 'prod-001',
            productName: products[0]?.name || 'Cryo-Shield Specimen Transporter',
            sku: products[0]?.sku || 'MED-CRYO-901',
            barcode: products[0]?.barcode || 'BC-901-CRYO-8821',
            containerId: containers[0]?.id || 'cnt-01',
            containerNumber: containers[0]?.containerNumber || 'CNT-ALPHA-881',
            expectedQuantity: 10,
            verifiedQuantity: 10,
            scannedQuantity: 10,
            status: 'Verified'
          }
        ],
        containerIds: ['cnt-01'],
        notes: `${notes} Vehicle: ${carrierVehicle}`
      },
      user?.name || 'Sinu Gunshetty',
      role || 'VENDOR'
    );

    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Outgoing Deliveries to Customers
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Dispatch verified stock from Midwest Hub 4 to hospital and clinical consignees.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Prepare Outgoing Delivery</span>
        </button>
      </div>

      {/* Outgoing List */}
      <div className="space-y-4">
        {outgoingList.map(s => (
          <div
            key={s.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-base font-extrabold text-slate-900">
                  {s.trackingNumber}
                </span>
                <StatusBadge status={s.status} />
              </div>
              <p className="text-xs text-slate-600">
                Consignee: <strong className="text-slate-800">{s.customerName}</strong> • Destination: {s.destination}
              </p>
              <div className="text-[11px] text-slate-400">
                {s.items.length} Product lines • Manifest: {s.manifestHash.substring(0, 16)}...
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-slate-700">
                {s.status === 'Delivered' ? 'Delivery Confirmed by Customer' : 'Out for Delivery'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Create Outgoing */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Dispatch Outbound Customer Delivery"
        subtitle="Bundle verified hub inventory into customer delivery manifest."
        maxWidth="md"
      >
        <form onSubmit={handleCreateOutgoing} className="space-y-4">
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

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Facility Address
            </label>
            <input
              type="text"
              required
              value={destination}
              onChange={e => setDestination(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Courier Vehicle / Driver Unit
            </label>
            <input
              type="text"
              required
              value={carrierVehicle}
              onChange={e => setCarrierVehicle(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Delivery Notes
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
              className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition cursor-pointer"
            >
              Generate Outbound Delivery
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
