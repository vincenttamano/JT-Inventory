# Dental IMS

Dental Inventory Management System built with React, TypeScript, Create React App, and Tailwind CSS.

This application provides a comprehensive suite of tools for managing dental clinic operations, blending a modern **Grey and Gold** design aesthetic with robust functionality.

## Features

- **Inventory Management**: Track product quantities, unit types, expiry dates, and categories. Custom categories can be dynamically created.
- **Role-based Access**: Dual view for `Admin` and `Staff`. Admins have full access, while staff have a restricted view.
- **Usage Tracking**: Record items consumed during procedures, including patient consent tracking. Admins can edit or delete usage records, automatically refunding inventory quantities.
- **Patient Management (Admin)**: Full CRUD capabilities for tracking patient visits and item usage.
- **Real-time Notifications**: A bell notification icon instantly alerts staff to low stock and expiring inventory items.
- **Analytics Dashboard**: Interactive Recharts components visualizing monthly costs and inventory distribution.
- **Premium UI/UX**: Features glassmorphism modals, dynamic backdrop blurs, fluid animations, and a cohesive dark/gold aesthetic.

## Prerequisites

- Node.js 18+ (recommended)
- npm 9+

## Setup

1. Clone the repository.
2. Open a terminal in the project folder.
3. Install dependencies:

```bash
npm install
```

## Run in Development

Start the app:

```bash
npm start
```

Default URL: http://localhost:3000

### Run on a Different Port

Windows PowerShell:

```powershell
$env:PORT=3002
npm start
```

macOS/Linux:

```bash
PORT=3002 npm start
```

## Production Build

Create an optimized build:

```bash
npm run build
```

The output is generated in the `build/` folder.

## Architecture & Data

The application uses **Supabase (PostgreSQL)** as the backend database with real-time data synchronization. Authentication is handled through direct User table verification.

### Database Tables

| Table           | Purpose                                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **User**        | Staff credentials and role management (admin/staff). Supports login via email or username.                                        |
| **Inventory**   | Tracks dental supplies with quantity, pricing, expiration dates, and low-stock thresholds. Auto-triggers restock/adjustment logs. |
| **Patient**     | Records patient treatment visits and consent information, linked to usage records.                                                |
| **Usage**       | Tracks supply consumption per patient treatment. Auto-deducts inventory and logs consumption transactions.                        |
| **Transaction** | Immutable audit log of all inventory movements (restock, consumption, adjustment, expiration).                                    |
| **StockAlerts** | Automatically generated alerts when inventory falls below defined thresholds.                                                     |

**Key Features:**

- **Automatic Triggers**: Database triggers auto-log transactions, enforce stock validation, and deduplicate alerts
- **Audit Trail**: Every inventory change is permanently recorded in the Transaction table
- **Cost Tracking**: Historical pricing preserved at time of consumption for accurate financial reporting
- **Data Integrity**: Foreign keys prevent orphaned records; constraints block invalid operations (e.g., negative stock)

1.  prevent_negative_quantity      → Inventory  | BEFORE UPDATE
2.  check_stock_availability       → Usage      | BEFORE INSERT
3.  fill_usage_details             → Usage      | BEFORE INSERT
4.  set_recorded_by                → Patient    | BEFORE INSERT
5.  deduct_inventory               → Usage      | AFTER INSERT
6.  log_usage_transaction          → Usage      | AFTER INSERT
7.  log_inventory_transaction      → Inventory  | AFTER UPDATE
8.  log_low_stock                  → Inventory  | AFTER UPDATE
9.  log_inventory_deletion         → Inventory  | BEFORE DELETE

For complete table documentation, see **[DATABASE_TABLES_DOCUMENTATION.md](DATABASE_TABLES_DOCUMENTATION.md)** which includes column definitions, relationships, trigger behavior, and production migration notes.

## Troubleshooting

- If styles do not appear, ensure dependencies are installed and restart the dev server.
- If npm says it cannot find `package.json`, make sure your terminal is inside this project folder before running commands.
- If data appears to reset, check if your browser is clearing `localStorage`.
