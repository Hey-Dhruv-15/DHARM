import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { containerApi } from '../../services/containerApi';
import { getApiBaseUrl } from '../../services/apiConfig';
import { OpenCvBarcodeScanner } from '../../components/scanner/OpenCvBarcodeScanner';
import {
  Archive,
  Plus,
  CheckCircle2,
  AlertTriangle,
  MoreVertical,
  Eye,
  Edit2,
  Ban,
  Trash2,
  Package,
  Sparkles,
  X,
  Search,
  Filter,
  Scan
} from 'lucide-react';
import type { Container, ContainerType, Product, ContainerScannedItem } from '../../types';

const WAREHOUSE_LOCATIONS = [
  'Central Warehouse Bay 4',
  'Apex Central Depot (Hub Alpha)',
  'Central Distribution Center, Hub Alpha',
  'Midwest Sorting & Cross-Dock Hub 4',
  'BioMed Research Campus Bay 2',
  'South Distribution Center Bay 8',
  'East Coast Logistics Hub'
];

const CONTAINER_TYPES: ContainerType[] = [
  'Cold-Chain Bin',
  'Security Crate',
  'RFID Pallet',
  'Heavy Duty Tote',
  'Standard Container'
];

export const OwnerContainers: React.FC = () => {
  const { containers, createContainer, updateContainer, toggleContainerStatus, shipments, products } = useData();
  const { user, role } = useAuth();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailsModalContainer, setDetailsModalContainer] = useState<Container | null>(null);
  const [editModalContainer, setEditModalContainer] = useState<Container | null>(null);

  // Dedicated Scan Products Action Modal state (triggered from 3-dots card menu)
  const [scanModalContainer, setScanModalContainer] = useState<Container | null>(null);
  const [containerScanItems, setContainerScanItems] = useState<ContainerScannedItem[]>([]);
  const [liveScannedCode, setLiveScannedCode] = useState<string | null>(null);
  const [liveScannedItemInfo, setLiveScannedItemInfo] = useState<{
    name: string;
    sku: string;
    weight: number;
    barcode: string;
  } | null>(null);
  const [containerScanError, setContainerScanError] = useState<string | null>(null);
  const [isContainerScanning, setIsContainerScanning] = useState<boolean>(false);
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [isScanningApi, setIsScanningApi] = useState<boolean>(false);
  const [scanApiSuccess, setScanApiSuccess] = useState<string | null>(null);
  const [selectedCatalogBarcode, setSelectedCatalogBarcode] = useState<string>('');
  const [selectedPackQuantity, setSelectedPackQuantity] = useState<number>(1);

  // Dropdown menu state for cards
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Container Information Form State
  const [containerNumber, setContainerNumber] = useState('');
  const [containerType, setContainerType] = useState<ContainerType>('Cold-Chain Bin');
  const [maxCapacity, setMaxCapacity] = useState<number>(150);
  const [capacityUnit, setCapacityUnit] = useState<'kg' | 'lbs' | 'units'>('kg');
  const [sealNumber, setSealNumber] = useState('');
  const [initialLocation, setInitialLocation] = useState(WAREHOUSE_LOCATIONS[0]);
  const [description, setDescription] = useState('');
  const [isCreatingContainer, setIsCreatingContainer] = useState(false);
  const [createContainerError, setCreateContainerError] = useState<string | null>(null);
  const [createContainerSuccess, setCreateContainerSuccess] = useState<string | null>(null);

  // Auto-generate container number & seal
  const handleAutoFill = () => {
    const num = Math.floor(100 + Math.random() * 900);
    const prefix =
      containerType === 'Cold-Chain Bin'
        ? 'ALPHA'
        : containerType === 'Security Crate'
        ? 'SEC'
        : containerType === 'RFID Pallet'
        ? 'PAL'
        : containerType === 'Heavy Duty Tote'
        ? 'TOTE'
        : 'STD';
    setContainerNumber(`CNT-${prefix}-${num}`);
    setSealNumber(`SEAL-SEC-${Math.floor(10000 + Math.random() * 90000)}`);
  };

  // Open Create Modal
  const openCreateModal = () => {
    handleAutoFill();
    setDescription('');
    setMaxCapacity(150);
    setCapacityUnit('kg');
    setCreateContainerError(null);
    setCreateContainerSuccess(null);
    setIsCreatingContainer(false);
    setCreateModalOpen(true);
  };

  // Helper for generating standard unit weights for catalog products
  const getProductUnitWeight = (product: Product): number => {
    if (product.sku.includes('CRYO')) return 3.5;
    if (product.sku.includes('SENS')) return 1.2;
    if (product.sku.includes('BIO')) return 0.8;
    if (product.sku.includes('FILT')) return 1.5;
    if (product.sku.includes('GATE')) return 4.0;
    if (product.sku.includes('SEC')) return 2.5;
    if (product.sku.includes('APL')) return 3.5;
    if (product.sku.includes('MKT')) return 2.0;
    return 2.5; // standard fallback 2.5 kg/unit
  };

  const simulationProducts = products.map(p => ({
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    weightKg: getProductUnitWeight(p)
  }));

  // Seal Container API (POST /api/v1/containers/{container_id}/seal)
  const handleSealContainer = async (c: Container) => {
    const sealNumber = prompt('Enter or confirm Tamper-Evident Seal Barcode:', c.sealNumber || `SEAL-SEC-${Math.floor(10000 + Math.random() * 90000)}`);
    if (!sealNumber || !sealNumber.trim()) return;

    try {
      await containerApi.sealContainer(c.containerNumber || c.id, sealNumber.trim());
      updateContainer(
        c.id,
        { sealNumber: sealNumber.trim().toUpperCase(), sealStatus: 'Active', status: 'Sealed' },
        user?.name || 'Dhruva (Owner)',
        role || undefined
      );
      alert(`Container ${c.containerNumber} sealed successfully with ${sealNumber.trim().toUpperCase()}`);
    } catch (e: any) {
      alert(`Error sealing container: ${e.message}`);
    }
  };

  // Open dedicated Scan Products modal for a specific container from the 3-dots menu
  const openScanModalForContainer = async (c: Container) => {
    setScanModalContainer(c);
    setContainerScanItems(c.items ? [...c.items] : []);
    setLiveScannedCode(null);
    setLiveScannedItemInfo(null);
    setContainerScanError(null);
    setIsContainerScanning(false);
    setBarcodeInput('');
    setScanApiSuccess(null);

    // Fetch latest manifest directly from backend
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/v1/containers/${encodeURIComponent(c.containerNumber || c.id)}`);
      if (res.ok) {
        const fullContainer = await res.json();
        const rawItems = fullContainer.items || fullContainer.products || [];
        const formattedItems: ContainerScannedItem[] = rawItems.map((it: any) => ({
          productId: it.productId || it.product_id || it.id,
          productName: it.productName || it.product_name,
          sku: it.sku,
          barcode: it.barcode,
          quantity: it.quantity,
          unitWeightKg: Number(it.unitWeightKg || it.unit_weight_kg || it.unitWeight || it.unit_weight || 1),
          weightKg: Number(it.weightKg || it.weight_kg || it.totalWeight || it.total_weight || 1),
          scannedAt: it.scannedAt || it.scanned_at || new Date().toISOString()
        }));

        setContainerScanItems(formattedItems);
        updateContainer(
          c.id,
          {
            items: formattedItems,
            currentWeightKg: fullContainer.currentWeightKg ?? fullContainer.current_weight_kg,
            utilizedCapacity: fullContainer.utilizedCapacity ?? fullContainer.utilized_capacity,
            status: fullContainer.status
          },
          user?.name || 'Dhruva (Owner)',
          role || undefined
        );
      }
    } catch (e) {
      // offline fallback
    }
  };

  // Dedicated Barcode Scanner API Integration (POST /api/v1/containers/{container_id}/products/scan)
  const addBarcode = async (containerIdentifier: string, barcodeToScan: string) => {
    const cleanCode = barcodeToScan.trim();
    if (!cleanCode) return null;

    setIsScanningApi(true);
    setContainerScanError(null);
    setScanApiSuccess(null);

    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/v1/containers/${encodeURIComponent(containerIdentifier)}/products/scan`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ barcode: cleanCode })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to add product to container');
      }

      // Reload container manifest from backend (GET /api/v1/containers/{id})
      try {
        const getRes = await fetch(
          `${getApiBaseUrl()}/api/v1/containers/${encodeURIComponent(containerIdentifier)}`
        );
        if (getRes.ok) {
          const fullContainer = await getRes.json();
          const rawItems = fullContainer.items || fullContainer.products || [];
          const formattedItems: ContainerScannedItem[] = rawItems.map((it: any) => ({
            productId: it.productId || it.product_id || it.id,
            productName: it.productName || it.product_name,
            sku: it.sku,
            barcode: it.barcode,
            quantity: it.quantity,
            unitWeightKg: Number(it.unitWeightKg || it.unit_weight_kg || it.unitWeight || it.unit_weight || 1),
            weightKg: Number(it.weightKg || it.weight_kg || it.totalWeight || it.total_weight || 1),
            scannedAt: it.scannedAt || it.scanned_at || new Date().toISOString()
          }));

          setContainerScanItems(formattedItems);
          updateContainer(
            scanModalContainer?.id || containerIdentifier,
            {
              items: formattedItems,
              currentWeightKg: fullContainer.currentWeightKg ?? fullContainer.current_weight_kg,
              utilizedCapacity: fullContainer.utilizedCapacity ?? fullContainer.utilized_capacity,
              status: fullContainer.status
            },
            user?.name || 'Dhruva (Owner)',
            role || undefined
          );
        }
      } catch (getErr) {
        console.warn('Could not refresh container manifest from backend:', getErr);
      }

      const p = data.product;
      const pName = p.product_name || p.productName || 'Scanned Product';
      const pQty = p.quantity || 1;
      const pBc = p.barcode || cleanCode;
      const pWeight = Number(p.unit_weight || p.unitWeight || 1.0);

      setScanApiSuccess(`Success! Added ${pName} (Qty: ${pQty})`);
      setLiveScannedCode(pBc);
      setLiveScannedItemInfo({
        name: pName,
        sku: p.sku || 'SKU-SCAN',
        weight: pWeight,
        barcode: pBc
      });
      setBarcodeInput('');
      setTimeout(() => setScanApiSuccess(null), 3500);
      return data;
    } catch (err: any) {
      setContainerScanError(err.message || 'Error communicating with barcode scanner API');
      return null;
    } finally {
      setIsScanningApi(false);
    }
  };

  // Real-time Barcode Scan Handler for existing container (accepts real physical barcodes from OpenCV Camera)
  const handleContainerBarcodeScan = (barcode: string): boolean => {
    if (!scanModalContainer) return false;
    addBarcode(scanModalContainer.containerNumber, barcode);
    return true;
  };

  // Remove product from container in UI & Backend ("remove in UI please :>")
  const handleRemoveContainerItem = async (productId: string) => {
    if (!scanModalContainer) return;
    const targetItem = containerScanItems.find(i => i.productId === productId);
    const identifier = targetItem?.barcode || targetItem?.sku || productId;

    try {
      await fetch(
        `${getApiBaseUrl()}/api/v1/containers/${encodeURIComponent(scanModalContainer.containerNumber)}/products/${encodeURIComponent(identifier)}`,
        { method: 'DELETE' }
      );
    } catch (e) {
      console.warn('Backend DELETE error, removing in local state:', e);
    }

    const updated = containerScanItems.filter(i => i.productId !== productId);
    setContainerScanItems(updated);
    setContainerScanError(null);
    updateContainer(
      scanModalContainer.id,
      { items: updated },
      user?.name || 'Dhruva (Owner)',
      role || undefined
    );
  };

  // Adjust quantity manually in container Scan Products modal
  const handleAdjustContainerItemQty = (productId: string, delta: number) => {
    if (!scanModalContainer) return;
    const maxCap = scanModalContainer.maxCapacity || scanModalContainer.capacityKg || 150;
    const item = containerScanItems.find(i => i.productId === productId);
    if (!item) return;

    const currentUtilized = containerScanItems.reduce((acc, i) => acc + (i.weightKg || i.unitWeightKg * i.quantity), 0);

    if (delta > 0 && currentUtilized + item.unitWeightKg > maxCap) {
      setContainerScanError(
        `⚠️ Capacity limit exceeded! Cannot add another unit of "${item.productName}". Maximum capacity is ${maxCap} ${scanModalContainer.capacityUnit || 'kg'}.`
      );
      return;
    }

    setContainerScanError(null);
    const updated = containerScanItems
      .map(i => {
        if (i.productId !== productId) return i;
        const newQty = i.quantity + delta;
        if (newQty <= 0) return null;
        return {
          ...i,
          quantity: newQty,
          weightKg: Number((newQty * i.unitWeightKg).toFixed(2))
        };
      })
      .filter(Boolean) as ContainerScannedItem[];

    setContainerScanItems(updated);
    updateContainer(
      scanModalContainer.id,
      { items: updated },
      user?.name || 'Dhruva (Owner)',
      role || undefined
    );
  };

  // Form Submit: Create Container via POST /api/v1/containers
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateContainerError(null);
    setCreateContainerSuccess(null);

    const cleanNum = containerNumber.trim().toUpperCase();
    const cleanSeal = sealNumber.trim().toUpperCase();

    if (!cleanNum) {
      setCreateContainerError('Please provide a unique Container Number.');
      return;
    }
    if (!cleanSeal) {
      setCreateContainerError('Please provide a Tamper-Evident Seal Number.');
      return;
    }
    if (Number(maxCapacity) <= 0) {
      setCreateContainerError('Maximum capacity must be greater than zero');
      return;
    }

    const unitFormatted =
      capacityUnit === 'kg'
        ? 'Kilograms (kg)'
        : capacityUnit === 'lbs'
        ? 'Pounds (lbs)'
        : capacityUnit === 'units'
        ? 'Discrete Units (count)'
        : capacityUnit;

    const payload = {
      containerNumber: cleanNum,
      containerType: containerType,
      maximumCapacity: Number(maxCapacity),
      capacityUnit: unitFormatted,
      tamperEvidentSealNumber: cleanSeal,
      initialLocation: initialLocation.trim(),
      description: description.trim() || undefined
    };

    setIsCreatingContainer(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/v1/containers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const json = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setCreateContainerError(json.detail || 'Container number already exists');
          setIsCreatingContainer(false);
          return;
        }
        if (response.status === 422 && Array.isArray(json.detail)) {
          const msgs = json.detail.map((d: any) => d.msg).join('; ');
          setCreateContainerError(msgs || 'Validation error');
          setIsCreatingContainer(false);
          return;
        }
        setCreateContainerError(json.detail || 'Failed to create container');
        setIsCreatingContainer(false);
        return;
      }

      // 201 Created Success
      const createdData = json.data;
      createContainer(
        {
          id: createdData.id || cleanNum,
          containerNumber: createdData.containerNumber || cleanNum,
          type: (createdData.containerType as ContainerType) || containerType,
          maxCapacity: Number(createdData.maximumCapacity || maxCapacity),
          capacityUnit: capacityUnit,
          capacityKg: Number(createdData.maximumCapacity || maxCapacity),
          currentWeightKg: 0,
          utilizedCapacity: 0,
          sealNumber: createdData.tamperEvidentSealNumber || cleanSeal,
          initialLocation: createdData.initialLocation || initialLocation,
          location: createdData.initialLocation || initialLocation,
          description: createdData.description || description.trim(),
          status: 'Active',
          assignedShipmentTracking: 'Unassigned',
          itemCount: 0,
          items: []
        },
        user?.name || 'Dhruva (Owner)',
        role || 'OWNER'
      );

      setCreateContainerSuccess(json.message || 'Container created and initialized successfully');
      setTimeout(() => {
        setIsCreatingContainer(false);
        setCreateModalOpen(false);
      }, 1000);
    } catch (err: any) {
      console.warn('Backend unavailable, falling back to local state:', err);
      // Fallback if offline
      createContainer(
        {
          containerNumber: cleanNum,
          type: containerType,
          maxCapacity: Number(maxCapacity),
          capacityUnit,
          capacityKg: Number(maxCapacity),
          currentWeightKg: 0,
          utilizedCapacity: 0,
          sealNumber: cleanSeal,
          initialLocation,
          location: initialLocation,
          description: description.trim(),
          status: 'Active',
          assignedShipmentTracking: 'Unassigned',
          itemCount: 0,
          items: []
        },
        user?.name || 'Dhruva (Owner)',
        role || 'OWNER'
      );
      setCreateContainerSuccess('Container created locally');
      setTimeout(() => {
        setIsCreatingContainer(false);
        setCreateModalOpen(false);
      }, 1000);
    }
  };

  // Filtered containers
  const filteredContainers = containers.filter(c => {
    const matchesSearch =
      c.containerNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.sealNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.assignedShipmentTracking && c.assignedShipmentTracking.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = typeFilter === 'ALL' || c.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Containers & Tamper-Evident Seals</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
              {containers.length} Registered
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Physical bins, security crates, and RFID pallets with automated continuous OpenCV barcode scanning.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm shadow-indigo-600/30 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Container</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by Container Number, Seal ID, Shipment, or Location..."
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">All Container Types</option>
            {CONTAINER_TYPES.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Containers Grid (Exact Match to Image 2 Dark Theme Aesthetic) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredContainers.map(c => {
          const loadPercent = Math.min(
            100,
            Math.round(((c.currentWeightKg || c.utilizedCapacity || 0) / (c.maxCapacity || c.capacityKg || 150)) * 100)
          );
          const isMenuOpen = activeMenuId === c.id;

          return (
            <div
              key={c.id}
              className="bg-black text-white rounded-2xl border border-neutral-800 p-5 shadow-xl flex flex-col justify-between hover:border-indigo-500/50 transition-all relative"
            >
              <div className="space-y-4">
                {/* Header: Container Icon + Number + 3-Dots Menu */}
                <div className="flex items-start justify-between relative">
                  <div>
                    <div className="flex items-center gap-2">
                      <Archive className="w-5 h-5 text-indigo-400" />
                      <span className="font-mono text-base font-extrabold text-white tracking-wide">
                        {c.containerNumber}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5 font-medium">
                      {c.type}
                    </p>
                  </div>

                  {/* 3-Dots Action Button & Dropdown Menu (Exact match to Image 2) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveMenuId(isMenuOpen ? null : c.id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition cursor-pointer"
                      title="Actions"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                      <div className="absolute right-0 top-8 z-30 w-44 rounded-xl bg-neutral-900 border border-neutral-700/80 shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            setDetailsModalContainer(c);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 rounded-lg transition text-left cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-400" />
                          <span>View Details</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            openScanModalForContainer(c);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-indigo-300 hover:text-white hover:bg-indigo-950/70 border border-indigo-900/40 rounded-lg transition text-left cursor-pointer group"
                        >
                          <Scan className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                          <span>Scan Products</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            setEditModalContainer(c);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 rounded-lg transition text-left cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            toggleContainerStatus(c.id, user?.name, role || undefined);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 rounded-lg transition text-left cursor-pointer"
                        >
                          <Ban className="w-3.5 h-3.5 text-rose-400" />
                          <span>{c.isActive === false || c.status === 'Inactive' ? 'Mark Active' : 'Mark Inactive'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tamper Seal Section (Exact match to Image 2) */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400 font-medium">Tamper Seal</span>
                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
                      {c.sealStatus || 'Active'}
                    </span>
                  </div>
                  <div className="font-mono text-sm font-extrabold text-white tracking-wide">
                    {c.sealNumber}
                  </div>
                </div>

                {/* Divider Line */}
                <div className="border-t border-neutral-800/80" />

                {/* Capacity Utilized & Progress Bar (Exact match to Image 2) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-300 font-medium">Capacity Utilized</span>
                    <span className="font-mono font-bold text-white">
                      {(c.currentWeightKg || c.utilizedCapacity || 0).toFixed(1)} {c.capacityUnit || 'kg'} /{' '}
                      {c.maxCapacity || c.capacityKg || 150} {c.capacityUnit || 'kg'}
                    </span>
                  </div>

                  <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        loadPercent > 90
                          ? 'bg-rose-500'
                          : loadPercent > 70
                          ? 'bg-amber-400'
                          : 'bg-indigo-600'
                      }`}
                      style={{ width: `${loadPercent}%` }}
                    />
                  </div>
                </div>

                {/* Key Metrics: Shipment, Current Location, Items Loaded */}
                <div className="text-xs space-y-2 pt-1 font-medium">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Shipment</span>
                    <span className="font-mono font-bold text-neutral-200">
                      {c.assignedShipmentTracking || 'Unassigned'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Current Location</span>
                    <span className="font-semibold text-neutral-200 text-right truncate max-w-[190px]">
                      {c.location || c.initialLocation}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Items Loaded</span>
                    <span className="font-mono font-bold text-white">
                      {c.itemCount || (c.items ? c.items.reduce((s, i) => s + i.quantity, 0) : 0)} units
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Footer: Container ID + Enabled / Active Badge */}
              <div className="mt-5 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                <span className="font-mono text-neutral-400 text-[11px]">
                  {c.containerNumber}
                </span>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    c.isActive === false || c.status === 'Inactive'
                      ? 'bg-neutral-800 text-neutral-400'
                      : 'bg-neutral-800 text-neutral-200'
                  }`}
                >
                  {c.isActive === false || c.status === 'Inactive' ? 'Inactive' : 'Enabled'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredContainers.length === 0 && (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <Archive className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No Containers Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            No transport containers match your search criteria. Click "+ Add Container" above to provision one.
          </p>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ADD CONTAINER WITH OPENCV BARCODE SCANNER       */}
      {/* ======================================================== */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl text-white overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                  <Archive className="w-5 h-5 text-indigo-400" />
                  <span>Provision New Container</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure container parameters, capacity, and tamper-evident seal tracking.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {createContainerError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-xs text-rose-300 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{createContainerError}</span>
                </div>
              )}

              {createContainerSuccess && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{createContainerSuccess}</span>
                </div>
              )}

              {/* CONTAINER INFORMATION */}
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs sm:text-sm font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                    <span>Container Information</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleAutoFill}
                    className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Auto-Generate Info</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Container Number */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Container Number <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={containerNumber}
                      onChange={e => setContainerNumber(e.target.value)}
                      placeholder="e.g. CNT-ALPHA-881"
                      className="w-full px-3.5 py-2 text-xs sm:text-sm font-mono uppercase bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                  </div>

                  {/* Container Type Dropdown */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Container Type <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={containerType}
                      onChange={e => setContainerType(e.target.value as ContainerType)}
                      className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    >
                      {CONTAINER_TYPES.map(t => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Maximum Capacity & Unit */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Maximum Capacity <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={maxCapacity}
                      onChange={e => setMaxCapacity(Number(e.target.value))}
                      placeholder="150"
                      className="w-full px-3.5 py-2 text-xs sm:text-sm font-mono bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Capacity Unit <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={capacityUnit}
                      onChange={e => setCapacityUnit(e.target.value as 'kg' | 'lbs' | 'units')}
                      className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    >
                      <option value="kg">Kilograms (kg)</option>
                      <option value="lbs">Pounds (lbs)</option>
                      <option value="units">Discrete Units (count)</option>
                    </select>
                  </div>

                  {/* Tamper-Evident Seal Number */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Tamper-Evident Seal Number <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={sealNumber}
                      onChange={e => setSealNumber(e.target.value)}
                      placeholder="e.g. SEAL-SEC-99014"
                      className="w-full px-3.5 py-2 text-xs sm:text-sm font-mono uppercase bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                  </div>

                  {/* Initial Location Dropdown */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Initial Location <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={initialLocation}
                      onChange={e => setInitialLocation(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    >
                      {WAREHOUSE_LOCATIONS.map(loc => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Description / Handling Instructions (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Temperature control specifics, hazardous handling notes, or route requirements..."
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-y"
                  />
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingContainer}
                  className="px-6 py-2.5 text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer flex items-center gap-2"
                >
                  {isCreatingContainer ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Initializing Container...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Create & Initialize Container</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CONTAINER DETAILS MODAL                         */}
      {/* ======================================================== */}
      {detailsModalContainer && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl text-white space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Archive className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-lg font-mono font-extrabold text-white">
                    {detailsModalContainer.containerNumber}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                    {detailsModalContainer.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {detailsModalContainer.type} • ID: {detailsModalContainer.id}
                </p>
              </div>

              <button
                onClick={() => setDetailsModalContainer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500 font-medium block">Tamper-Evident Seal</span>
                <span className="font-mono font-bold text-white text-sm">
                  {detailsModalContainer.sealNumber}
                </span>
              </div>

              <div>
                <span className="text-slate-500 font-medium block">Capacity</span>
                <span className="font-mono font-bold text-white text-sm">
                  {(detailsModalContainer.currentWeightKg || detailsModalContainer.utilizedCapacity || 0).toFixed(1)} /{' '}
                  {detailsModalContainer.maxCapacity || detailsModalContainer.capacityKg} {detailsModalContainer.capacityUnit || 'kg'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 font-medium block">Assigned Shipment</span>
                <span className="font-mono font-bold text-indigo-400">
                  {detailsModalContainer.assignedShipmentTracking || 'Unassigned'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 font-medium block">Current Location</span>
                <span className="font-semibold text-slate-200">
                  {detailsModalContainer.location}
                </span>
              </div>

              <div>
                <span className="text-slate-500 font-medium block">Created At</span>
                <span className="font-mono text-slate-300">
                  {detailsModalContainer.createdAt ? new Date(detailsModalContainer.createdAt).toLocaleString() : 'N/A'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 font-medium block">Created By</span>
                <span className="font-semibold text-slate-300">
                  {detailsModalContainer.createdBy}
                </span>
              </div>
            </div>

            {/* Loaded Products Itemized List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Loaded Items ({detailsModalContainer.items?.length || 0})</span>
                <span className="text-slate-400">
                  {detailsModalContainer.itemCount || 0} Total Units
                </span>
              </h4>

              {(!detailsModalContainer.items || detailsModalContainer.items.length === 0) ? (
                <div className="p-4 text-center rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-500">
                  No scanned products recorded in this container.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {detailsModalContainer.items.map((it, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-white">{it.productName}</div>
                        <div className="font-mono text-[10.5px] text-slate-400">
                          SKU: {it.sku} • BC: {it.barcode}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-white">
                          {it.quantity} units
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {it.weightKg.toFixed(1)} kg
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDetailsModalContainer(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: EDIT CONTAINER MODAL                            */}
      {/* ======================================================== */}
      {editModalContainer && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl text-white space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-amber-400" />
              <span>Edit Container {editModalContainer.containerNumber}</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Location
                </label>
                <select
                  defaultValue={editModalContainer.location}
                  id="edit-location-select"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                >
                  {WAREHOUSE_LOCATIONS.map(loc => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Tamper Seal ID
                </label>
                <input
                  type="text"
                  defaultValue={editModalContainer.sealNumber}
                  id="edit-seal-input"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  defaultValue={editModalContainer.description || ''}
                  id="edit-desc-input"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setEditModalContainer(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const locEl = document.getElementById('edit-location-select') as HTMLSelectElement;
                  const sealEl = document.getElementById('edit-seal-input') as HTMLInputElement;
                  const descEl = document.getElementById('edit-desc-input') as HTMLTextAreaElement;

                  updateContainer(
                    editModalContainer.id,
                    {
                      location: locEl?.value || editModalContainer.location,
                      sealNumber: sealEl?.value || editModalContainer.sealNumber,
                      description: descEl?.value || editModalContainer.description
                    },
                    user?.name || 'Dhruva (Owner)',
                    role || 'OWNER'
                  );
                  setEditModalContainer(null);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ======================================================== */}
      {/* MODAL 4: OPENCV SCAN PRODUCTS MODAL (FROM CARD MENU)     */}
      {/* ======================================================== */}
      {scanModalContainer && (() => {
        const maxCap = scanModalContainer.maxCapacity || scanModalContainer.capacityKg || 150;
        const currentUtilized = containerScanItems.reduce(
          (acc, i) => acc + (i.weightKg || i.unitWeightKg * i.quantity),
          0
        );
        const totalUnits = containerScanItems.reduce((acc, i) => acc + i.quantity, 0);
        const percent = Math.min(100, Math.round((currentUtilized / maxCap) * 100));

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl text-white overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Scan className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-base sm:text-lg font-mono font-extrabold text-white tracking-wide">
                      Scan Products into {scanModalContainer.containerNumber}
                    </h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-700 text-indigo-300 font-bold">
                      {scanModalContainer.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>Tamper Seal: <span className="font-mono text-slate-300">{scanModalContainer.sealNumber}</span></span>
                    <span>•</span>
                    <span>Location: {scanModalContainer.location}</span>
                    <span>•</span>
                    <span className="text-indigo-400 font-bold">Capacity: {currentUtilized.toFixed(1)} / {maxCap} {scanModalContainer.capacityUnit || 'kg'} ({percent}% Full)</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setScanModalContainer(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">

                {/* Capacity Error Notification Banner */}
                {containerScanError && (
                  <div className="p-3.5 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{containerScanError}</span>
                  </div>
                )}

                {/* 1. SELECT PRODUCT IN UI (Fast Direct Catalog Picker) */}
                <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-indigo-950/40 p-4 sm:p-5 rounded-2xl border border-indigo-800/60 shadow-lg space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <span>Select Product in UI to Pack</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300 font-bold">
                            Direct Catalog Picker
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Choose any product from your master catalog to pack directly into this container.
                        </p>
                      </div>
                    </div>

                    {scanApiSuccess && (
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 animate-in fade-in">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>{scanApiSuccess}</span>
                      </span>
                    )}
                  </div>

                  {/* Dropdown + Quantity + Pack Button */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <div className="relative flex-1">
                      <select
                        value={selectedCatalogBarcode || (products[0]?.barcode || '')}
                        onChange={(e) => setSelectedCatalogBarcode(e.target.value)}
                        className="w-full bg-slate-950 border border-indigo-700/60 focus:border-indigo-400 rounded-xl px-3.5 py-2.5 text-xs text-white font-medium focus:outline-none transition cursor-pointer"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.barcode} className="bg-slate-900 text-white">
                            {p.name} — SKU: {p.sku} | Barcode: {p.barcode} ({getProductUnitWeight(p)} kg)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity Picker */}
                    <div className="flex items-center bg-slate-950 border border-slate-700 rounded-xl px-2 py-1">
                      <button
                        type="button"
                        onClick={() => setSelectedPackQuantity(Math.max(1, selectedPackQuantity - 1))}
                        className="px-2 py-1 text-slate-400 hover:text-white font-bold text-sm cursor-pointer"
                      >
                        -
                      </button>
                      <span className="px-2 font-mono text-xs font-bold text-white min-w-[28px] text-center">
                        {selectedPackQuantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedPackQuantity(selectedPackQuantity + 1)}
                        className="px-2 py-1 text-slate-400 hover:text-white font-bold text-sm cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    {/* Pack Button */}
                    <button
                      type="button"
                      disabled={isScanningApi || products.length === 0}
                      onClick={async () => {
                        const bc = selectedCatalogBarcode || products[0]?.barcode;
                        if (!bc) return;
                        for (let q = 0; q < selectedPackQuantity; q++) {
                          await addBarcode(scanModalContainer.containerNumber, bc);
                        }
                      }}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-indigo-600/30 whitespace-nowrap"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>{isScanningApi ? 'Packing...' : `Pack ${selectedPackQuantity > 1 ? `${selectedPackQuantity} Units` : 'Product'}`}</span>
                    </button>
                  </div>

                  {/* 1-Click Quick Pack Catalog Chips */}
                  <div className="pt-1">
                    <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
                      <span>Click Any Product to Quick-Pack into Container:</span>
                      <span className="text-[10px] text-slate-500">{products.length} catalog items</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
                      {products.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => addBarcode(scanModalContainer.containerNumber, p.barcode)}
                          className="p-2 rounded-xl bg-slate-900/90 hover:bg-indigo-950/70 border border-slate-800 hover:border-indigo-600/60 text-left transition flex items-center justify-between gap-2 group cursor-pointer"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white group-hover:text-indigo-300 truncate">
                              {p.name}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 truncate">
                              {p.barcode} • {getProductUnitWeight(p)}kg
                            </div>
                          </div>
                          <span className="px-2 py-1 rounded-lg bg-indigo-600/20 group-hover:bg-indigo-600 text-indigo-300 group-hover:text-white text-[10px] font-bold shrink-0 transition">
                            + Add
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. OpenCV Camera Barcode Scanner Component */}
                <div className="bg-slate-950/70 p-4 sm:p-5 rounded-2xl border border-slate-800">
                  <OpenCvBarcodeScanner
                    onScan={handleContainerBarcodeScan}
                    isScanning={isContainerScanning}
                    onToggleScanning={setIsContainerScanning}
                    simulationProducts={simulationProducts}
                  />
                </div>

                {/* 2.5 Manual Barcode Scanner & "Add Code" Button */}
                <div className="bg-slate-950/70 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label htmlFor="manual-barcode-input" className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Scan className="w-4 h-4 text-indigo-400" />
                      <span>Barcode Scanner API / Manual Code Entry</span>
                    </label>
                    {scanApiSuccess && (
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 animate-in fade-in">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>{scanApiSuccess}</span>
                      </span>
                    )}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (barcodeInput.trim()) {
                        addBarcode(scanModalContainer.containerNumber, barcodeInput.trim());
                      }
                    }}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                  >
                    <div className="relative flex-1">
                      <input
                        id="manual-barcode-input"
                        type="text"
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        placeholder="Scan or enter product barcode e.g. BC-MED-CRYO-0001 or 8901063139374..."
                        className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-hidden transition shadow-inner"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isScanningApi || !barcodeInput.trim()}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-indigo-600/30"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{isScanningApi ? 'Scanning...' : 'Add Code'}</span>
                    </button>
                  </form>

                  {/* Quick-test barcode presets from product master */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-400">
                    <span className="text-slate-500 font-semibold">Quick Test Barcodes:</span>
                    <button
                      type="button"
                      onClick={() => addBarcode(scanModalContainer.containerNumber, '8901063139374')}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500 text-indigo-300 font-mono transition cursor-pointer"
                      title="Scan Copper Wire (8901063139374)"
                    >
                      8901063139374 (Copper Wire)
                    </button>
                    <button
                      type="button"
                      onClick={() => addBarcode(scanModalContainer.containerNumber, '8901063139375')}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500 text-indigo-300 font-mono transition cursor-pointer"
                      title="Scan Switch (8901063139375)"
                    >
                      8901063139375 (Switch)
                    </button>
                    <button
                      type="button"
                      onClick={() => addBarcode(scanModalContainer.containerNumber, 'BC-MED-CRYO-0001')}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500 text-indigo-300 font-mono transition cursor-pointer"
                      title="Scan Cryo Array (BC-MED-CRYO-0001)"
                    >
                      BC-MED-CRYO-0001 (Cryo Array)
                    </button>
                    <button
                      type="button"
                      onClick={() => addBarcode(scanModalContainer.containerNumber, 'BC-BIO-DIAG-0002')}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500 text-indigo-300 font-mono transition cursor-pointer"
                      title="Scan Bio Reagent (BC-BIO-DIAG-0002)"
                    >
                      BC-BIO-DIAG-0002 (Bio Reagent)
                    </button>
                    <button
                      type="button"
                      onClick={() => addBarcode(scanModalContainer.containerNumber, 'BC-PHRM-COLD-0003')}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500 text-indigo-300 font-mono transition cursor-pointer"
                      title="Scan Insulin Vial (BC-PHRM-COLD-0003)"
                    >
                      BC-PHRM-COLD-0003 (Insulin Vial)
                    </button>
                    <button
                      type="button"
                      onClick={() => addBarcode(scanModalContainer.containerNumber, 'BC-APL-001')}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500 text-indigo-300 font-mono transition cursor-pointer"
                      title="Scan Apollo Sensor (BC-APL-001)"
                    >
                      BC-APL-001 (Apollo Sensor)
                    </button>
                  </div>
                </div>

                {/* 3. Loaded Products in this Container (with "remove in UI please :>") */}
                <div className="bg-slate-950/70 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Package className="w-4 h-4 text-indigo-400" />
                      <span>
                        Products in {scanModalContainer.containerNumber} ({containerScanItems.length} lines • {totalUnits} units)
                      </span>
                    </h4>

                    {containerScanItems.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setContainerScanItems([]);
                          updateContainer(
                            scanModalContainer.id,
                            { items: [] },
                            user?.name || 'Dhruva (Owner)',
                            role || undefined
                          );
                        }}
                        className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                      >
                        Clear Container
                      </button>
                    )}
                  </div>

                  {containerScanItems.length === 0 ? (
                    <div className="p-6 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/40 text-slate-400 text-xs">
                      No products loaded into this container yet. Start the scanner above or enter barcode numbers manually below.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-bold">
                          <tr>
                            <th className="px-3.5 py-2.5">Product Name</th>
                            <th className="px-3.5 py-2.5">SKU / Barcode</th>
                            <th className="px-3.5 py-2.5 text-center">Quantity</th>
                            <th className="px-3.5 py-2.5 text-right">Total Weight</th>
                            <th className="px-3.5 py-2.5 text-center">Remove Item</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {containerScanItems.map(item => (
                            <tr key={item.productId} className="hover:bg-slate-800/40 transition">
                              <td className="px-3.5 py-2.5 font-bold text-white">
                                {item.productName}
                              </td>
                              <td className="px-3.5 py-2.5 font-mono text-slate-400 text-[11px]">
                                {item.sku}
                                <span className="block text-[10px] text-slate-500 font-mono">
                                  {item.barcode}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleAdjustContainerItemQty(item.productId, -1)}
                                    className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center transition cursor-pointer"
                                    title="Decrease quantity"
                                  >
                                    -
                                  </button>
                                  <span className="font-mono font-bold text-white min-w-[20px] text-center">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleAdjustContainerItemQty(item.productId, 1)}
                                    className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center transition cursor-pointer"
                                    title="Increase quantity"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-mono font-bold text-white">
                                {item.weightKg.toFixed(1)} {scanModalContainer.capacityUnit || 'kg'}
                                <span className="block text-[10px] text-slate-500 font-normal">
                                  {item.unitWeightKg} {scanModalContainer.capacityUnit || 'kg'}/ea
                                </span>
                              </td>
                              {/* Remove in UI action button ("remove in UI please :>") */}
                              <td className="px-3.5 py-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveContainerItem(item.productId)}
                                  className="p-1.5 rounded-lg text-rose-400 hover:text-white hover:bg-rose-950/80 border border-transparent hover:border-rose-800 transition cursor-pointer"
                                  title="Remove product from container"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-800 flex items-center justify-between bg-slate-950">
                <span className="text-xs text-slate-400">
                  All changes are automatically synced to container manifest.
                </span>

                <button
                  type="button"
                  onClick={() => setScanModalContainer(null)}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                >
                  Done & Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
