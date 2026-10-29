import type { Product } from '../types';

import { getApiBaseUrl } from './apiConfig';
const getBaseUrl = getApiBaseUrl;

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

export const productApi = {
  /**
   * GET /api/products
   * List all products with optional search and category filters
   */
  async listProducts(filters?: { search?: string; category?: string; status?: string }): Promise<Product[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.status) params.append('status', filters.status);

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const endpoints = [
      `/api/products${queryStr}`,
      `${getBaseUrl()}/api/products${queryStr}`
    ];

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'GET',
          headers: getAuthHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            return data.map(normalizeProduct);
          }
        }
      } catch (err) {
        // Continue to fallback endpoint
      }
    }
    throw new Error('Failed to fetch products from backend API');
  },

  /**
   * GET /api/products/{id}
   * Fetch single product details by ID
   */
  async getProduct(id: string): Promise<Product> {
    const endpoints = [
      `/api/products/${encodeURIComponent(id)}`,
      `${getBaseUrl()}/api/products/${encodeURIComponent(id)}`
    ];

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'GET',
          headers: getAuthHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          return normalizeProduct(data);
        }
      } catch (err) {
        // Continue
      }
    }
    throw new Error(`Product ${id} not found`);
  },

  /**
   * POST /api/products
   * Register a new product item in master catalog
   */
  async createProduct(productData: Partial<Product>): Promise<Product> {
    const payload = {
      id: productData.id,
      sku: productData.sku,
      name: productData.name,
      category: productData.category || 'General / Uncategorized',
      barcode: productData.barcode || productData.sku,
      isSerialized: productData.isSerialized ?? false,
      unit: productData.unit || 'Unit',
      billingUnit: productData.billingUnit || 'One-time',
      stockQuantity: productData.stockQuantity ?? 0,
      reorderLevel: productData.reorderLevel ?? 5,
      unitPrice: productData.unitPrice ?? 0,
      gstRate: productData.gstRate ?? 18,
      grossPrice: productData.grossPrice ?? 0,
      currency: productData.currency || 'INR',
      status: productData.status || 'Active',
      description: productData.description || '',
      deliverables: productData.deliverables || ''
    };

    const endpoints = [
      '/api/products',
      `${getBaseUrl()}/api/products`
    ];

    let lastError: Error | null = null;
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          return normalizeProduct(data);
        } else {
          const errBody = await res.json().catch(() => null);
          lastError = new Error(errBody?.detail || `HTTP ${res.status}: Failed to create product`);
        }
      } catch (err: any) {
        lastError = err;
      }
    }
    throw lastError || new Error('Failed to create product on backend API');
  },

  /**
   * PUT /api/products/{id}
   * Update an existing product
   */
  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const endpoints = [
      `/api/products/${encodeURIComponent(id)}`,
      `${getBaseUrl()}/api/products/${encodeURIComponent(id)}`
    ];

    let lastError: Error | null = null;
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(updates)
        });

        if (res.ok) {
          const data = await res.json();
          return normalizeProduct(data);
        } else {
          const errBody = await res.json().catch(() => null);
          lastError = new Error(errBody?.detail || `HTTP ${res.status}: Failed to update product`);
        }
      } catch (err: any) {
        lastError = err;
      }
    }
    throw lastError || new Error(`Failed to update product ${id}`);
  },

  /**
   * DELETE /api/products/{id}
   * Remove or archive a product by ID
   */
  async deleteProduct(id: string): Promise<boolean> {
    const endpoints = [
      `/api/products/${encodeURIComponent(id)}`,
      `${getBaseUrl()}/api/products/${encodeURIComponent(id)}`
    ];

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (res.ok || res.status === 204) {
          return true;
        }
      } catch (err) {
        // Continue
      }
    }
    return false;
  }
};

function normalizeProduct(d: any): Product {
  return {
    id: d.id,
    sku: d.sku,
    name: d.name,
    category: d.category || 'General / Uncategorized',
    barcode: d.barcode || d.sku,
    isSerialized: d.isSerialized ?? d.is_serialized ?? false,
    unit: d.unit || 'Unit',
    billingUnit: d.billingUnit || d.billing_unit || 'One-time',
    stockQuantity: d.stockQuantity ?? d.stock_quantity ?? 0,
    reorderLevel: d.reorderLevel ?? d.reorder_level ?? 5,
    unitPrice: d.unitPrice ?? d.unit_price ?? 0,
    gstRate: d.gstRate ?? d.gst_rate ?? 18,
    grossPrice: d.grossPrice ?? d.gross_price ?? 0,
    currency: d.currency || 'INR',
    status: d.status || 'Active',
    description: d.description || '',
    deliverables: d.deliverables || '',
    createdAt: d.createdAt || d.created_at || new Date().toISOString()
  };
}

