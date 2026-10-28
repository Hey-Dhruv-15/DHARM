import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  HelpCircle,
  Camera,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  Upload,
  RefreshCw,
  CreditCard,
  PackageCheck
} from 'lucide-react';
import type { ReturnCase, CustomerResolutionChoice } from '../../types';

export const CustomerIssues: React.FC = () => {
  const navigate = useNavigate();
  const { shipments, products, createReturnRequest } = useData();
  const { user } = useAuth();

  const [selectedShipmentId, setSelectedShipmentId] = useState(shipments[0]?.id || '');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState<ReturnCase['reason']>('Damaged in Transit');
  const [customerChoice, setCustomerChoice] = useState<CustomerResolutionChoice>('Replace Product');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submittedNumber, setSubmittedNumber] = useState('');

  const currentProduct = products.find(p => p.id === selectedProductId) || products[0];
  const estimatedRefund = currentProduct ? currentProduct.unitPrice * quantity : 1420 * quantity;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ship = shipments.find(s => s.id === selectedShipmentId);
    const prod = products.find(p => p.id === selectedProductId);

    const created = createReturnRequest(
      {
        originalShipmentId: selectedShipmentId,
        trackingNumber: ship ? ship.trackingNumber : 'TRK-UNKNOWN',
        customerId: user?.id || 'usr-cust-03',
        customerName: user?.name || 'Anusha S (BioMed)',
        productId: prod?.id || 'prod-001',
        productName: prod?.name || 'Cryo-Shield Specimen Transporter',
        sku: prod?.sku || 'SKU-BIO-091',
        quantity: Number(quantity),
        reason,
        evidencePhotos: ['/dharm_logistics_hero.jpg'],
        inspectionNotes: notes,
        customerChoice: customerChoice,
        refundAmount: customerChoice === 'Refund Amount' ? ((prod ? prod.unitPrice : 1250) * Number(quantity)) : undefined,
        refundStatus: customerChoice === 'Refund Amount' ? 'Pending' : undefined
      },
      user?.name || 'Anusha S (Customer)'
    );

    setSubmittedNumber(created.returnNumber);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">
          Customer Damaged Report Filed ({submittedNumber})
        </h2>
        <p className="text-xs sm:text-sm text-slate-600">
          Your damaged product return case has been registered. The vendor inspection desk will verify the reported issue once the physical product arrives at the hub.
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Your Chosen Settlement:</span>
            <span className={`font-bold px-2 py-0.5 rounded-full ${
              customerChoice === 'Replace Product'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}>
              {customerChoice}
            </span>
          </div>
          {customerChoice === 'Refund Amount' && (
            <div className="flex justify-between">
              <span className="text-slate-500">Refund Authorization:</span>
              <span className="font-mono font-bold text-slate-900">${estimatedRefund.toLocaleString()} USD</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">Next Action:</span>
            <span className="font-semibold text-amber-700">Vendor Inspection & Problem Diagnosis</span>
          </div>
        </div>

        <div className="pt-4 flex justify-center gap-3">
          <button
            onClick={() => navigate('/customer/returns')}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            Track Return Progress
          </button>
          <button
            onClick={() => setSubmitted(false)}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            File Another Issue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Report Delivery Issue or Damaged Goods
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Submit claim details, choose your preferred resolution (Replace or Refund), and coordinate vendor inspection.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Select Order / Shipment
          </label>
          <select
            value={selectedShipmentId}
            onChange={e => setSelectedShipmentId(e.target.value)}
            className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            {shipments.map(s => (
              <option key={s.id} value={s.id}>
                {s.trackingNumber} — Status: {s.status} (From: {s.vendorName})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Affected Product SKU
            </label>
            <select
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name} (${p.unitPrice})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Affected Quantity
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={e => setQuantity(Math.max(1, Number(e.target.value)))}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Nature of Problem
          </label>
          <select
            value={reason}
            onChange={e => setReason(e.target.value as ReturnCase['reason'])}
            className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
          >
            <option value="Damaged in Transit">Damaged in Transit (Broken glass, seal breach, impact dent)</option>
            <option value="Incorrect Item Received">Incorrect Item Received (Mismatched SKU)</option>
            <option value="Defective Unit">Defective Unit (Temperature logger fail, sensor malfunction)</option>
            <option value="Customer Cancellation">Protocol Change / Return Request</option>
          </select>
        </div>

        {/* Customer Resolution Choice Selection */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800">
              Customer Settlement Preference <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-slate-500">Choose how the vendor should resolve this</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setCustomerChoice('Replace Product')}
              className={`p-3.5 rounded-xl border-2 text-left transition flex flex-col justify-between cursor-pointer ${
                customerChoice === 'Replace Product'
                  ? 'border-indigo-600 bg-indigo-50/70 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${customerChoice === 'Replace Product' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <PackageCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Replace Product</p>
                    <p className="text-[11px] text-slate-500">Direct unit replacement</p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="customerChoiceRadio"
                  checked={customerChoice === 'Replace Product'}
                  onChange={() => setCustomerChoice('Replace Product')}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[11px] text-slate-600 mt-2">
                Vendor verifies the physical damage and dispatches a brand-new replacement unit with expedited tracking.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setCustomerChoice('Refund Amount')}
              className={`p-3.5 rounded-xl border-2 text-left transition flex flex-col justify-between cursor-pointer ${
                customerChoice === 'Refund Amount'
                  ? 'border-emerald-600 bg-emerald-50/70 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${customerChoice === 'Refund Amount' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Refund Amount</p>
                    <p className="text-[11px] text-emerald-700 font-semibold font-mono">
                      ${estimatedRefund.toLocaleString()} USD
                    </p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="customerChoiceRadio"
                  checked={customerChoice === 'Refund Amount'}
                  onChange={() => setCustomerChoice('Refund Amount')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
              </div>
              <p className="text-[11px] text-slate-600 mt-2">
                Vendor inspects the returned item and initiates an electronic invoice refund/credit note for the full amount.
              </p>
            </button>
          </div>
        </div>

        {/* Photo Upload Simulator */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Photographic Evidence
          </label>
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center bg-slate-50/50 hover:bg-slate-50 transition">
            <Camera className="w-8 h-8 mx-auto text-slate-400 mb-1" />
            <p className="text-xs font-semibold text-slate-700">
              Attach container photo or damaged packaging picture
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Simulated photo evidence included automatically
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Detailed Issue Description
          </label>
          <textarea
            rows={3}
            required
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Explain packaging condition, time of carrier arrival, or leak details..."
            className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-2"
          >
            <span>Submit Return Claim</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
