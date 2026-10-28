import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
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
  ExternalLink,
  Edit3,
  X,
  Package,
  Check,
  FileText,
  Sparkles,
  Layers,
  MapPin,
  User,
  Calendar,
  MoreVertical,
  MoreHorizontal
} from 'lucide-react';
import type { Shipment, ShipmentItem, ShipmentStatus } from '../../types';

export const OwnerShipments: React.FC = () => {
  const {
    shipments,
    products,
    containers,
    createShipment,
    updateShipment,
    dispatchShipment
  } = useData();
  const { user, role } = useAuth();

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailsShipment, setDetailsShipment] = useState<Shipment | null>(null);
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [fulfillmentShipment, setFulfillmentShipment] = useState<Shipment | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // New Shipment Form State
  const [origin, setOrigin] = useState('Central Depot (Hub Alpha)');
  const [destination, setDestination] = useState('BioMed Campus Bay 2');
  const [vendorName, setVendorName] = useState('Apex Industrial Supplies');
  const [customerName, setCustomerName] = useState('Anusha S (BioMed Research)');
  const [selectedContainerId, setSelectedContainerId] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<{ productId: string; quantity: number }[]>([
    { productId: products[0]?.id || '', quantity: 12 }
  ]);
  const [notes, setNotes] = useState('Cold-chain priority handling required.');

  // Edit Shipment Form State
  const [editOrigin, setEditOrigin] = useState('');
  const [editDestination, setEditDestination] = useState('');
  const [editVendorName, setEditVendorName] = useState('');
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editContainerId, setEditContainerId] = useState('');
  const [editItems, setEditItems] = useState<{ productId: string; quantity: number }[]>([]);
  const [editNotes, setEditNotes] = useState('');

  // Fulfillment Workflow Form State
  const [targetStatus, setTargetStatus] = useState<ShipmentStatus>('In Transit');
  const [fulfillmentLocation, setFulfillmentLocation] = useState('');
  const [fulfillmentNotes, setFulfillmentNotes] = useState('');
  const [lineItemQuantities, setLineItemQuantities] = useState<{ [sku: string]: number }>({});

  // Status Filter options as shown in Figma / Screenshot
  const filterPills = ['All', 'Draft', 'In Transit', 'Discrepancy', 'Delivered'];

  // Status badge styling helper matching screenshot
  const getStatusBadgeStyle = (status: ShipmentStatus | string) => {
    switch (status) {
      case 'Discrepancy Detected':
      case 'Discrepancy':
        return 'bg-rose-950/60 border border-rose-800/80 text-rose-400';
      case 'In Transit':
      case 'Dispatched':
        return 'bg-sky-950/60 border border-sky-800/80 text-sky-400';
      case 'Delivered':
      case 'Received':
        return 'bg-emerald-950/60 border border-emerald-800/80 text-emerald-400';
      case 'Ready for Dispatch':
        return 'bg-amber-950/60 border border-amber-800/80 text-amber-400';
      case 'Draft':
      default:
        return 'bg-neutral-900 border border-neutral-700 text-neutral-300';
    }
  };

  const formatStatusDisplay = (status: ShipmentStatus | string) => {
    if (status === 'Discrepancy Detected') return 'Discrepancy';
    return status;
  };

  // Filter shipments
  const filtered = shipments.filter(s => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      s.trackingNumber.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.destination.toLowerCase().includes(q) ||
      s.origin.toLowerCase().includes(q) ||
      s.vendorName.toLowerCase().includes(q) ||
      s.customerName.toLowerCase().includes(q) ||
      s.items.some(i => i.containerNumber.toLowerCase().includes(q) || i.productName.toLowerCase().includes(q));

    let matchStatus = true;
    if (statusFilter === 'All') {
      matchStatus = true;
    } else if (statusFilter === 'Discrepancy') {
      matchStatus = s.status === 'Discrepancy Detected';
    } else if (statusFilter === 'In Transit') {
      matchStatus = s.status === 'In Transit' || s.status === 'Dispatched';
    } else if (statusFilter === 'Delivered') {
      matchStatus = s.status === 'Delivered' || s.status === 'Received';
    } else if (statusFilter === 'Draft') {
      matchStatus = s.status === 'Draft' || s.status === 'Ready for Dispatch';
    } else {
      matchStatus = s.status === statusFilter;
    }

    return matchSearch && matchStatus;
  });

  // Open Edit Modal
  const openEditModal = (shipment: Shipment) => {
    setEditingShipment(shipment);
    setEditOrigin(shipment.origin);
    setEditDestination(shipment.destination);
    setEditVendorName(shipment.vendorName);
    setEditCustomerName(shipment.customerName);
    setEditContainerId(shipment.containerIds[0] || containers[0]?.id || '');
    setEditItems(
      shipment.items.map(item => ({
        productId: item.productId,
        quantity: item.expectedQuantity
      }))
    );
    setEditNotes(shipment.notes || '');
  };

  // Save Edit Changes
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShipment) return;

    const chosenCont =
      containers.find(c => c.id === editContainerId) ||
      containers[0] || {
        id: 'cnt-01',
        containerNumber: 'CNT-ALPHA-881'
      };

    const finalItems = editItems.length > 0 ? editItems : [{ productId: products[0]?.id || 'prod-01', quantity: 1 }];
    const updatedItems: ShipmentItem[] = finalItems.map(item => {
      const prod = products.find(p => p.id === item.productId) || products[0];
      const existing = editingShipment.items.find(i => i.productId === item.productId);
      return {
        productId: prod?.id || 'prod-01',
        productName: prod?.name || 'Product',
        sku: prod?.sku || 'SKU-001',
        barcode: prod?.barcode || 'BC-001',
        containerId: chosenCont.id,
        containerNumber: chosenCont.containerNumber,
        expectedQuantity: Number(item.quantity) || 1,
        verifiedQuantity: existing ? existing.verifiedQuantity : 0,
        scannedQuantity: existing ? existing.scannedQuantity : 0,
        status: existing ? existing.status : 'Pending'
      };
    });

    const updatedEvents = [
      ...editingShipment.events,
      {
        id: `ev-${Date.now()}`,
        timestamp: new Date().toISOString(),
        status: editingShipment.status,
        location: editOrigin,
        performedBy: user?.name || 'Dhruva (Owner)',
        notes: `Manifest routing, line items, and container details updated by ${user?.name || 'Dhruva (Owner)'}.`
      }
    ];

    updateShipment(
      editingShipment.id,
      {
        origin: editOrigin,
        destination: editDestination,
        vendorName: editVendorName,
        customerName: editCustomerName,
        containerIds: [chosenCont.id],
        items: updatedItems,
        notes: editNotes,
        events: updatedEvents
      },
      user?.name || 'Dhruva (Owner)',
      role || 'OWNER'
    );

    setEditingShipment(null);
  };

  // Open Fulfillment Modal
  const openFulfillmentModal = (shipment: Shipment) => {
    setFulfillmentShipment(shipment);
    setFulfillmentLocation(shipment.origin || 'Central Depot (Hub Alpha)');
    setFulfillmentNotes('');

    // Pre-select appropriate next status
    if (shipment.status === 'Draft') setTargetStatus('Ready for Dispatch');
    else if (shipment.status === 'Ready for Dispatch') setTargetStatus('Dispatched');
    else if (shipment.status === 'Dispatched') setTargetStatus('In Transit');
    else if (shipment.status === 'In Transit') setTargetStatus('Received');
    else if (shipment.status === 'Received') setTargetStatus('Delivered');
    else setTargetStatus(shipment.status);

    // Populate current verified quantities
    const qtys: { [sku: string]: number } = {};
    shipment.items.forEach(i => {
      qtys[i.sku] = i.verifiedQuantity !== undefined ? i.verifiedQuantity : i.expectedQuantity;
    });
    setLineItemQuantities(qtys);
  };

  // Shortcut: Verify all items to expected quantity
  const handleVerifyAllUnits = () => {
    if (!fulfillmentShipment) return;
    const qtys: { [sku: string]: number } = {};
    fulfillmentShipment.items.forEach(i => {
      qtys[i.sku] = i.expectedQuantity;
    });
    setLineItemQuantities(qtys);
  };

  // Save Fulfillment
  const handleSaveFulfillment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fulfillmentShipment) return;

    // Recalculate line item statuses
    let hasMismatch = false;
    const updatedItems: ShipmentItem[] = fulfillmentShipment.items.map(item => {
      const verified = lineItemQuantities[item.sku] ?? item.verifiedQuantity;
      let lineStatus: 'Pending' | 'Verified' | 'Mismatch' = 'Pending';
      if (verified === item.expectedQuantity) {
        lineStatus = 'Verified';
      } else if (verified !== item.expectedQuantity) {
        lineStatus = 'Mismatch';
        hasMismatch = true;
      }
      return {
        ...item,
        verifiedQuantity: verified,
        scannedQuantity: verified,
        status: lineStatus
      };
    });

    const finalStatus: ShipmentStatus = hasMismatch ? 'Discrepancy Detected' : targetStatus;

    const newEvent = {
      id: `ev-${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: finalStatus,
      location: fulfillmentLocation || fulfillmentShipment.origin,
      performedBy: user?.name || 'Dhruva (Owner)',
      notes:
        fulfillmentNotes.trim() ||
        `Fulfillment updated to "${finalStatus}". Quantities verified by ${user?.name || 'Owner'}.`
    };

    updateShipment(
      fulfillmentShipment.id,
      {
        status: finalStatus,
        items: updatedItems,
        events: [...fulfillmentShipment.events, newEvent]
      },
      user?.name || 'Dhruva (Owner)',
      role || 'OWNER'
    );

    setFulfillmentShipment(null);
  };

  // Create Shipment Handler
  const handleCreateShipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      alert('Please add at least one product line item.');
      return;
    }

    const chosenContainer =
      containers.find(c => c.id === selectedContainerId) ||
      containers[0] || {
        id: 'cnt-01',
        containerNumber: 'CNT-ALPHA-881'
      };

    const items: ShipmentItem[] = selectedItems.map(item => {
      const prod = products.find(p => p.id === item.productId) || products[0];
      return {
        productId: prod?.id || 'prod-01',
        productName: prod?.name || 'Product',
        sku: prod?.sku || 'SKU-001',
        barcode: prod?.barcode || 'BC-001',
        containerId: chosenContainer.id,
        containerNumber: chosenContainer.containerNumber,
        expectedQuantity: Number(item.quantity) || 1,
        verifiedQuantity: 0,
        scannedQuantity: 0,
        status: 'Pending'
      };
    });

    createShipment(
      {
        origin,
        destination,
        vendorName,
        customerName,
        items,
        containerIds: [chosenContainer.id],
        notes
      },
      user?.name || 'Dhruva (Owner)',
      role || 'OWNER'
    );

    setCreateModalOpen(false);
  };

  return (
    <div className="bg-black text-white p-5 sm:p-7 rounded-3xl border border-neutral-800/90 shadow-2xl space-y-6">
      {/* 1. Header with Title and Add Shipment Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Shipments
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            Manage dispatches, container assignments and delivery verification.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-neutral-100 text-black text-xs sm:text-sm font-bold rounded-full shadow-lg transition-transform active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-black" strokeWidth={2.5} />
          <span>Add Shipment</span>
        </button>
      </div>

      {/* 2. Search Bar and Status Filters */}
      <div className="space-y-3">
        {/* Rounded-full Search Input */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search shipment ID, vendor or container..."
            className="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-neutral-700 rounded-full text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none transition"
          />
        </div>

        {/* Filter Pill Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {filterPills.map(pill => {
            const isActive = statusFilter === pill;
            return (
              <button
                key={pill}
                type="button"
                onClick={() => setStatusFilter(pill)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-white text-black shadow-md font-bold'
                    : 'bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                }`}
              >
                {pill}
              </button>
            );
          })}
        </div>

        {/* Count Indicator */}
        <div className="text-xs text-neutral-400 font-medium px-1">
          {filtered.length} {filtered.length === 1 ? 'shipment' : 'shipments'}
        </div>
      </div>

      {/* 3. Shipment Cards (List View) */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-neutral-800 bg-neutral-950/60 text-neutral-400 text-sm">
            No shipments match the current search or status filter.
          </div>
        ) : (
          filtered.map(shipment => {
            const totalExpected = shipment.items.reduce((acc, i) => acc + i.expectedQuantity, 0);
            const totalVerified = shipment.items.reduce((acc, i) => acc + (i.verifiedQuantity || 0), 0);

            // Container label (take first container or list)
            const containerDisplay =
              shipment.items[0]?.containerNumber ||
              (shipment.containerIds.length > 0 ? `CNT-ALPHA-881` : 'Unassigned');

            // Format displayed ID as SHP-2026-00X or Tracking
            const primaryId = shipment.id.toUpperCase().startsWith('SHP-')
              ? shipment.id.toUpperCase()
              : shipment.trackingNumber;

            return (
              <div
                key={shipment.id}
                className="bg-black border border-neutral-800/90 rounded-2xl p-5 hover:border-neutral-700/80 transition-all shadow-xl space-y-4"
              >
                {/* Top Row: Shipment ID + Status Badge + 3-Dots */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white text-base sm:text-lg font-mono tracking-tight">
                      {primaryId}
                    </span>
                    {primaryId !== shipment.trackingNumber && (
                      <span className="text-[11px] font-mono text-neutral-500 font-medium">
                        ({shipment.trackingNumber})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold px-3 py-0.5 rounded-full ${getStatusBadgeStyle(
                        shipment.status
                      )}`}
                    >
                      {formatStatusDisplay(shipment.status)}
                    </span>

                    {/* Top 3-Dots Button */}
                    <button
                      type="button"
                      onClick={() => setActiveMenuId(activeMenuId === shipment.id ? null : shipment.id)}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        activeMenuId === shipment.id
                          ? 'bg-neutral-800 text-white'
                          : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
                      }`}
                      title="Action Items"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Second Row: Route (Origin → Destination) */}
                <div className="text-xs text-neutral-400 font-medium flex items-center gap-1.5 flex-wrap">
                  <span>{shipment.origin}</span>
                  <span className="text-neutral-600">→</span>
                  <span>{shipment.destination}</span>
                </div>

                {/* Divider Line */}
                <div className="border-t border-neutral-900/90" />

                {/* Two-Column Metadata Block */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Left Column */}
                  <div>
                    <div className="text-[11px] text-neutral-400 font-medium">Container</div>
                    <div className="text-sm font-bold text-white font-mono mt-0.5">
                      {containerDisplay}
                    </div>

                    <div className="text-[11px] text-neutral-400 font-medium mt-3">Product lines</div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      {shipment.items.length}
                    </div>
                  </div>

                  {/* Right Column */}
                  <div>
                    <div className="text-[11px] text-neutral-400 font-medium">Assigned vendor</div>
                    <div className="text-sm font-bold text-white mt-0.5 truncate">
                      {shipment.vendorName}
                    </div>

                    <div className="text-[11px] text-neutral-400 font-medium mt-3">Verified units</div>
                    <div className="text-sm font-bold text-white font-mono mt-0.5">
                      {totalVerified} / {totalExpected}
                    </div>
                  </div>
                </div>

                {/* Bottom Row: View Details + Three Dots Action Items Menu */}
                <div className="border-t border-neutral-900/90 pt-3 flex items-center justify-between relative">
                  <button
                    type="button"
                    onClick={() => setDetailsShipment(shipment)}
                    className="px-3.5 py-1.5 rounded-full border border-neutral-700 bg-neutral-900/90 hover:bg-neutral-800 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <span>View details</span>
                    <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                  </button>

                  {/* Three Dots Button & Dropdown Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveMenuId(activeMenuId === shipment.id ? null : shipment.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition cursor-pointer ${
                        activeMenuId === shipment.id
                          ? 'bg-neutral-800 border-neutral-500 text-white shadow-lg'
                          : 'bg-neutral-900/90 border-neutral-700/80 text-neutral-300 hover:text-white hover:bg-neutral-800'
                      }`}
                      title="Open action items"
                    >
                      <MoreHorizontal className="w-4 h-4 text-indigo-400" />
                      <span>Action items</span>
                    </button>

                    {/* Floating Dropdown Menu */}
                    {activeMenuId === shipment.id && (
                      <>
                        <div
                          className="fixed inset-0 z-30"
                          onClick={() => setActiveMenuId(null)}
                        />
                        <div className="absolute right-0 bottom-full mb-2 z-40 w-52 rounded-2xl bg-neutral-900 border border-neutral-700 shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              setDetailsShipment(shipment);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-200 hover:text-white hover:bg-neutral-800 rounded-xl transition text-left cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                            <span>View details</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              openEditModal(shipment);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-200 hover:text-white hover:bg-neutral-800 rounded-xl transition text-left cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Edit details</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              openFulfillmentModal(shipment);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-indigo-300 hover:text-white hover:bg-indigo-950/70 border border-indigo-900/40 rounded-xl transition text-left cursor-pointer group"
                          >
                            <Truck className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                            <span>Process fulfillment</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: VIEW DETAILS MODAL                                              */}
      {/* ========================================================================= */}
      {detailsShipment && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-neutral-950 border border-neutral-800 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl text-white overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-neutral-800 flex items-center justify-between bg-black">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <Truck className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-base sm:text-lg font-mono font-extrabold text-white">
                    {detailsShipment.trackingNumber}
                  </h3>
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${getStatusBadgeStyle(
                      detailsShipment.status
                    )}`}
                  >
                    {formatStatusDisplay(detailsShipment.status)}
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  {detailsShipment.origin} → {detailsShipment.destination}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDetailsShipment(null)}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-neutral-900/60 rounded-xl border border-neutral-800">
                  <span className="text-[11px] text-neutral-400 block font-medium">Assigned Vendor</span>
                  <span className="text-xs sm:text-sm font-bold text-white truncate block mt-0.5">
                    {detailsShipment.vendorName}
                  </span>
                </div>
                <div className="p-3 bg-neutral-900/60 rounded-xl border border-neutral-800">
                  <span className="text-[11px] text-neutral-400 block font-medium">Recipient Customer</span>
                  <span className="text-xs sm:text-sm font-bold text-white truncate block mt-0.5">
                    {detailsShipment.customerName}
                  </span>
                </div>
                <div className="p-3 bg-neutral-900/60 rounded-xl border border-neutral-800">
                  <span className="text-[11px] text-neutral-400 block font-medium">Product Lines</span>
                  <span className="text-xs sm:text-sm font-bold text-white block mt-0.5">
                    {detailsShipment.items.length} lines
                  </span>
                </div>
                <div className="p-3 bg-neutral-900/60 rounded-xl border border-neutral-800">
                  <span className="text-[11px] text-neutral-400 block font-medium">Reconciliation</span>
                  <span className="text-xs sm:text-sm font-bold font-mono text-emerald-400 block mt-0.5">
                    {detailsShipment.items.reduce((acc, i) => acc + (i.verifiedQuantity || 0), 0)} /{' '}
                    {detailsShipment.items.reduce((acc, i) => acc + i.expectedQuantity, 0)} units
                  </span>
                </div>
              </div>

              {/* Manifest Product Lines Table */}
              <div className="bg-black rounded-xl border border-neutral-800 overflow-hidden">
                <div className="px-4 py-2.5 bg-neutral-900 border-b border-neutral-800 text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center justify-between">
                  <span>Manifest Product Lines ({detailsShipment.items.length})</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-900/60 border-b border-neutral-800 text-neutral-400 font-semibold">
                      <tr>
                        <th className="py-2.5 px-4">SKU / Code</th>
                        <th className="py-2.5 px-4">Product Name</th>
                        <th className="py-2.5 px-4">Container</th>
                        <th className="py-2.5 px-4 text-center">Expected</th>
                        <th className="py-2.5 px-4 text-center">Verified</th>
                        <th className="py-2.5 px-4 text-right">Line Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {detailsShipment.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-neutral-900/30">
                          <td className="py-2.5 px-4 font-mono font-bold text-indigo-400">
                            {item.sku}
                          </td>
                          <td className="py-2.5 px-4 font-medium text-white">{item.productName}</td>
                          <td className="py-2.5 px-4 font-mono text-neutral-400">
                            {item.containerNumber}
                          </td>
                          <td className="py-2.5 px-4 text-center font-bold text-neutral-200">
                            {item.expectedQuantity}
                          </td>
                          <td className="py-2.5 px-4 text-center font-bold text-emerald-400">
                            {item.verifiedQuantity || 0}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.status === 'Verified'
                                  ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800'
                                  : item.status === 'Mismatch'
                                  ? 'bg-rose-950/70 text-rose-400 border border-rose-800'
                                  : 'bg-neutral-900 text-neutral-300 border border-neutral-700'
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
              </div>

              {/* Chain of Custody Events */}
              <div className="bg-black rounded-xl border border-neutral-800 p-4 space-y-3">
                <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Chain of Custody Events</span>
                </h4>
                <div className="space-y-3">
                  {detailsShipment.events.map(ev => (
                    <div key={ev.id} className="flex items-start gap-3 text-xs">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white">{ev.status}</span>
                          <span className="text-neutral-500">•</span>
                          <span className="text-neutral-400">{ev.location}</span>
                          <span className="text-neutral-500">•</span>
                          <span className="font-semibold text-indigo-400">{ev.performedBy}</span>
                        </div>
                        <p className="text-neutral-300">{ev.notes}</p>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-500 shrink-0">
                        {new Date(ev.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-neutral-800 bg-black flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setDetailsShipment(null)}
                className="px-4 py-2 rounded-full border border-neutral-700 hover:bg-neutral-800 text-neutral-300 text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const shp = detailsShipment;
                    setDetailsShipment(null);
                    openEditModal(shp);
                  }}
                  className="px-4 py-2 rounded-full border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Details</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const shp = detailsShipment;
                    setDetailsShipment(null);
                    openFulfillmentModal(shp);
                  }}
                  className="px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg transition cursor-pointer"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Process Fulfillment</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT DETAILS MODAL                                              */}
      {/* ========================================================================= */}
      {editingShipment && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-neutral-950 border border-neutral-800 rounded-3xl max-w-lg w-full flex flex-col shadow-2xl text-white overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-black">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-indigo-400" />
                  <span>Edit Shipment Details</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Update origin, destination, assigned vendor, and recipient notes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingShipment(null)}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Origin Location
                  </label>
                  <input
                    type="text"
                    value={editOrigin}
                    onChange={e => setEditOrigin(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 bg-black border border-neutral-800 focus:border-indigo-500 rounded-xl text-xs sm:text-sm text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Destination Location
                  </label>
                  <input
                    type="text"
                    value={editDestination}
                    onChange={e => setEditDestination(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 bg-black border border-neutral-800 focus:border-indigo-500 rounded-xl text-xs sm:text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Assigned Vendor
                  </label>
                  <input
                    type="text"
                    value={editVendorName}
                    onChange={e => setEditVendorName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 bg-black border border-neutral-800 focus:border-indigo-500 rounded-xl text-xs sm:text-sm text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Customer / Recipient
                  </label>
                  <input
                    type="text"
                    value={editCustomerName}
                    onChange={e => setEditCustomerName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 bg-black border border-neutral-800 focus:border-indigo-500 rounded-xl text-xs sm:text-sm text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Transport Container
                  </label>
                  <select
                    value={editContainerId}
                    onChange={e => setEditContainerId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-black border border-neutral-800 focus:border-indigo-500 rounded-xl text-xs sm:text-sm text-white focus:outline-none cursor-pointer"
                  >
                    {containers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.containerNumber} ({c.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Edit Manifest Product Lines */}
              <div className="bg-black p-3.5 rounded-2xl border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-neutral-200">
                      Manifest Line Items ({editItems.length})
                    </span>
                    <p className="text-[11px] text-neutral-400">
                      Select product and quantity for each line item.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEditItems(prev => [
                        ...prev,
                        {
                          productId: products[0]?.id || '',
                          quantity: 1
                        }
                      ])
                    }
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-bold transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Product Line</span>
                  </button>
                </div>

                {/* Column Headers */}
                <div className="flex items-center gap-2 px-1 text-[11px] font-semibold text-neutral-400">
                  <span className="flex-1">Select Product</span>
                  <span className="w-28 text-center">Quantity</span>
                  <span className="w-8"></span>
                </div>

                <div className="space-y-2">
                  {editItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/80"
                    >
                      <div className="flex-1 min-w-0">
                        <select
                          value={item.productId}
                          onChange={e => {
                            const val = e.target.value;
                            setEditItems(prev =>
                              prev.map((it, i) => (i === idx ? { ...it, productId: val } : it))
                            );
                          }}
                          className="w-full bg-black border border-neutral-800 focus:border-indigo-500 rounded-lg p-2 text-xs text-white focus:outline-none cursor-pointer truncate font-medium"
                        >
                          <option value="" disabled>Select Product</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.sku} — {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-28 shrink-0">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => {
                            const val = Math.max(1, Number(e.target.value) || 1);
                            setEditItems(prev =>
                              prev.map((it, i) => (i === idx ? { ...it, quantity: val } : it))
                            );
                          }}
                          className="w-full bg-black border border-neutral-800 focus:border-indigo-500 rounded-lg p-2 text-xs text-white text-center focus:outline-none font-mono font-bold"
                          placeholder="Quantity"
                        />
                      </div>

                      {editItems.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => setEditItems(prev => prev.filter((_, i) => i !== idx))}
                          className="w-8 h-8 rounded-lg bg-neutral-900 hover:bg-rose-950/60 text-neutral-400 hover:text-rose-400 flex items-center justify-center text-xs font-bold transition cursor-pointer shrink-0"
                          title="Remove line"
                        >
                          ✕
                        </button>
                      ) : (
                        <div className="w-8" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Handling Notes
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-black border border-neutral-800 focus:border-indigo-500 rounded-xl text-xs sm:text-sm text-white focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingShipment(null)}
                  className="px-4 py-2 rounded-full border border-neutral-700 hover:bg-neutral-800 text-neutral-300 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PROCESS FULFILLMENT WORKFLOW                                     */}
      {/* ========================================================================= */}
      {fulfillmentShipment && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-neutral-950 border border-neutral-800 rounded-3xl max-w-xl w-full flex flex-col shadow-2xl text-white overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-black">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Truck className="w-4 h-4 text-indigo-400" />
                  <span>Process Fulfillment — {fulfillmentShipment.trackingNumber}</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Update fulfillment lifecycle status, verify unit counts, and sign off handover.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFulfillmentShipment(null)}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveFulfillment} className="p-5 space-y-4">
              {/* Step 1: Target Status */}
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-2">
                  Update Fulfillment Status
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(
                    [
                      'Ready for Dispatch',
                      'Dispatched',
                      'In Transit',
                      'Received',
                      'Delivered',
                      'Discrepancy Detected'
                    ] as ShipmentStatus[]
                  ).map(st => {
                    const isSelected = targetStatus === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setTargetStatus(st)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold text-center border transition cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                            : 'bg-black border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                        }`}
                      >
                        {formatStatusDisplay(st)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Line Item Quantity Reconciliation */}
              <div className="bg-black p-3.5 rounded-2xl border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-200">
                    Verify Line Item Quantities
                  </span>
                  <button
                    type="button"
                    onClick={handleVerifyAllUnits}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold transition cursor-pointer"
                  >
                    ✓ Verify All (100%)
                  </button>
                </div>

                <div className="space-y-2">
                  {fulfillmentShipment.items.map(item => {
                    const currentVerified = lineItemQuantities[item.sku] ?? item.verifiedQuantity;
                    return (
                      <div
                        key={item.sku}
                        className="flex items-center justify-between p-2.5 bg-neutral-900/60 rounded-xl border border-neutral-800/80 text-xs"
                      >
                        <div>
                          <div className="font-bold text-white">{item.productName}</div>
                          <div className="text-[10px] text-neutral-400 font-mono">
                            {item.sku} • Expected: {item.expectedQuantity}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setLineItemQuantities(prev => ({
                                ...prev,
                                [item.sku]: Math.max(0, currentVerified - 1)
                              }))
                            }
                            className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 text-white font-bold flex items-center justify-center transition cursor-pointer"
                          >
                            -
                          </button>
                          <span className="font-mono font-bold text-white min-w-[24px] text-center">
                            {currentVerified}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setLineItemQuantities(prev => ({
                                ...prev,
                                [item.sku]: currentVerified + 1
                              }))
                            }
                            className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 text-white font-bold flex items-center justify-center transition cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Checkpoint Location & Handover Notes */}
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Checkpoint Location
                </label>
                <input
                  type="text"
                  value={fulfillmentLocation}
                  onChange={e => setFulfillmentLocation(e.target.value)}
                  placeholder="e.g. Apex Central Depot Gate 3"
                  required
                  className="w-full px-3.5 py-2 bg-black border border-neutral-800 focus:border-indigo-500 rounded-xl text-xs sm:text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Handover Notes / Verification Signoff
                </label>
                <textarea
                  rows={2}
                  value={fulfillmentNotes}
                  onChange={e => setFulfillmentNotes(e.target.value)}
                  placeholder="e.g. Cargo locked with cryptographic tamper seal and handed to carrier."
                  className="w-full px-3.5 py-2 bg-black border border-neutral-800 focus:border-indigo-500 rounded-xl text-xs sm:text-sm text-white focus:outline-none resize-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setFulfillmentShipment(null)}
                  className="px-4 py-2 rounded-full border border-neutral-700 hover:bg-neutral-800 text-neutral-300 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm & Save Fulfillment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CREATE NEW SHIPMENT MODAL                                        */}
      {/* ========================================================================= */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-neutral-950 border border-neutral-800 rounded-3xl max-w-xl w-full flex flex-col shadow-2xl text-white overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-black">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-400" />
                  <span>Create New Shipment Manifest</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Generate tamper-sealed manifest with container assignment.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateShipment} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Origin Hub
                  </label>
                  <input
                    type="text"
                    value={origin}
                    onChange={e => setOrigin(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 bg-black border border-neutral-800 focus:border-indigo-500 rounded-xl text-xs sm:text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Destination Bay
                  </label>
                  <input
                    type="text"
                    value={destination}
                    onChange={e => setDestination(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 bg-black border border-neutral-800 focus:border-indigo-500 rounded-xl text-xs sm:text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Assigned Vendor
                  </label>
                  <input
                    type="text"
                    value={vendorName}
                    onChange={e => setVendorName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 bg-black border border-neutral-800 focus:border-indigo-500 rounded-xl text-xs sm:text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Recipient Customer
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 bg-black border border-neutral-800 focus:border-indigo-500 rounded-xl text-xs sm:text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Transport Container
                  </label>
                  <select
                    value={selectedContainerId || containers[0]?.id || ''}
                    onChange={e => setSelectedContainerId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-black border border-neutral-800 focus:border-indigo-500 rounded-xl text-xs sm:text-sm text-white focus:outline-none cursor-pointer"
                  >
                    {containers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.containerNumber} ({c.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Product Lines */}
              <div className="bg-black p-3.5 rounded-2xl border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-neutral-200">
                      Manifest Line Items ({selectedItems.length})
                    </span>
                    <p className="text-[11px] text-neutral-400">
                      Select product and quantity for each line item.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedItems(prev => [
                        ...prev,
                        {
                          productId: '',
                          quantity: 1
                        }
                      ])
                    }
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-bold transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Product Line</span>
                  </button>
                </div>

                {/* Column Headers */}
                <div className="flex items-center gap-2 px-1 text-[11px] font-semibold text-neutral-400">
                  <span className="flex-1">Select Product</span>
                  <span className="w-28 text-center">Quantity</span>
                  <span className="w-8"></span>
                </div>

                <div className="space-y-2">
                  {selectedItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/80"
                    >
                      {/* Product Selector */}
                      <div className="flex-1 min-w-0">
                        <select
                          value={item.productId}
                          onChange={e => {
                            const val = e.target.value;
                            setSelectedItems(prev =>
                              prev.map((it, i) => (i === idx ? { ...it, productId: val } : it))
                            );
                          }}
                          className="w-full bg-black border border-neutral-800 focus:border-indigo-500 rounded-lg p-2 text-xs text-white focus:outline-none cursor-pointer truncate font-medium"
                        >
                          <option value="" disabled>Select Product</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.sku} — {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity Input */}
                      <div className="w-28 shrink-0">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => {
                            const val = Math.max(1, Number(e.target.value) || 1);
                            setSelectedItems(prev =>
                              prev.map((it, i) => (i === idx ? { ...it, quantity: val } : it))
                            );
                          }}
                          className="w-full bg-black border border-neutral-800 focus:border-indigo-500 rounded-lg p-2 text-xs text-white text-center focus:outline-none font-mono font-bold"
                          placeholder="Quantity"
                        />
                      </div>

                      {/* Remove Line Button */}
                      {selectedItems.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => setSelectedItems(prev => prev.filter((_, i) => i !== idx))}
                          className="w-8 h-8 rounded-lg bg-neutral-900 hover:bg-rose-950/60 text-neutral-400 hover:text-rose-400 flex items-center justify-center text-xs font-bold transition cursor-pointer shrink-0"
                          title="Remove line"
                        >
                          ✕
                        </button>
                      ) : (
                        <div className="w-8" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Handling Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-black border border-neutral-800 focus:border-indigo-500 rounded-xl text-xs sm:text-sm text-white focus:outline-none resize-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-neutral-700 hover:bg-neutral-800 text-neutral-300 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-white hover:bg-neutral-200 text-black text-xs font-bold transition shadow-lg cursor-pointer"
                >
                  Create & Lock Manifest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
