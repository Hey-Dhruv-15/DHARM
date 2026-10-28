import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  Product,
  Container,
  ContainerType,
  Shipment,
  DiscrepancyCase,
  ReturnCase,
  CustomerResolutionChoice,
  AuditEvent,
  ScanRecord,
  DiscrepancyStatus,
  UserRole,
  Order,
  OrderStatus,
  CustomerProfileData,
  CustomerAddress,
  BillingAddress,
  CustomerNotification,
  ProductVerificationResult
} from '../types';
import {
  CustomerBackendService,
  type DiscrepancySubmissionInput
} from '../services/customerApi';
import {
  INITIAL_PRODUCTS,
  INITIAL_CONTAINERS,
  INITIAL_SHIPMENTS,
  INITIAL_DISCREPANCIES,
  INITIAL_RETURNS,
  INITIAL_AUDIT_LOGS,
  INITIAL_SCAN_RECORDS,
  INITIAL_ORDERS,
  INITIAL_CUSTOMER_PROFILE,
  INITIAL_NOTIFICATIONS
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
  orders: Order[];
  customerProfile: CustomerProfileData;
  notifications: CustomerNotification[];
  
  // Actions
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>, actorName: string, role: UserRole) => Product;
  updateProduct: (id: string, updates: Partial<Product>, actorName: string, role: UserRole) => void;
  deleteProduct: (id: string, actorName: string, role: UserRole) => void;
  createContainer: (container: Partial<Container> & { containerNumber: string; type: ContainerType; sealNumber: string }, actorName: string, role: UserRole) => Container;
  updateContainer: (id: string, updates: Partial<Container>, actorName?: string, role?: UserRole) => void;
  toggleContainerStatus: (id: string, actorName?: string, role?: UserRole) => void;
  deleteContainer: (id: string, actorName?: string, role?: UserRole) => void;
  createShipment: (shipmentData: Partial<Shipment>, actorName: string, role: UserRole) => Shipment;
  updateShipment: (id: string, updates: Partial<Shipment>, actorName?: string, role?: UserRole) => void;
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

  // Customer Portal Actions
  placeCustomerOrder: (
    orderData: {
      items: Array<{
        productId: string;
        productName: string;
        sku: string;
        image?: string;
        quantity: number;
        unitPrice: number;
        gstRate: number;
        totalPrice: number;
      }>;
      shippingAddress?: CustomerAddress;
      billingAddress?: BillingAddress;
      paymentMethod?: string;
      notes?: string;
      customerPoNumber?: string;
      logisticsProvider?: string;
      customerId?: string;
      customerName?: string;
    },
    actorName?: string
  ) => Order;
  updateOrderStatus: (orderId: string, status: OrderStatus, actorName?: string) => void;
  cancelCustomerOrder: (orderId: string, reason: string, actorName: string) => Order;
  updateCustomerProfile: (updates: Partial<CustomerProfileData>, actorName: string) => CustomerProfileData;
  addSavedAddress: (address: Omit<CustomerAddress, 'id'>, actorName: string) => CustomerAddress;
  updateSavedAddress: (id: string, updates: Partial<CustomerAddress>, actorName: string) => void;
  deleteSavedAddress: (id: string, actorName: string) => void;
  setDefaultAddress: (id: string, actorName: string) => void;
  verifyCustomerProduct: (code: string, customerId: string) => ProductVerificationResult;
  submitCustomerDiscrepancy: (input: DiscrepancySubmissionInput, customerId: string, customerName: string) => DiscrepancyCase;
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: (customerId: string) => void;
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

  const [orders, setOrders] = useState<Order[]>(() => {
    const s = localStorage.getItem('dharm_orders_v3');
    if (s) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length >= 10) {
          return parsed;
        }
      } catch (e) {
        // fall through
      }
    }
    localStorage.removeItem('dharm_orders_v2');
    localStorage.removeItem('dharm_orders_v1');
    return INITIAL_ORDERS;
  });

  const [customerProfile, setCustomerProfile] = useState<CustomerProfileData>(() => {
    const s = localStorage.getItem('dharm_customer_profile_v1');
    return s ? JSON.parse(s) : INITIAL_CUSTOMER_PROFILE;
  });

  const [notifications, setNotifications] = useState<CustomerNotification[]>(() => {
    const s = localStorage.getItem('dharm_customer_notifs_v1');
    return s ? JSON.parse(s) : INITIAL_NOTIFICATIONS;
  });

  useEffect(() => {
    localStorage.setItem('dharm_orders_v3', JSON.stringify(orders));
    localStorage.setItem('dharm_orders_v2', JSON.stringify(orders));
    localStorage.setItem('dharm_orders_v1', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('dharm_customer_profile_v1', JSON.stringify(customerProfile));
  }, [customerProfile]);

  useEffect(() => {
    localStorage.setItem('dharm_customer_notifs_v1', JSON.stringify(notifications));
  }, [notifications]);

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
    data: Partial<Container> & { containerNumber: string; type: ContainerType; sealNumber: string },
    actorName: string,
    role: UserRole
  ): Container => {
    const items = data.items || [];
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const weight = items.reduce((sum, item) => sum + item.weightKg, 0);
    const maxCap = Number(data.maxCapacity || data.capacityKg || 150);
    const capUnit = data.capacityUnit || 'kg';

    const newCont: Container = {
      id: `cnt-${Math.floor(100 + Math.random() * 900)}`,
      containerNumber: data.containerNumber,
      type: data.type,
      maxCapacity: maxCap,
      capacityUnit: capUnit,
      capacityKg: maxCap,
      currentWeightKg: weight,
      utilizedCapacity: weight,
      sealNumber: data.sealNumber,
      sealStatus: 'Active',
      initialLocation: data.initialLocation || data.location || 'Central Warehouse Bay 4',
      location: data.location || data.initialLocation || 'Central Warehouse Bay 4',
      description: data.description || '',
      status: data.status || 'Active',
      assignedShipmentId: data.assignedShipmentId || undefined,
      assignedShipmentTracking: data.assignedShipmentTracking || 'Unassigned',
      itemCount: itemCount,
      items: items,
      createdAt: new Date().toISOString(),
      createdBy: actorName,
      isActive: true
    };
    setContainers(prev => [newCont, ...prev]);
    logAudit(actorName, role, 'CONTAINER_CREATED', 'Container', newCont.id, `Created container ${newCont.containerNumber} (${newCont.type}) with seal ${newCont.sealNumber}`);
    return newCont;
  };

  const updateContainer = (
    id: string,
    updates: Partial<Container>,
    actorName?: string,
    role?: UserRole
  ) => {
    setContainers(prev =>
      prev.map(c => {
        if (c.id !== id) return c;
        const updated = { ...c, ...updates };
        if (updates.items) {
          updated.itemCount = updates.items.reduce((sum, i) => sum + i.quantity, 0);
          updated.currentWeightKg = updates.items.reduce((sum, i) => sum + i.weightKg, 0);
          updated.utilizedCapacity = updated.currentWeightKg;
        }
        return updated;
      })
    );
    if (actorName) {
      logAudit(actorName, role || 'OWNER', 'CONTAINER_UPDATED', 'Container', id, `Updated container ID: ${id}`);
    }
  };

  const toggleContainerStatus = (
    id: string,
    actorName?: string,
    role?: UserRole
  ) => {
    setContainers(prev =>
      prev.map(c => {
        if (c.id !== id) return c;
        const newActive = !c.isActive;
        const newStatus = newActive ? 'Active' : 'Inactive';
        return { ...c, isActive: newActive, status: newStatus as any };
      })
    );
    if (actorName) {
      logAudit(actorName, role || 'OWNER', 'CONTAINER_STATUS_TOGGLED', 'Container', id, `Toggled active state for container ${id}`);
    }
  };

  const deleteContainer = (
    id: string,
    actorName?: string,
    role?: UserRole
  ) => {
    setContainers(prev => prev.filter(c => c.id !== id));
    if (actorName) {
      logAudit(actorName, role || 'OWNER', 'CONTAINER_DELETED', 'Container', id, `Deleted container ID: ${id}`);
    }
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

  const updateShipment = (
    id: string,
    updates: Partial<Shipment>,
    actorName?: string,
    role?: UserRole
  ) => {
    setShipments(prev =>
      prev.map(s => {
        if (s.id !== id) return s;
        return {
          ...s,
          ...updates,
          events: updates.events || s.events
        };
      })
    );
    if (actorName) {
      logAudit(actorName, role || 'OWNER', 'SHIPMENT_UPDATED', 'Shipment', id, `Updated shipment ID: ${id}`);
    }
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

  // Customer Portal Methods
  const placeCustomerOrder = (
    orderData: {
      items: Array<{
        productId: string;
        productName: string;
        sku: string;
        image?: string;
        quantity: number;
        unitPrice: number;
        gstRate: number;
        totalPrice: number;
      }>;
      shippingAddress?: CustomerAddress;
      billingAddress?: BillingAddress;
      paymentMethod?: string;
      notes?: string;
      customerPoNumber?: string;
      logisticsProvider?: string;
      customerId?: string;
      customerName?: string;
    },
    actorName?: string
  ): Order => {
    const subtotal = orderData.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxTotal = orderData.items.reduce((sum, item) => sum + Math.round(item.totalPrice - (item.quantity * item.unitPrice)), 0);
    const grandTotal = subtotal + taxTotal;

    const newOrderNumber = `ORD-DHM-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrderId = `ord-${Date.now()}`;
    const custId = orderData.customerId || 'usr-cust-03';
    const custName = orderData.customerName || customerProfile.name || 'Anusha S (BioMed)';
    const defaultShipAddr = customerProfile.savedAddresses?.find(a => a.isDefault) || customerProfile.savedAddresses?.[0] || INITIAL_CUSTOMER_PROFILE.savedAddresses[0];
    const defaultBillAddr = customerProfile.billingAddress || INITIAL_CUSTOMER_PROFILE.billingAddress;

    const newOrder: Order = {
      id: newOrderId,
      orderNumber: newOrderNumber,
      customerId: custId,
      customerName: custName,
      customerPoNumber: orderData.customerPoNumber || 'Direct Commercial Order',
      logisticsProvider: orderData.logisticsProvider || 'Bluedart Express',
      trackingNumber: `TRK-DHM-${Math.floor(100000 + Math.random() * 900000)}`,
      orderDate: new Date().toISOString(),
      status: 'Processing',
      expectedDeliveryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      paymentStatus: 'Paid',
      paymentMethod: orderData.paymentMethod || 'Corporate Net Banking',
      items: orderData.items,
      subtotal,
      taxTotal,
      grandTotal,
      shippingAddress: orderData.shippingAddress || defaultShipAddr,
      billingAddress: orderData.billingAddress || defaultBillAddr,
      invoiceNumber: `INV-DHM-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      invoiceAvailable: true,
      canCancel: true
    };

    setOrders(prev => [newOrder, ...prev]);

    // Sync seamlessly with FastAPI backend
    try {
      fetch('http://localhost:8000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerAccount: custName,
          customerPoReference: orderData.customerPoNumber || newOrder.customerPoNumber,
          deliveryLocation: `${newOrder.shippingAddress?.label || 'Primary Receiving Annex'} — ${newOrder.shippingAddress?.city || 'Bengaluru'}, ${newOrder.shippingAddress?.state || 'Karnataka'}`,
          logisticsCarrier: orderData.logisticsProvider || 'Bluedart Express',
          paymentTerms: orderData.paymentMethod || 'Corporate Net Banking',
          orderRemarks: orderData.notes || '',
          customerId: custId,
          customerName: custName,
          shippingAddress: newOrder.shippingAddress,
          billingAddress: newOrder.billingAddress,
          items: orderData.items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            image: item.image,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            gstRate: item.gstRate,
            totalPrice: item.totalPrice
          }))
        })
      }).catch(err => {
        console.warn('Backend order sync noticed:', err);
      });
    } catch (e) {
      // Non-blocking fallback
    }

    logAudit(
      actorName || custName,
      'CUSTOMER',
      'ORDER_CREATED',
      'Shipment',
      newOrder.id,
      `Customer placed new purchase order ${newOrder.orderNumber} for ${orderData.items.length} items (Total: ₹${grandTotal.toLocaleString('en-IN')})`
    );

    const newNotif: CustomerNotification = {
      id: `notif-${Date.now()}`,
      customerId: custId,
      title: 'Order Placed Successfully',
      message: `Your purchase order #${newOrder.orderNumber} has been received and is being processed.`,
      category: 'ORDER',
      timestamp: new Date().toISOString(),
      read: false,
      link: '/customer/orders',
      severity: 'success'
    };
    setNotifications(prev => [newNotif, ...prev]);

    return newOrder;
  };

  const cancelCustomerOrder = (orderId: string, reason: string, actorName: string): Order => {
    const { updatedOrders, cancelledOrder } = CustomerBackendService.cancelOrder(
      'usr-cust-03',
      orderId,
      reason,
      orders
    );
    setOrders(updatedOrders);
    logAudit(
      actorName,
      'CUSTOMER',
      'ORDER_CANCELLED',
      'Shipment',
      cancelledOrder.id,
      `Customer cancelled order ${cancelledOrder.orderNumber}. Reason: ${reason || 'Prior to dispatch'}`
    );

    // Also add notification
    const newNotif: CustomerNotification = {
      id: `notif-${Date.now()}`,
      customerId: 'usr-cust-03',
      title: 'Order Cancelled',
      message: `Order #${cancelledOrder.orderNumber} was successfully cancelled as requested.`,
      category: 'ORDER',
      timestamp: new Date().toISOString(),
      read: false,
      link: '/customer/orders',
      severity: 'info'
    };
    setNotifications(prev => [newNotif, ...prev]);

    return cancelledOrder;
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus, actorName?: string) => {
    setOrders(prev =>
      prev.map(o => {
        if (o.id === orderId) {
          const isDelivered = status === 'Delivered';
          return {
            ...o,
            status,
            deliveredAt: isDelivered ? new Date().toISOString() : (o as any).deliveredAt,
            canCancel: status === 'Placed' || status === 'Processing'
          };
        }
        return o;
      })
    );

    const targetOrder = orders.find(o => o.id === orderId);
    if (targetOrder) {
      logAudit(
        actorName || customerProfile.name || 'Customer Consignee',
        'CUSTOMER',
        'ORDER_STATUS_UPDATED',
        'Shipment',
        orderId,
        `Order ${targetOrder.orderNumber} fulfillment status changed to ${status}.`
      );

      if (status === 'Delivered') {
        // Sync delivery & archival with FastAPI backend
        try {
          fetch(`http://localhost:8000/api/orders/${orderId}/deliver`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              notes: 'Customer confirmed physical delivery handover',
              deliveredBy: actorName || customerProfile.name || 'Customer Consignee'
            })
          }).catch(err => {
            console.warn('Backend order deliver sync notice:', err);
          });
        } catch (e) {
          // Non-blocking fallback
        }

        const newNotif: CustomerNotification = {
          id: `notif-${Date.now()}`,
          customerId: targetOrder.customerId,
          title: 'Order Delivered Successfully',
          message: `Order #${targetOrder.orderNumber} has been delivered and moved to your Order History.`,
          category: 'ORDER',
          timestamp: new Date().toISOString(),
          read: false,
          link: '/customer/orders',
          severity: 'success'
        };
        setNotifications(prev => [newNotif, ...prev]);
      } else {
        // Sync other status updates
        try {
          fetch(`http://localhost:8000/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
          }).catch(err => {
            console.warn('Backend order status sync notice:', err);
          });
        } catch (e) {
          // Non-blocking fallback
        }
      }
    }
  };

  const updateCustomerProfile = (
    updates: Partial<CustomerProfileData>,
    actorName: string
  ): CustomerProfileData => {
    const updated = CustomerBackendService.updateProfile('usr-cust-03', customerProfile, updates);
    setCustomerProfile(updated);
    logAudit(actorName, 'CUSTOMER', 'PROFILE_UPDATED', 'Shipment', updated.customerId, 'Updated customer account details and business GSTIN.');
    return updated;
  };

  const addSavedAddress = (
    address: Omit<CustomerAddress, 'id'>,
    actorName: string
  ): CustomerAddress => {
    const updatedProfile = CustomerBackendService.addSavedAddress('usr-cust-03', customerProfile, address);
    setCustomerProfile(updatedProfile);
    const added = updatedProfile.savedAddresses[updatedProfile.savedAddresses.length - 1];
    logAudit(actorName, 'CUSTOMER', 'ADDRESS_ADDED', 'Shipment', added.id, `Saved new delivery address: ${added.label}`);
    return added;
  };

  const updateSavedAddress = (
    id: string,
    updates: Partial<CustomerAddress>,
    actorName: string
  ) => {
    const updatedProfile = CustomerBackendService.updateSavedAddress('usr-cust-03', customerProfile, id, updates);
    setCustomerProfile(updatedProfile);
    logAudit(actorName, 'CUSTOMER', 'ADDRESS_UPDATED', 'Shipment', id, 'Updated saved delivery address details.');
  };

  const deleteSavedAddress = (id: string, actorName: string) => {
    const updatedProfile = CustomerBackendService.deleteSavedAddress('usr-cust-03', customerProfile, id);
    setCustomerProfile(updatedProfile);
    logAudit(actorName, 'CUSTOMER', 'ADDRESS_DELETED', 'Shipment', id, 'Removed saved delivery address.');
  };

  const setDefaultAddress = (id: string, actorName: string) => {
    const updatedProfile = CustomerBackendService.setDefaultAddress('usr-cust-03', customerProfile, id);
    setCustomerProfile(updatedProfile);
    logAudit(actorName, 'CUSTOMER', 'ADDRESS_SET_DEFAULT', 'Shipment', id, 'Set default receiving delivery address.');
  };

  const verifyCustomerProduct = (code: string, customerId: string): ProductVerificationResult => {
    const result = CustomerBackendService.verifyProduct(
      customerId,
      code,
      shipments,
      products,
      scanRecords
    );

    // Save scan record
    const newScan: ScanRecord = {
      id: `scn-${Date.now()}`,
      scannedCode: code.trim(),
      scannedAt: new Date().toISOString(),
      scannedBy: customerProfile.name,
      role: 'CUSTOMER',
      shipmentId: result.shipment?.id,
      type: 'Product',
      result: result.status === 'VERIFIED'
        ? 'Expected Match'
        : result.status === 'DUPLICATE_SCAN'
        ? 'Duplicate Attempt'
        : result.status === 'MISMATCH_DETECTED'
        ? 'Unexpected Product'
        : 'Damaged Reported',
      notes: result.message
    };
    setScanRecords(prev => [newScan, ...prev]);

    return result;
  };

  const submitCustomerDiscrepancy = (
    input: DiscrepancySubmissionInput,
    customerId: string,
    customerName: string
  ): DiscrepancyCase => {
    const newCase = CustomerBackendService.reportDiscrepancy(
      customerId,
      customerName,
      input,
      orders,
      shipments
    );

    setDiscrepancies(prev => [newCase, ...prev]);

    // Also instantiate return claim for Vendor Exceptions & Damaged module
    const retNum = `RET-2026-${Math.floor(100 + Math.random() * 900)}`;
    const newReturn: ReturnCase = {
      id: `ret-${Date.now()}`,
      returnNumber: retNum,
      originalShipmentId: newCase.shipmentId || 'shp-2026-001',
      trackingNumber: newCase.shipmentTracking || `TRK-DHM-${Math.floor(100000 + Math.random() * 900000)}`,
      orderId: newCase.orderId,
      orderNumber: newCase.orderNumber,
      customerId,
      customerName,
      productId: newCase.productId || 'prod-001',
      productName: newCase.productName || 'OptiTrace Diagnostic Sensor Array',
      sku: newCase.sku || 'BIO-DIAG-440',
      quantity: input.observedQuantity || 1,
      reason: input.category === 'Damaged Goods' ? 'Damaged in Transit' : 'Defective Unit',
      status: 'Received at Hub',
      evidencePhotos: (input.evidenceFiles || []).map(f => f.dataUrl || '/dharm_logistics_hero.jpg'),
      quarantineLocation: 'Vendor Hub Quarantine Bay Q-4B',
      customerChoice: input.preferredResolution === 'Refund' ? 'Refund Amount' : 'Replace Product',
      vendorVerified: false,
      problemDiagnosis: input.description || 'Customer reported defective/damaged unit upon delivery.',
      refundStatus: 'Pending Inspection',
      requestedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setReturns(prev => [newReturn, ...prev]);

    // Sync with FastAPI backend Exceptions & Damaged intake
    try {
      fetch(`http://localhost:8000/api/orders/${input.orderId || 'ord'}/report-problem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: input.productId,
          productName: newCase.productName,
          sku: newCase.sku,
          problemCategory: input.category,
          preferredResolution: input.preferredResolution || 'Replacement',
          deliveredUnits: input.expectedQuantity || 1,
          defectiveUnits: input.observedQuantity || 1,
          description: input.description,
          evidencePhotos: newReturn.evidencePhotos
        })
      }).catch(err => {
        console.warn('Backend problem report sync notice:', err);
      });
    } catch (e) {
      // Non-blocking fallback
    }

    // Update shipment status if applicable
    if (newCase.shipmentId) {
      setShipments(prev =>
        prev.map(s => {
          if (s.id === newCase.shipmentId) {
            return {
              ...s,
              status: 'Discrepancy Detected',
              events: [
                ...s.events,
                {
                  id: `ev-${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  status: 'Discrepancy Detected',
                  location: 'Customer Receiving Bay',
                  performedBy: customerName,
                  notes: `Customer filed discrepancy ${newCase.discrepancyNumber}: ${newCase.type} (${newCase.observedQuantity}/${newCase.expectedQuantity}).`
                }
              ]
            };
          }
          return s;
        })
      );
    }

    logAudit(
      customerName,
      'CUSTOMER',
      'DISCREPANCY_LOGGED',
      'Discrepancy',
      newCase.id,
      `Customer filed discrepancy report ${newCase.discrepancyNumber} for ${newCase.type}`
    );

    // Add notification
    const newNotif: CustomerNotification = {
      id: `notif-${Date.now()}`,
      customerId,
      title: 'Discrepancy Report Registered',
      message: `Complaint #${newCase.discrepancyNumber} logged under review by quality auditor.`,
      category: 'DISCREPANCY',
      timestamp: new Date().toISOString(),
      read: false,
      link: '/customer/issues',
      severity: 'warning'
    };
    setNotifications(prev => [newNotif, ...prev]);

    return newCase;
  };

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsAsRead = (customerId: string) => {
    setNotifications(prev =>
      prev.map(n => (n.customerId === customerId ? { ...n, read: true } : n))
    );
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
        updateContainer,
        toggleContainerStatus,
        deleteContainer,
        createShipment,
        updateShipment,
        dispatchShipment,
        receiveShipment,
        processScan,
        reportDiscrepancy,
        updateDiscrepancyStatus,
        confirmCustomerDelivery,
        createReturnRequest,
        updateReturnStatus,
        orders,
        customerProfile,
        notifications,
        placeCustomerOrder,
        updateOrderStatus,
        cancelCustomerOrder,
        updateCustomerProfile,
        addSavedAddress,
        updateSavedAddress,
        deleteSavedAddress,
        setDefaultAddress,
        verifyCustomerProduct,
        submitCustomerDiscrepancy,
        markNotificationAsRead,
        markAllNotificationsAsRead,
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
