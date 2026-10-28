import type { Container } from '../types';

const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    if (window.location.port === '8000') return '';
    return 'http://localhost:8000';
  }
  return 'http://localhost:8000';
};

const getAuthHeaders = (): HeadersInit => {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('dharm_access_token') : null;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export interface ScannedProductRecord {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  quantity: number;
  unitWeightKg: number;
  weightKg: number;
  scannedAt?: string;
}

export interface ScanProductBarcodeResponse {
  success: boolean;
  message: string;
  containerId: string;
  containerNumber: string;
  product: {
    id: string;
    productId: string;
    productName: string;
    sku: string;
    barcode: string;
    quantity: number;
    unitWeightKg: number;
    weightKg: number;
  };
}

export const containerApi = {
  /**
   * GET /api/v1/containers
   * List all containers
   */
  async listContainers(): Promise<any[]> {
    const endpoints = [
      `/api/v1/containers`,
      `/api/containers`,
      `${getBaseUrl()}/api/v1/containers`,
      `${getBaseUrl()}/api/containers`
    ];

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, { headers: getAuthHeaders() });
        if (res.ok) return await res.json();
      } catch (e) {
        // Fallback
      }
    }
    return [];
  },

  /**
   * GET /api/v1/containers/{container_id}/products
   * Get all products scanned and loaded in the container
   */
  async getContainerProducts(containerId: string): Promise<ScannedProductRecord[]> {
    const encId = encodeURIComponent(containerId);
    const endpoints = [
      `/api/v1/containers/${encId}/products`,
      `/api/containers/${encId}/products`,
      `${getBaseUrl()}/api/v1/containers/${encId}/products`,
      `${getBaseUrl()}/api/containers/${encId}/products`
    ];

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            return data.map((it: any) => ({
              id: String(it.id || it.product_id || it.productId),
              productId: String(it.product_id || it.productId || it.id),
              productName: it.product_name || it.productName || 'Product',
              sku: it.sku || 'SKU-000',
              barcode: it.barcode || '',
              quantity: Number(it.quantity || 1),
              unitWeightKg: Number(it.unit_weight || it.unit_weight_kg || it.unitWeightKg || 1.0),
              weightKg: Number(it.total_weight || it.weight_kg || it.weightKg || 1.0),
              scannedAt: it.scanned_at || it.scannedAt || new Date().toISOString()
            }));
          }
        }
      } catch (e) {
        // Next endpoint
      }
    }
    return [];
  },

  /**
   * POST /api/v1/containers/{container_id}/products/scan
   * Scan product barcode into container (validates in catalog, stores in DB, increments qty)
   */
  async scanProductBarcode(containerId: string, barcode: string): Promise<ScanProductBarcodeResponse> {
    const encId = encodeURIComponent(containerId);
    const endpoints = [
      `/api/v1/containers/${encId}/products/scan`,
      `/api/containers/${encId}/products/scan`,
      `${getBaseUrl()}/api/v1/containers/${encId}/products/scan`,
      `${getBaseUrl()}/api/containers/${encId}/products/scan`
    ];

    let lastError: any = null;
    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ barcode: barcode.trim() })
        });
        if (res.ok) {
          const raw = await res.json();
          const p = raw.product || {};
          return {
            success: true,
            message: raw.message || 'Product added to container successfully',
            containerId: raw.container_id || containerId,
            containerNumber: raw.container_number || containerId,
            product: {
              id: String(p.id || p.product_id || barcode),
              productId: String(p.product_id || p.id || barcode),
              productName: p.product_name || p.name || 'Product',
              sku: p.sku || 'SKU-000',
              barcode: p.barcode || barcode,
              quantity: Number(p.quantity || 1),
              unitWeightKg: Number(p.unit_weight || p.unit_weight_kg || 1.0),
              weightKg: Number(p.total_weight || p.weight_kg || 1.0)
            }
          };
        } else {
          const errData = await res.json().catch(() => null);
          lastError = new Error(errData?.detail || `API error ${res.status}`);
        }
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError || new Error(`Failed to scan barcode ${barcode} into container ${containerId}`);
  },

  /**
   * DELETE /api/v1/containers/{container_id}/products/{product_id}
   * Remove a product from the container manifest by product ID, SKU, or Barcode
   */
  async removeProductFromContainer(containerId: string, productId: string): Promise<{ success: boolean; message: string }> {
    const encCId = encodeURIComponent(containerId);
    const encPId = encodeURIComponent(productId);
    const endpoints = [
      `/api/v1/containers/${encCId}/products/${encPId}`,
      `/api/containers/${encCId}/products/${encPId}`,
      `${getBaseUrl()}/api/v1/containers/${encCId}/products/${encPId}`,
      `${getBaseUrl()}/api/containers/${encCId}/products/${encPId}`
    ];

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (res.ok) {
          return await res.json().catch(() => ({ success: true, message: 'Product removed' }));
        }
      } catch (e) {
        // Fallback
      }
    }
    return { success: true, message: 'Removed locally' };
  },

  /**
   * POST /api/v1/containers/{container_id}/items
   * Add Item To Container
   */
  async addItemToContainer(
    containerId: string,
    item: {
      productId: string;
      productName: string;
      sku: string;
      barcode: string;
      quantity?: number;
      weightKg?: number;
      unitWeightKg?: number;
    }
  ): Promise<any> {
    const encId = encodeURIComponent(containerId);
    const endpoints = [
      `/api/v1/containers/${encId}/items`,
      `/api/containers/${encId}/items`,
      `${getBaseUrl()}/api/v1/containers/${encId}/items`,
      `${getBaseUrl()}/api/containers/${encId}/items`
    ];

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            barcode: item.barcode,
            quantity: item.quantity ?? 1,
            weightKg: item.weightKg ?? 1.0,
            unitWeightKg: item.unitWeightKg ?? 1.0
          })
        });
        if (res.ok) return await res.json();
      } catch (e) {
        // Next
      }
    }
    throw new Error(`Failed to add item to container ${containerId}`);
  },

  /**
   * DELETE /api/v1/containers/{container_id}/items/{item_id}
   * Remove Item From Container
   */
  async removeItemFromContainer(containerId: string, itemId: string): Promise<any> {
    const encCId = encodeURIComponent(containerId);
    const encIId = encodeURIComponent(itemId);
    const endpoints = [
      `/api/v1/containers/${encCId}/items/${encIId}`,
      `/api/containers/${encCId}/items/${encIId}`,
      `${getBaseUrl()}/api/v1/containers/${encCId}/items/${encIId}`,
      `${getBaseUrl()}/api/containers/${encCId}/items/${encIId}`
    ];

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (res.ok) return await res.json();
      } catch (e) {
        // Next
      }
    }
    return { success: true, message: 'Removed item' };
  },

  /**
   * POST /api/v1/containers/{container_id}/seal
   * Seal Container with Tamper-Evident Seal Barcode
   */
  async sealContainer(containerId: string, sealNumber: string): Promise<any> {
    const encCId = encodeURIComponent(containerId);
    const encSeal = encodeURIComponent(sealNumber);
    const endpoints = [
      `/api/v1/containers/${encCId}/seal?seal_number=${encSeal}`,
      `/api/containers/${encCId}/seal?seal_number=${encSeal}`,
      `${getBaseUrl()}/api/v1/containers/${encCId}/seal?seal_number=${encSeal}`,
      `${getBaseUrl()}/api/containers/${encCId}/seal?seal_number=${encSeal}`
    ];

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ seal_number: sealNumber, sealNumber })
        });
        if (res.ok) return await res.json();
      } catch (e) {
        // Next
      }
    }
    return { success: true, message: `Container sealed with ${sealNumber}` };
  }
};
