# DHARM — Intelligent Logistics & Product Traceability ERP

> **Digital Handover, Accountability, Reconciliation & Movement**  
> *Every Movement Accountable. Every Product Traceable.*

---

## 📌 Overview

**DHARM** is an intelligent role-based logistics ERP built for end-to-end custody tracking, product traceability, barcode/QR scanning, tamper-evident container verification, and automated discrepancy resolution across the supply chain:
**Product Owner ➔ Vendor Hub ➔ Customer**.

---

## 👥 Login Credentials & User Roles

All accounts are pre-seeded in the database and mock system. Default password across all roles is **`Dharam@123`**.

| Role | User Name | Login Email | Password | Primary Capabilities & Scope |
|---|---|---|---|---|
| **Product Owner** | Dhruva (Owner) | `hey.dhruvs20@gmail.com` | `Dharam@123` | Master product catalog, SKU barcodes, container sealing, dispatch manifests, vendor scorecard, and discrepancy resolution. |
| **Vendor Hub** | Sinu Gunshetty | `sinugunshetty@gmail.com` | `Dharam@123` | Cross-dock inbound receipts, barcode/QR verification scanner, physical shortage/product loss reporting, and outgoing handover. |
| **Vendor Hub (Alt)** | Sinu Gunshetty | `sinu.vendor@dharm.com` | `Dharam@123` | Secondary vendor testing account with full hub access. |
| **Customer** | Anusha S | `anusha.s2028@gmail.com` | `Dharam@123` | Purchase order placement, real-time shipment tracking, cryptographic delivery confirmation, return claims, and issue reporting. |
| **Customer (Alt)** | Anusha S (BioMed) | `anusha.biomed@dharm.com` | `Dharam@123` | BioMed Research corporate institutional account. |

---

## 🚀 Key Features

- **Products & SKU Master Catalog**: Real-time pricing with GST calculation, billing units, serial barcodes, and scope deliverables.
- **Tamper-Evident Security**: Barcode, QR, and container security seal tracking (Cold-Chain Bins, Security Crates, RFID Pallets) for zero unaccounted loss.
- **Automated Discrepancy & Product Loss Engine**: Automatic detection for shortages, unmanifested barcodes, duplicate scans, or wrong containers with resolution workflows.
- **Shipment Lifecycle & Reconciliation**: Complete flow from Owner Draft ➔ Sealing ➔ Dispatched ➔ In Transit ➔ Vendor Physical Verification ➔ Delivered / Discrepancy Detected.

---

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Backend API**: FastAPI, SQLAlchemy 2.0, Pydantic v2, PostgreSQL / SQLite
- **Security**: JWT Bearer Tokens, Bcrypt password hashing, SHA-256 Manifest signatures
- **Deployment**: Render (Backend Web Service & Database) + Vercel (Frontend SPA)

---

## 💻 Local Development

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)

### 1. Run the Backend API
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\Activate.ps1
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
python run.py --seed
```
*API runs at `http://127.0.0.1:8000` with Swagger docs at `http://127.0.0.1:8000/docs`.*

### 2. Run the Frontend
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs at `http://localhost:5173`.*

---

## 🌐 Production Deployment Guide

### A. Deploy Backend to Render (Web Service)
1. In the [Render Dashboard](https://dashboard.render.com), click **New** ➔ **Web Service**.
2. Connect your GitHub repository `Hey-Dhruv-15/DHARM`.
3. Configure settings:
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Environment Variables:
   - `PYTHON_VERSION`: `3.12.8`
   - `CORS_ORIGINS`: `*`
   - `SECRET_KEY`: `dharm-super-secret-key-change-in-production-2026-secure-jwt-token`
5. Click **Deploy Web Service**. Render provides your API URL: `https://dharm-backend.onrender.com`.

### B. Deploy Frontend to Vercel
1. In the [Vercel Dashboard](https://vercel.com), click **Add New...** ➔ **Project**.
2. Select your repository `Hey-Dhruv-15/DHARM`.
3. Configure settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variable:
   - **`VITE_API_URL`**: `https://dharm-backend.onrender.com` *(your Render backend URL)*
5. Click **Deploy**. Vercel will build and launch your production application.

---

## 📄 License
Proprietary — Developed for DHARM Logistics Network.
