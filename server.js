import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import addressRoutes from './routes/addresses.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// ============ SECURITY ============
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: '*',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============ RATE LIMITING ============
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ============ API ROOT ============
app.get('/api', (req, res) => {
  res.json({
    name: 'BozorUz API',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      health: '/api/health',
      categories: '/api/categories',
      products: '/api/products',
      orders: '/api/orders',
      addresses: '/api/addresses',
      auth: '/api/auth',
    },
  });
});

// ============ HEALTH CHECK ============
app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: Date.now(), env: process.env.NODE_ENV });
});

// ============ API ROUTES ============
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/addresses', addressRoutes);

// ============ STATIC FRONTEND ============
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// ============ SPA FALLBACK ============
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// ============ API 404 ============
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint topilmadi', path: req.originalUrl });
});

// ============ ERROR HANDLER ============
app.use((err, req, res, next) => {
  console.error('❌ Server xatosi:', err);
  res.status(500).json({ error: 'Server xatosi', message: err.message });
});

// ============ START ============
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║   🚀 BozorUz Backend ishga tushdi!            ║
╠════════════════════════════════════════════════╣
║   📡 API:       http://localhost:${PORT}/api       
║   💚 Health:    http://localhost:${PORT}/api/health
║   🌐 Frontend:  http://localhost:${PORT}           
║   📦 Env:       ${process.env.NODE_ENV || 'development'}       
╚════════════════════════════════════════════════╝
  `);
});