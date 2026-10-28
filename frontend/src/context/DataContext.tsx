import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  Product,
  Container,
  Shipment,
  DiscrepancyCase,
  ReturnCase,
  CustomerResolutionChoice,
  AuditEvent,
  ScanRecord,
  DiscrepancyStatus,
  UserRole
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_CONTAINERS,
  INITIAL_SHIPMENTS,
  INITIAL_DISCREPANCIES,
  INITIAL_RETURNS,
  INITIAL_AUDIT_LOGS,
  INITIAL_SCAN_RECORDS
} from '../data/mockData';

interface ScanValidationResult {
  valid: boolean;
  type: 'Product' | 'Container' | 'Seal' | 'Unknown';
  result: 'Expected Match' | 'Duplicate Attempt' | 'Unexpected Product' | 'Wrong Container' | 'Damaged Reported';
  message: string;
  matchedProduct?: Product;
  matchedContainer?: Container;
  matchedShipment?: Shipment;
}

interface DataContextType {
  products: Product[];
  containers: Container[];
  shipments: Shipment[];
  discrepancies: DiscrepancyCase[];
  returns: ReturnCase[];
  auditLogs: AuditEvent[];
  scanRecords: ScanRecord[];
  
  // Actions
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>, actorName: string, role: UserRole) => Product;
  updateProduct: (id: string, updates: Partial<Product>, actorName: string, role: UserRole) => void;
  deleteProduct: (id: string, actorName: string, role: UserRole) => void;
  createContainer: (container: Omit<Container, 'id' | 'status' | 'currentWeightKg' | 'itemCount'>, actorName: string, role: UserRole) => Container;
  createShipment: (shipmentData: Partial<Shipment>, actorName: string, role: UserRole) => Shipment;
  dispatchShipment: (shipmentId: string, actorName: string, role: UserRole) => boolean;
  receiveShipment: (shipmentId: string, actorName: string, role: UserRole) => boolean;
  processScan: (
    code: string,
    activeShipmentId?: string,
    activeContainerId?: string,
    actorName?: string,
    role?: UserRole
  ) => ScanValidationResult;
  reportDiscrepancy: (discrepancy: Omit<DiscrepancyCase, 'id' | 'discrepancyNumber' | 'detectedAt' | 'updatedAt'>, actorName: string, role: UserRole) => DiscrepancyCase;
  updateDiscrepancyStatus: (id: string, status: DiscrepancyStatus, notes: string, outcome?: DiscrepancyCase['resolutionOutcome'], actorName?: string, role?: UserRole) => void;
  confirmCustomerDelivery: (shipmentId: string, actorName: string, notes: string) => void;
  createReturnRequest: (returnData: Omit<ReturnCase, 'id' | 'returnNumber' | 'status' | 'requestedAt' | 'updatedAt'>, actorName: string) => ReturnCase;
  updateReturnStatus: (id: string, status: ReturnCase['status'], inspectionNotes?: string, quarantineLoc?: string, actorName?: string) => void;
  setCustomerReturnChoice: (id: string, choice: CustomerResolutionChoice, actorName?: string) => void;
  inspectAndVerifyReturn: (id: string, diagnosis: string, notes: string, quarantineLoc: string, actorName?: string) => void;
  processReturnResolution: (
    id: string,
    resolution: CustomerResolutionChoice,
    details?: { replacementShipmentTracking?: string; refundReference?: string; refundAmount?: number },
    actorName?: string
  ) => void;
  resetDemoData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() => {
    const s = localStorage.getItem('dharm_products_v3');
    if (s) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length >= INITIAL_PRODUCTS.length) {
          return parsed;
        }
      } catch (e) {
        console.error(e);
      }
    }
    // Clean up older stale storage key if present
    localStorage.removeItem('dharm_products');
    return INITIAL_PRODUCTS;
  });

  const [containers, setContainers] = useState<Container[]>(() => {
    const s = localStorage.getItem('dharm_containers_v7');
    if (s) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length >= INITIAL_CONTAINERS.length) return parsed;
      } catch {}
    }
    localStorage.removeItem('dharm_containers');
    return INITIAL_CONTAINERS;
  });

  const [shipments, setShipments] = useState<Shipment[]>(() => {
    const s = localStorage.getItem('dharm_shipments_v7');
    if (s) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length >= INITIAL_SHIPMENTS.length) return parsed;
      } catch {}
    }
    localStorage.removeItem('dharm_shipments');
    return INITIAL_SHIPMENTS;
  });

  const [discrepancies, setDiscrepancies] = useState<DiscrepancyCase[]>(() => {
    const s = localStorage.getItem('dharm_discrepancies_v7');
    if (s) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length >= INITIAL_DISCREPANCIES.length) return parsed;
      } catch {}
    }
    localStorage.removeItem('dharm_discrepancies');
    return INITIAL_DISCREPANCIES;
  });

  const [returns, setReturns] = useState<ReturnCase[]>(() => {
    const s = localStorage.getItem('dharm_returns_v7');
    if (s) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length >= INITIAL_RETURNS.length) return parsed;
      } catch {}
    }
    localStorage.removeItem('dharm_returns_v6');
    localStorage.removeItem('dharm_returns_v3');
    localStorage.removeItem('dharm_returns');
    return INITIAL_RETURNS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>(() => {
    const s = localStorage.getItem('dharm_audit_v7');
    if (s) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length >= INITIAL_AUDIT_LOGS.length) return parsed;
      } catch {}
    }
    localStorage.removeItem('dharm_audit');
    return INITIAL_AUDIT_LOGS;
  });

  const [scanRecords, setScanRecords] = useState<ScanRecord[]>(() => {
    const s = localStorage.getItem('dharm_scans_v7');
    if (s) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length >= INITIAL_SCAN_RECORDS.length) return parsed;
      } catch {}
    }
    localStorage.removeItem('dharm_scans');
    return INITIAL_SCAN_RECORDS;
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('dharm_products_v3', JSON.stringify(products));
    localStorage.setItem('dharm_products', JSON.stringify(products));
  }, [products]);
  useEffect(() => {
    localStorage.setItem('dharm_containers_v7', JSON.stringify(containers));
    localStorage.setItem('dharm_containers', JSON.stringify(containers));
  }, [containers]);
  useEffect(() => {
    localStorage.setItem('dharm_shipments_v7', JSON.stringify(shipments));
    localStorage.setItem('dharm_shipments', JSON.stringify(shipments));
  }, [shipments]);
  useEffect(() => {
    localStorage.setItem('dharm_discrepancies_v7', JSON.stringify(discrepancies));
    localStorage.setItem('dharm_discrepancies', JSON.stringify(discrepancies));
  }, [discrepancies]);
  useEffect(() => {
    localStorage.setItem('dharm_returns_v7', JSON.stringify(returns));
    localStorage.setItem('dharm_returns', JSON.stringify(returns));
  }, [returns]);
  useEffect(() => {
    localStorage.setItem('dharm_audit_v7', JSON.stringify(auditLogs));
    localStorage.setItem('dharm_audit', JSON.stringify(auditLogs));
  }, [auditLogs]);
  useEffect(() => {
    localStorage.setItem('dharm_scans_v7', JSON.stringify(scanRecords));
    localStorage.setItem('dharm_scans', JSON.stringify(scanRecords));
  }, [scanRecords]);

  const logAudit = (
    actorName: string,
    actorRole: UserRole,
    action: string,
    entityType: AuditEvent['entityType'],
    entityId: string,
    details: string
  ) => {
    const event: AuditEvent = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      actorName,
      actorRole,
      action,
      entityType,
      entityId,
      details
    };
    setAuditLogs(prev => [event, ...prev]);
  };

  const addProduct = (
    data: Omit<Product, 'id' | 'createdAt'>,
    actorName: string,
    role: UserRole
  ): Product => {
    const newProd: Product = {
      ...data,
      id: `prod-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setProducts(prev => [newProd, ...prev]);
    logAudit(actorName, role, 'PRODUCT_REGISTERED', 'Product', newProd.id, `Registered SKU: ${newProd.sku} (${newProd.name}) with stock: ${newProd.stockQuantity}`);
    return newProd;
  };

  const updateProduct = (
    id: string,
    updates: Partial<Product>,
    actorName: string,
    role: UserRole
  ) => {
    setProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, ...updates } : p))
    );
    logAudit(actorName, role, 'PRODUCT_REGISTERED', 'Product', id, `Updated product catalog details for SKU: ${updates.sku || id}`);
  };

  const deleteProduct = (
    id: string,
    actorName: string,
    role: UserRole
  ) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    logAudit(actorName, role, 'PRODUCT_REGISTERED', 'Product', id, `Archived/Removed product catalog ID: ${id}`);
  };

  const createContainer = (
    data: Omit<Container, 'id' | 'status' | 'currentWeightKg' | 'itemCount'>,
    actorName: string,
    role: UserRole
  ): Container => {
    const newCont: Container = {
      ...data,
      id: `cnt-${Date.now()}`,
      status: 'Empty',
      currentWeightKg: 0,
      itemCount: 0
    };
    setContainers(prev => [newCont, ...prev]);
    logAudit(actorName, role, 'CONTAINER_CREATED', 'Container', newCont.id, `Created container ${newCont.containerNumber} (${newCont.type}) with seal ${newCont.sealNumber}`);
    return newCont;
  };

  const createShipment = (
    shipmentData: Partial<Shipment>,
    actorName: string,
    role: UserRole
  ): Shipment => {
    const tracking = `TRK-DHM-${Math.floor(100000 + Math.random() * 900000)}`;
    const hash = `sha256-${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    const newShip: Shipment = {
      id: `shp-${Date.now()}`,
      trackingNumber: tracking,
      ownerId: 'usr-owner-01',
      ownerName: 'Dhruva (Owner)',
      vendorId: 'usr-vendor-02',
      vendorName: 'Sinu Gunshetty (Trans-Express)',
      customerId: 'usr-cust-03',
      customerName: 'Anusha S (BioMed)',
      origin: shipmentData.origin || 'Apex Central Logistics Hub',
      destination: shipmentData.destination || 'BioMed Advanced Research Campus',
      status: 'Draft',
      items: shipmentData.items || [],
      containerIds: shipmentData.containerIds || [],
      manifestHash: hash,
      dispatchDate: shipmentData.dispatchDate,
      estimatedDelivery: shipmentData.estimatedDelivery,
      events: [
        {
          id: `ev-${Date.now()}`,
          timestamp: new Date().toISOString(),
          status: 'Draft',
          location: shipmentData.origin || 'Apex Central Logistics Hub',
          performedBy: actorName,
          notes: 'Shipment manifest drafted with verified cryptographic hash.'
        }
      ],
      notes: shipmentData.notes
    };
    setShipments(prev => [newShip, ...prev]);
    logAudit(actorName, role, 'SHIPMENT_CREATED', 'Shipment', newShip.id, `Created manifest for tracking ${newShip.trackingNumber} with ${newShip.items.length} product lines`);
    return newShip;
  };

  const dispatchShipment = (shipmentId: string, actorName: string, role: UserRole): boolean => {
    let success = false;
    setShipments(prev =>
      prev.map(shp => {
        if (shp.id === shipmentId) {
          success = true;
          return {
            ...shp,
            status: 'Dispatched',
            dispatchDate: new Date().toISOString(),
            events: [
              ...shp.events,
              {
                id: `ev-${Date.now()}`,
                timestamp: new Date().toISOString(),
                status: 'Dispatched',
                location: shp.origin,
                performedBy: actorName,
                notes: 'Shipment dispatched with manifest locked. Transfer initiated to Vendor.'
              }
            ]
          };
        }
        return shp;
      })
    );
    if (success) {
      logAudit(actorName, role, 'SHIPMENT_DISPATCHED', 'Shipment', shipmentId, `Shipment dispatched to carrier with immutable manifest.`);
    }
    return success;
  };

  const receiveShipment = (shipmentId: string, actorName: string, role: UserRole): boolean => {
    let success = false;
    setShipments(prev =>
      prev.map(shp => {
        if (shp.id === shipmentId) {
          success = true;
          return {
            ...shp,
            status: 'Received',
            events: [
              ...shp.events,
              {
                id: `ev-${Date.now()}`,
                timestamp: new Date().toISOString(),
                status: 'Received',
                location: 'Midwest Sorting Hub 4',
                performedBy: actorName,
                notes: 'Shipment scanned and logged at Vendor cross-dock.'
              }
            ]
          };
        }
        return shp;
      })
    );
    if (success) {
      logAudit(actorName, role, 'SHIPMENT_RECEIVED', 'Shipment', shipmentId, `Vendor logged shipment physical handover at arrival bay.`);
    }
    return success;
  };

  const processScan = (
    code: string,
    activeShipmentId?: string,
    activeContainerId?: string,
    actorName: string = 'Operator',
    role: UserRole = 'VENDOR'
  ): ScanValidationResult => {
    const cleanCode = code.trim();
    const now = new Date().toISOString();

    // 1. Check duplicate scan within last 10 seconds for same code
    const recentDuplicate = scanRecords.find(
      r => r.scannedCode === cleanCode && Date.now() - new Date(r.scannedAt).getTime() < 8000
    );

    if (recentDuplicate) {
      const rec: ScanRecord = {
        id: `scn-${Date.now()}`,
        scannedCode: cleanCode,
        scannedAt: now,
        scannedBy: actorName,
        role,
        shipmentId: activeShipmentId,
        containerId: activeContainerId,
        type: 'Product',
        result: 'Duplicate Attempt',
        notes: 'Debounced duplicate scan rejected within 8s window.'
      };
      setScanRecords(prev => [rec, ...prev]);
      return {
        valid: false,
        type: 'Product',
        result: 'Duplicate Attempt',
        message: `⚠️ Duplicate scan ignored! Barcode ${cleanCode} was already registered moments ago.`
      };
    }

    // 2. Check if it's a container code
    const matchedContainer = containers.find(
      c => c.containerNumber.toLowerCase() === cleanCode.toLowerCase() || c.sealNumber.toLowerCase() === cleanCode.toLowerCase()
    );

    if (matchedContainer) {
      const rec: ScanRecord = {
        id: `scn-${Date.now()}`,
        scannedCode: cleanCode,
        scannedAt: now,
        scannedBy: actorName,
        role,
        shipmentId: activeShipmentId,
        containerId: matchedContainer.id,
        type: 'Container',
        result: 'Expected Match',
        notes: `Container verified: ${matchedContainer.containerNumber} (${matchedContainer.type})`
      };
      setScanRecords(prev => [rec, ...prev]);
      logAudit(actorName, role, 'CONTAINER_SCANNED', 'Container', matchedContainer.id, `Container ${matchedContainer.containerNumber} verified by scanner.`);
      return {
        valid: true,
        type: 'Container',
        result: 'Expected Match',
        message: `✅ Container ${matchedContainer.containerNumber} verified! Seal: ${matchedContainer.sealNumber}`,
        matchedContainer
      };
    }

    // 3. Check if it's a known product
    const matchedProduct = products.find(
      p => p.barcode.toLowerCase() === cleanCode.toLowerCase() || p.sku.toLowerCase() === cleanCode.toLowerCase()
    );

    if (!matchedProduct) {
      const rec: ScanRecord = {
        id: `scn-${Date.now()}`,
        scannedCode: cleanCode,
        scannedAt: now,
        scannedBy: actorName,
        role,
        shipmentId: activeShipmentId,
        containerId: activeContainerId,
        type: 'Unknown',
        result: 'Unexpected Product',
        notes: 'Barcode not found in catalog or manifest.'
      };
      setScanRecords(prev => [rec, ...prev]);
      return {
        valid: false,
        type: 'Unknown',
        result: 'Unexpected Product',
        message: `❌ Unknown Barcode: ${cleanCode}. Product is not recognized in the system catalog!`
      };
    }

    // 4. Validate against active shipment manifest if one is selected
    if (activeShipmentId) {
      const shipment = shipments.find(s => s.id === activeShipmentId);
      if (shipment) {
        const itemLineIndex = shipment.items.findIndex(
          i => i.productId === matchedProduct.id || i.barcode === matchedProduct.barcode
        );

        if (itemLineIndex === -1) {
          // Unexpected item in this shipment!
          const rec: ScanRecord = {
            id: `scn-${Date.now()}`,
            scannedCode: cleanCode,
            scannedAt: now,
            scannedBy: actorName,
            role,
            shipmentId: activeShipmentId,
            containerId: activeContainerId,
            type: 'Product',
            result: 'Unexpected Product',
            notes: `Product ${matchedProduct.sku} not present on manifest for shipment ${shipment.trackingNumber}`
          };
          setScanRecords(prev => [rec, ...prev]);
          return {
            valid: false,
            type: 'Product',
            result: 'Unexpected Product',
            message: `⚠️ Unmanifested item! SKU ${matchedProduct.sku} belongs to catalog but is NOT listed on shipment ${shipment.trackingNumber}.`,
            matchedProduct,
            matchedShipment: shipment
          };
        }

        const itemLine = shipment.items[itemLineIndex];

        // Check if assigned container matches
        if (activeContainerId && itemLine.containerId && itemLine.containerId !== activeContainerId) {
          const rec: ScanRecord = {
            id: `scn-${Date.now()}`,
            scannedCode: cleanCode,
            scannedAt: now,
            scannedBy: actorName,
            role,
            shipmentId: activeShipmentId,
            containerId: activeContainerId,
            type: 'Product',
            result: 'Wrong Container',
            notes: `Item expected in container ${itemLine.containerNumber}, scanned in ${activeContainerId}`
          };
          setScanRecords(prev => [rec, ...prev]);
          return {
            valid: false,
            type: 'Product',
            result: 'Wrong Container',
            message: `⚠️ Wrong Container: ${matchedProduct.name} belongs to ${itemLine.containerNumber}, not current container!`,
            matchedProduct,
            matchedShipment: shipment
          };
        }

        // Increment verified count on shipment
        setShipments(prev =>
          prev.map(s => {
            if (s.id === activeShipmentId) {
              const updatedItems = [...s.items];
              const target = { ...updatedItems[itemLineIndex] };
              target.scannedQuantity = (target.scannedQuantity || 0) + 1;
              target.verifiedQuantity = (target.verifiedQuantity || 0) + 1;
              if (target.verifiedQuantity === target.expectedQuantity) {
                target.status = 'Verified';
              } else if (target.verifiedQuantity > target.expectedQuantity) {
                target.status = 'Mismatch';
              }
              updatedItems[itemLineIndex] = target;
              return { ...s, items: updatedItems };
            }
            return s;
          })
        );
      }
    }

    // Normal successful match
    const rec: ScanRecord = {
      id: `scn-${Date.now()}`,
      scannedCode: cleanCode,
      scannedAt: now,
      scannedBy: actorName,
      role,
      shipmentId: activeShipmentId,
      containerId: activeContainerId,
      type: 'Product',
      result: 'Expected Match',
      notes: `Verified 1x unit of ${matchedProduct.name}`
    };
    setScanRecords(prev => [rec, ...prev]);
    logAudit(actorName, role, 'PRODUCT_SCANNED', 'Product', matchedProduct.id, `Scanned & verified SKU: ${matchedProduct.sku}`);

    return {
      valid: true,
      type: 'Product',
      result: 'Expected Match',
      message: `✅ Verified: ${matchedProduct.name} (${matchedProduct.sku})`,
      matchedProduct
    };
  };

  const reportDiscrepancy = (
    data: Omit<DiscrepancyCase, 'id' | 'discrepancyNumber' | 'detectedAt' | 'updatedAt'>,
    actorName: string,
    role: UserRole
  ): DiscrepancyCase => {
    const num = `DIS-2026-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();
    const newCase: DiscrepancyCase = {
      ...data,
      id: `disc-${Date.now()}`,
      discrepancyNumber: num,
      detectedAt: now,
      updatedAt: now
    };
    setDiscrepancies(prev => [newCase, ...prev]);
    
    // Also flag shipment status
    if (data.shipmentId) {
      setShipments(prev =>
        prev.map(s => {
          if (s.id === data.shipmentId) {
            return {
              ...s,
              status: 'Discrepancy Detected',
              events: [
                ...s.events,
                {
                  id: `ev-${Date.now()}`,
                  timestamp: now,
                  status: 'Discrepancy Detected',
                  location: 'Verification Bay',
                  performedBy: actorName,
                  notes: `Exception case ${num} recorded: ${data.type} (${data.expectedQuantity} expected vs ${data.observedQuantity} observed).`
                }
              ]
            };
          }
          return s;
        })
      );
    }

    logAudit(actorName, role, 'DISCREPANCY_LOGGED', 'Discrepancy', newCase.id, `Reported discrepancy ${num} (${data.type}) on shipment ${data.shipmentTracking}`);
    return newCase;
  };

  const updateDiscrepancyStatus = (
    id: string,
    status: DiscrepancyStatus,
    notes: string,
    outcome?: DiscrepancyCase['resolutionOutcome'],
    actorName: string = 'Investigator',
    role: UserRole = 'OWNER'
  ) => {
    setDiscrepancies(prev =>
      prev.map(d => {
        if (d.id === id) {
          return {
            ...d,
            status,
            resolutionNotes: notes || d.resolutionNotes,
            resolutionOutcome: outcome || d.resolutionOutcome,
            updatedAt: new Date().toISOString()
          };
        }
        return d;
      })
    );
    logAudit(actorName, role, 'DISCREPANCY_STATUS_CHANGED', 'Discrepancy', id, `Updated discrepancy to status: ${status}. Outcome: ${outcome || 'In Progress'}`);
  };

  const confirmCustomerDelivery = (shipmentId: string, actorName: string, notes: string) => {
    const now = new Date().toISOString();
    setShipments(prev =>
      prev.map(s => {
        if (s.id === shipmentId) {
          return {
            ...s,
            status: 'Delivered',
            actualDelivery: now,
            events: [
              ...s.events,
              {
                id: `ev-${Date.now()}`,
                timestamp: now,
                status: 'Delivered',
                location: s.destination,
                performedBy: actorName,
                notes: notes || 'Delivery received and signed off by customer.'
              }
            ]
          };
        }
        return s;
      })
    );
    logAudit(actorName, 'CUSTOMER', 'DELIVERY_CONFIRMED', 'Shipment', shipmentId, `Customer confirmed delivery receipt with handover note.`);
  };

  const createReturnRequest = (
    data: Omit<ReturnCase, 'id' | 'returnNumber' | 'status' | 'requestedAt' | 'updatedAt'>,
    actorName: string
  ): ReturnCase => {
    const num = `RET-2026-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();
    const newRet: ReturnCase = {
      ...data,
      id: `ret-${Date.now()}`,
      returnNumber: num,
      status: 'Requested',
      requestedAt: now,
      updatedAt: now
    };
    setReturns(prev => [newRet, ...prev]);
    logAudit(actorName, 'CUSTOMER', 'RETURN_REQUESTED', 'Return', newRet.id, `Return requested for ${data.productName} (Qty: ${data.quantity}) due to ${data.reason}`);
    return newRet;
  };

  const updateReturnStatus = (
    id: string,
    status: ReturnCase['status'],
    inspectionNotes?: string,
    quarantineLoc?: string,
    actorName: string = 'Staff'
  ) => {
    setReturns(prev =>
      prev.map(r => {
        if (r.id === id) {
          return {
            ...r,
            status,
            inspectionNotes: inspectionNotes || r.inspectionNotes,
            quarantineLocation: quarantineLoc || r.quarantineLocation,
            updatedAt: new Date().toISOString()
          };
        }
        return r;
      })
    );
    logAudit(actorName, 'VENDOR', 'RETURN_STATUS_UPDATED', 'Return', id, `Return status changed to ${status}. Quarantine: ${quarantineLoc || 'N/A'}`);
  };

  const setCustomerReturnChoice = (
    id: string,
    choice: CustomerResolutionChoice,
    actorName: string = 'Customer'
  ) => {
    const now = new Date().toISOString();
    setReturns(prev =>
      prev.map(r => {
        if (r.id === id) {
          return {
            ...r,
            customerChoice: choice,
            updatedAt: now
          };
        }
        return r;
      })
    );
    logAudit(actorName, 'CUSTOMER', 'RESOLUTION_CHOICE_SET', 'Return', id, `Customer designated resolution preference: ${choice}`);
  };

  const inspectAndVerifyReturn = (
    id: string,
    diagnosis: string,
    notes: string,
    quarantineLoc: string,
    actorName: string = 'Sinu Gunshetty'
  ) => {
    const now = new Date().toISOString();
    setReturns(prev =>
      prev.map(r => {
        if (r.id === id) {
          return {
            ...r,
            status: 'Inspected',
            vendorVerified: true,
            vendorVerifiedBy: actorName,
            vendorVerifiedAt: now,
            problemDiagnosis: diagnosis,
            inspectionNotes: notes,
            quarantineLocation: quarantineLoc,
            updatedAt: now
          };
        }
        return r;
      })
    );
    logAudit(actorName, 'VENDOR', 'RETURN_INSPECTED', 'Return', id, `Vendor verified defect for return ${id}: ${diagnosis}. Quarantined at ${quarantineLoc}`);
  };

  const processReturnResolution = (
    id: string,
    resolution: CustomerResolutionChoice,
    details?: { replacementShipmentTracking?: string; refundReference?: string; refundAmount?: number },
    actorName: string = 'Sinu Gunshetty'
  ) => {
    const now = new Date().toISOString();
    setReturns(prev =>
      prev.map(r => {
        if (r.id === id) {
          if (resolution === 'Replace Product') {
            const tracking = details?.replacementShipmentTracking || `TRK-REP-${Math.floor(10000 + Math.random() * 90000)}`;
            return {
              ...r,
              status: 'Replacement Dispatched',
              customerChoice: 'Replace Product',
              replacementShipmentId: tracking,
              updatedAt: now
            };
          } else {
            const ref = details?.refundReference || `RFND-2026-${Math.floor(1000 + Math.random() * 9000)}`;
            return {
              ...r,
              status: 'Refund Processed',
              customerChoice: 'Refund Amount',
              refundStatus: 'Processed',
              refundReference: ref,
              refundAmount: details?.refundAmount || r.refundAmount || 14500,
              updatedAt: now
            };
          }
        }
        return r;
      })
    );
    logAudit(actorName, 'VENDOR', 'RETURN_RESOLVED', 'Return', id, `Processed customer resolution choice (${resolution}) for return ${id}`);
  };

  const resetDemoData = () => {
    setProducts(INITIAL_PRODUCTS);
    setContainers(INITIAL_CONTAINERS);
    setShipments(INITIAL_SHIPMENTS);
    setDiscrepancies(INITIAL_DISCREPANCIES);
    setReturns(INITIAL_RETURNS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setScanRecords(INITIAL_SCAN_RECORDS);
    localStorage.clear();
  };

  return (
    <DataContext.Provider
      value={{
        products,
        containers,
        shipments,
        discrepancies,
        returns,
        auditLogs,
        scanRecords,
        addProduct,
        updateProduct,
        deleteProduct,
        createContainer,
        createShipment,
        dispatchShipment,
        receiveShipment,
        processScan,
        reportDiscrepancy,
        updateDiscrepancyStatus,
        confirmCustomerDelivery,
        createReturnRequest,
        updateReturnStatus,
        setCustomerReturnChoice,
        inspectAndVerifyReturn,
        processReturnResolution,
        resetDemoData
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
