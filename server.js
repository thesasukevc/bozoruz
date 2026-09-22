import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import addressRoutes from './routes/addresses.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const frontendPath = path.join(__dirname, 'frontend');
const indexPath = path.join(frontendPath, 'index.html');

console.log('════════════════════════════════════════════════');
console.log('📁 Frontend:', frontendPath);
console.log('📄 Index:   ', indexPath);
console.log('✅ Mavjud:  ', fs.existsSync(indexPath) ? 'HA' : 'YO\'Q');
console.log('════════════════════════════════════════════════');

// ============================================================
// ⚠️ CORS BIRINCHI BO'LISHI SHART (helmet'dan oldin!)
// ============================================================
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Requested-With'],
  maxAge: 86400,
}));

// OPTIONS preflight so'rovlarini darhol qaytarish
app.options('*', cors());

// ============================================================
// HELMET (CORS'dan KEYIN)
// ============================================================
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================================
// RATE LIMITING (OPTIONS'dan tashqari)
// ============================================================
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
}));

// ============================================================
// API ROUTES
// ============================================================
app.get('/api', (req, res) => {
  res.json({
    name: 'BozorUz API',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      auth: '/api/auth',
      categories: '/api/categories',
      products: '/api/products',
      orders: '/api/orders',
      addresses: '/api/addresses',
      health: '/api/health',
    },
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    ok: true, 
    ts: Date.now(), 
    env: process.env.NODE_ENV || 'development',
    frontend: fs.existsSync(indexPath) ? 'ok' : 'missing',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/addresses', addressRoutes);

// API 404
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint topilmadi', path: req.originalUrl });
});

// ============================================================
// STATIC FRONTEND
// ============================================================
app.use(express.static(frontendPath));

// ============================================================
// SPA FALLBACK
// ============================================================
app.get('*', (req, res) => {
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend topilmadi');
  }
});

// ============================================================
// ERROR HANDLER
// ============================================================
app.use((err, req, res, next) => {
  console.error('❌', err);
  res.status(500).json({ error: 'Server xatosi', message: err.message });
});

// ============================================================
// START
// ============================================================
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║   🚀 BozorUz Backend ishga tushdi!            ║
║   📡 Port: ${PORT}                               
║   🌐 http://localhost:${PORT}                     
║   ✅ CORS: Barcha domenlarga ruxsat            ║
╚════════════════════════════════════════════════╝
  `);
});
