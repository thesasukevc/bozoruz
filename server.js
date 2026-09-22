import express from 'express';
import cors from 'cors';
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

// ============================================================
// PATHS
// ============================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const frontendPath = path.join(__dirname, 'frontend');
const indexPath = path.join(frontendPath, 'index.html');

// ============================================================
// STARTUP LOG
// ============================================================
console.log('════════════════════════════════════════════════');
console.log('🚀 BOZORUZ BACKEND');
console.log('════════════════════════════════════════════════');
console.log('📁 Frontend:', frontendPath);
console.log('📄 Index:   ', indexPath);
console.log('✅ Mavjud:  ', fs.existsSync(indexPath) ? 'HA' : 'YO\'Q ❌');
console.log('🔗 Supabase:', process.env.SUPABASE_URL || 'YO\'Q ❌');
console.log('🌍 Env:     ', process.env.NODE_ENV || 'development');
console.log('🔌 Port:    ', PORT);
console.log('════════════════════════════════════════════════');

// ============================================================
// 🔥 CORS - ENG BIRINCHI VA ENG MUHIM!
// Bu middleware barcha CORS muammolarini hal qiladi
// ============================================================
app.use((req, res, next) => {
  // Origin - qaysi domendan kelgan
  const origin = req.headers.origin;
  
  // Barcha domenlarga ruxsat
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Ruxsat berilgan metodlar
  res.header(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD'
  );
  
  // Ruxsat berilgan sarlavhalar
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma'
  );
  
  // Exposed sarlavhalar
  res.header(
    'Access-Control-Expose-Headers',
    'Content-Length, Content-Type, X-Total-Count'
  );
  
  // Preflight cache (24 soat)
  res.header('Access-Control-Max-Age', '86400');
  
  // OPTIONS preflight so'rovlari uchun darhol 200 qaytarish
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Express cors (zaxira sifatida)
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Origin', 
    'X-Requested-With', 
    'Content-Type', 
    'Accept', 
    'Authorization',
    'Cache-Control',
    'Pragma',
  ],
  exposedHeaders: ['Content-Length', 'Content-Type', 'X-Total-Count'],
  maxAge: 86400,
}));

// ============================================================
// BODY PARSER
// ============================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// RATE LIMITING (OPTIONS dan tashqari)
// ============================================================
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  max: 1000,                 // 1000 so'rov
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: { error: 'Juda ko\'p so\'rov. 15 daqiqadan keyin urinib ko\'ring.' },
}));

// ============================================================
// API ROOT
// ============================================================
app.get('/api', (req, res) => {
  res.json({
    name: 'BozorUz API',
    version: '1.0.0',
    status: 'online',
    cors: 'enabled',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: {
        signup: 'POST /api/auth/signup',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        me: 'GET /api/auth/me',
      },
      categories: 'GET /api/categories',
      products: 'GET /api/products',
      orders: 'GET /api/orders',
      addresses: 'GET /api/addresses',
      health: 'GET /api/health',
    },
  });
});

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    ts: Date.now(),
    env: process.env.NODE_ENV || 'development',
    frontend: fs.existsSync(indexPath) ? 'ok' : 'missing',
    cors: 'enabled',
    supabase: process.env.SUPABASE_URL ? 'configured' : 'missing',
  });
});

// ============================================================
// API ROUTES
// ============================================================
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/addresses', addressRoutes);

// ============================================================
// API 404 HANDLER
// ============================================================
app.all('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint topilmadi',
    path: req.originalUrl,
    method: req.method,
  });
});

// ============================================================
// STATIC FRONTEND
// ============================================================
app.use(express.static(frontendPath, {
  maxAge: '1h',
  etag: true,
}));

// ============================================================
// SPA FALLBACK (barcha boshqa URL'lar uchun)
// ============================================================
app.get('*', (req, res) => {
  // API so'rovlari bu yerga yetib kelmasligi kerak (yuqorida ushlanadi)
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint topilmadi' });
  }
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Frontend topilmadi</title>
        <meta charset="UTF-8">
      </head>
      <body style="font-family:system-ui;padding:40px;max-width:600px;margin:0 auto">
        <h1>⚠️ Frontend topilmadi</h1>
        <p><strong>Kutilgan joy:</strong> <code>${indexPath}</code></p>
        <p><strong>Server joyi:</strong> <code>${__dirname}</code></p>
        <hr>
        <h2>API test:</h2>
        <p><a href="/api">→ /api</a></p>
        <p><a href="/api/health">→ /api/health</a></p>
      </body>
      </html>
    `);
  }
});

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================
app.use((err, req, res, next) => {
  console.error('❌ Server xatosi:', err);
  console.error('Path:', req.path);
  console.error('Method:', req.method);
  
  res.status(err.status || 500).json({
    error: 'Server xatosi',
    message: process.env.NODE_ENV === 'production' 
      ? 'Ichki server xatosi' 
      : err.message,
  });
});

// ============================================================
// SERVER START
// ============================================================
const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║   🚀 BozorUz Backend ishga tushdi!            ║
╠════════════════════════════════════════════════╣
║   📡 Port:        ${String(PORT).padEnd(28)}║
║   ✅ CORS:        ENABLED                      ║
║   🌐 Frontend:    ${fs.existsSync(indexPath) ? 'OK' : 'MISSING'}                           ║
║   🔗 Supabase:    ${process.env.SUPABASE_URL ? 'OK' : 'MISSING'}                           ║
╚════════════════════════════════════════════════╝
  `);
});

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM signal qabul qilindi. Server yopilmoqda...');
  server.close(() => {
    console.log('✅ Server yopildi');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('⚠️ SIGINT signal qabul qilindi. Server yopilmoqda...');
  server.close(() => {
    console.log('✅ Server yopildi');
    process.exit(0);
  });
});

// ============================================================
// UNHANDLED ERRORS
// ============================================================
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});
