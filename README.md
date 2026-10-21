# Clean_EveryDay - E-Commerce Platform

A full-stack e-commerce web platform for home cleaning products and essentials, featuring a customer-facing storefront, an admin management dashboard, and a Node.js/Express REST API.

---

## 📁 Project Architecture

- **`customer-frontend/`**: Modern React + Vite + Tailwind CSS storefront for customers to browse cleaning products, add items to cart, place orders, authenticate, and view invoices.
- **`admin-frontend/`**: React + Vite + Tailwind CSS management portal for administrators to manage product catalogs, inventory, orders, customer accounts, and reviews.
- **`Server/`**: Express.js REST API with MongoDB (Mongoose), Firebase Admin, Cloudinary image storage, JWT authentication, and Nodemailer.

---

## 🚀 Deployment on Vercel

This repository is optimized for deployment on [Vercel](https://vercel.com). You can deploy the services individually (recommended for monorepos) or deploy the full stack.

### Option 1: Deploy as Individual Services (Recommended)

In your Vercel Dashboard, import this Git repository and create 3 separate projects:

#### 1. Backend Server (`Server`)
- **Root Directory**: `Server`
- **Framework Preset**: Other
- **Environment Variables**:
  - `MONGO_URI`: Your MongoDB connection string
  - `JWT_SECRET`: Secret key for JWT tokens
  - `FRONTEND_URL`: URL of the deployed customer-frontend (e.g. `https://your-store.vercel.app`)
  - `ADMIN_FRONTEND_URL`: URL of the deployed admin-frontend (e.g. `https://your-admin.vercel.app`)
  - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
  - `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` (Optional: for order notifications)

#### 2. Customer Storefront (`customer-frontend`)
- **Root Directory**: `customer-frontend`
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_BACKEND_URI`: Deployed Server API URL (e.g. `https://your-server.vercel.app/api`)

#### 3. Admin Dashboard (`admin-frontend`)
- **Root Directory**: `admin-frontend`
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_BACKEND_URI`: Deployed Server API URL (e.g. `https://your-server.vercel.app/api`)

---

### Option 2: Unified Deployment (Root `vercel.json`)
The root directory includes a `vercel.json` configured to route `/api/*` to the Express backend and all other routes to the customer storefront single-page application.
- Simply import the root repository in Vercel with default settings.
- Add the required environment variables from `Server/.env.example`.

---

## 💻 Local Development

### 1. Server
```bash
cd Server
npm install
npm run dev
```

### 2. Customer Frontend
```bash
cd customer-frontend
npm install
npm run dev
```

### 3. Admin Frontend
```bash
cd admin-frontend
npm install
npm run dev
```

