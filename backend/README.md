# DHARM — FastAPI Backend API

> **Intelligent Logistics & Product Traceability ERP Backend**  
> Built with FastAPI, SQLAlchemy 2.0, PostgreSQL, Pydantic v2, and JWT Authentication.

---

## 📌 Overview

This backend powers the **DHARM** platform with:
- **Product & SKU Catalog Management** (pricing, tax/GST calculations, barcode lookups).
- **Tamper-Evident Container Management** (live weight checks, container sealing & unsealing).
- **Shipments & Custody Tracking** (cryptographic manifest hash, lifecycle status transitions, event auditing).
- **Live Barcode & QR Scanner Verification** (anti-counterfeiting, duplicate prevention, and discrepancy alerting).
- **Automated Discrepancy Resolution Engine** (forensic photo/evidence upload and multi-stage investigation workflows).
- **Reverse Logistics & Customer Returns** (quarantine routing, replacement tracking).
- **Role-Based Access Control (RBAC)** (Product Owner, Vendor Hub, Customer Portal).

---

## 🛠 Technology Stack

- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.10+)
- **ASGI Server**: [Uvicorn](https://www.uvicorn.org/)
- **Database & ORM**: [PostgreSQL](https://www.postgresql.org/) with [SQLAlchemy 2.0](https://www.sqlalchemy.org/)
- **Data Validation & Serialization**: [Pydantic v2](https://docs.pydantic.dev/) & `pydantic-settings`
- **Security & Tokens**: [python-jose](https://github.com/mpdavis/python-jose) (JWT), `passlib` & `bcrypt`

---

## 📂 Project Structure

```text
backend/
├── app/
│   ├── __init__.py
│   ├── main.py               # FastAPI application setup, CORS, lifespan
│   ├── config.py             # Pydantic BaseSettings & environment configs
│   ├── database.py           # SQLAlchemy engine, session maker, get_db dependency
│   ├── seed.py               # Seed script with demo accounts, catalog, & sample data
│   ├── models/               # SQLAlchemy ORM database models
│   │   ├── user.py           # Users & RBAC roles (OWNER, VENDOR, CUSTOMER)
│   │   ├── product.py        # Master catalog & pricing
│   │   ├── container.py      # Containers & item packaging
│   │   ├── shipment.py       # Shipments, items, & event history
│   │   ├── discrepancy.py    # Discrepancies & forensic evidence
│   │   ├── scan.py           # Barcode & seal verification log
│   │   ├── return_case.py    # Customer returns & reverse logistics
│   │   └── audit.py          # Enterprise custody audit ledger
│   ├── schemas/              # Pydantic v2 request & response schemas
│   │   ├── user.py
│   │   ├── product.py
│   │   ├── container.py
│   │   ├── shipment.py
│   │   ├── discrepancy.py
│   │   ├── scan.py
│   │   ├── return_case.py
│   │   └── audit.py
│   ├── api/                  # Modular API routers
│   │   ├── auth.py           # /api/auth (login, me, register, demo-users)
│   │   ├── products.py       # /api/products (CRUD & barcode lookup)
│   │   ├── containers.py     # /api/containers (sealing, packing, weighing)
│   │   ├── shipments.py      # /api/shipments (tracking, manifests, events)
│   │   ├── discrepancies.py  # /api/discrepancies (engine & evidence)
│   │   ├── scans.py          # /api/scans (scan logging & verification)
│   │   ├── returns.py        # /api/returns (customer reverse logistics)
│   │   ├── audit.py          # /api/audit (tamper-proof custody audit)
│   │   └── health.py         # /api/health (database & service status)
│   └── core/
│       └── security.py       # Bcrypt hashing, JWT generation, & role guards
├── .env                      # Configured environment variables
├── .env.example              # Template environment variables
├── requirements.txt          # Python dependencies
├── run.py                    # Server runner script
└── README.md                 # Documentation
```

---

## ⚙️ Quickstart & Setup

### 1. Prerequisites
- **Python 3.10+** installed
- **PostgreSQL** installed and running on `localhost:5432`

Ensure the database `dharm` exists in PostgreSQL:
```sql
CREATE DATABASE dharm;
```

### 2. Configure Environment (`.env`)
The `.env` file is pre-configured with:
```env
DATABASE_URL=postgresql://postgres:your_password_here@localhost:5432/dharm
SECRET_KEY=dharm-super-secret-jwt-key-2026-production-ready
PORT=8000
```
> *Replace `your_password_here` with your local PostgreSQL password.*

### 3. Create Virtual Environment & Install Dependencies

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Windows (CMD):
.\venv\Scripts\activate.bat
# Linux / macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 4. Seed Database & Start Server

Run with automatic demo seeding:
```bash
python run.py --seed
```

Or run standard server:
```bash
python run.py
```

Or using Uvicorn directly:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 📖 Interactive API Documentation

Once the server is running, open your browser to:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## 👥 Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Product Owner** | `hey.dhruvs20@gmail.com` | `Dharam@123` |
| **Vendor Hub** | `sinugunshetty@gmail.com` | `Dharam@123` |
| **Customer** | `anusha.s2028@gmail.com` | `Dharam@123` |

---

## 📡 Key Endpoints

| Category | Method | Endpoint | Description |
|---|---|---|---|
| **Auth** | `POST` | `/api/auth/login` | Authenticate & receive JWT Bearer token |
| **Auth** | `GET` | `/api/auth/me` | Fetch profile for current token |
| **Auth** | `GET` | `/api/auth/demo-users` | Quick login accounts |
| **Products** | `GET` | `/api/products` | Catalog list with search & category filters |
| **Products** | `POST` | `/api/products` | Create SKU with GST rate calculation |
| **Products** | `GET` | `/api/products/barcode/{barcode}` | Lookup product by barcode |
| **Containers**| `GET` | `/api/containers` | List tamper-evident containers |
| **Containers**| `POST` | `/api/containers/{id}/items` | Scan item into container & update weight |
| **Containers**| `POST` | `/api/containers/{id}/seal` | Apply tamper-evident security seal |
| **Shipments** | `GET` | `/api/shipments` | List shipments with role filters |
| **Shipments** | `GET` | `/api/shipments/track/{tracking_number}` | Real-time tracking & custody manifest |
| **Shipments** | `PUT` | `/api/shipments/{id}/status` | Transition status (Dispatched, In Transit, etc.) |
| **Scanning**  | `POST` | `/api/scans/verify` | Real-time scanner verification engine |
| **Discrepancy**| `GET` | `/api/discrepancies` | List automated discrepancies |
| **Discrepancy**| `POST` | `/api/discrepancies/{id}/evidence` | Upload forensic proof / inspection logs |
| **Returns**   | `POST` | `/api/returns` | Customer return & quarantine routing |
| **Audit**     | `GET` | `/api/audit` | Immutable custody audit trail |
