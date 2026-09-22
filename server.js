import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import https from 'https';

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
const NODE_ENV = process.env.NODE_ENV || 'development';
const RENDER_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

const frontendPath = path.join(__dirname, 'frontend');
const indexPath = path.join(frontendPath, 'index.html');
const adminPath = path.join(frontendPath, 'admin.html');

// ============================================================
// 🔥 TRUST PROXY — ENG BIRINCHI BO'LISHI SHART!
// Render, Heroku va boshqa proxy'lar uchun
// ============================================================
app.set('trust proxy', 1);

// ============================================================
// STARTUP LOG
// ============================================================
console.log('════════════════════════════════════════════════');
console.log('🚀 BOZORUZ BACKEND STARTING');
console.log('════════════════════════════════════════════════');
console.log('📁 Frontend:     ', frontendPath);
console.log('📄 Index:        ', indexPath, fs.existsSync(indexPath) ? '✅' : '❌');
console.log('📄 Admin:        ', adminPath, fs.existsSync(adminPath) ? '✅' : '❌');
console.log('🔗 Supabase URL: ', process.env.SUPABASE_URL || '❌');
console.log('🔑 ANON KEY:     ', process.env.SUPABASE_ANON_KEY ? '✅' : '❌');
console.log('🔑 SERVICE KEY:  ', process.env.SUPABASE_SERVICE_KEY ? '✅' : '❌');
console.log('🌍 Env:          ', NODE_ENV);
console.log('🔌 Port:         ', PORT);
console.log('🌐 Render URL:   ', RENDER_URL);
console.log('🔒 Trust proxy:  ENABLED');
console.log('════════════════════════════════════════════════');

// ============================================================
// CORS — BARCHA MUAMMOLARNI HAL QILADI
// ============================================================
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma, If-Match, If-None-Match'
  );
  res.setHeader(
    'Access-Control-Expose-Headers',
    'Content-Length, Content-Type, X-Total-Count'
  );
  res.setHeader('Access-Control-Max-Age', '86400');

  // OPTIONS preflight — darhol 200
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

// Express cors (zaxira)
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['*'],
  exposedHeaders: ['Content-Length', 'Content-Type', 'X-Total-Count'],
  maxAge: 86400,
}));

// ============================================================
// BODY PARSER
// ============================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// REQUEST LOGGER (debug uchun)
// ============================================================
app.use((req, res, next) => {
  const start = Date.now();
  const originalEnd = res.end;

  res.end = function(...args) {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusColor = status >= 500 ? '🔴' : status >= 400 ? '🟡' : '🟢';

    if (req.path.startsWith('/api')) {
      console.log(`${statusColor} ${req.method} ${req.path} → ${status} (${duration}ms)`);
    }

    originalEnd.apply(res, args);
  };

  next();
});

// ============================================================
// RATE LIMITING (OPTIONS dan tashqari)
// ============================================================
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  max: NODE_ENV === 'production' ? 2000 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  keyGenerator: (req) => {
    // Trust proxy bilan to'g'ri IP olish
    return req.ip || req.connection.remoteAddress || 'unknown';
  },
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
    trustProxy: 'enabled',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: {
        signup: 'POST /api/auth/signup',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        me: 'GET /api/auth/me',
        users: 'GET /api/auth/users (admin)',
      },
      categories: 'GET /api/categories',
      products: 'GET /api/products',
      orders: 'GET /api/orders',
      addresses: 'GET /api/addresses',
      health: 'GET /api/health',
      ping: 'GET /api/ping',
    },
  });
});

// ============================================================
// HEALTH CHECK (Render uchun muhim!)
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    ts: Date.now(),
    env: NODE_ENV,
    uptime: Math.floor(process.uptime()),
    frontend: fs.existsSync(indexPath) ? 'ok' : 'missing',
    admin: fs.existsSync(adminPath) ? 'ok' : 'missing',
    cors: 'enabled',
    trustProxy: 'enabled',
    supabase: {
      url: process.env.SUPABASE_URL ? 'configured' : 'missing',
      anon: process.env.SUPABASE_ANON_KEY ? 'configured' : 'missing',
      service: process.env.SUPABASE_SERVICE_KEY ? 'configured' : 'missing',
    },
  });
});

// ============================================================
// PING (UptimeRobot / Cron-job uchun)
// ============================================================
app.get('/api/ping', (req, res) => {
  res.json({ 
    pong: true, 
    ts: Date.now(),
    uptime: Math.floor(process.uptime()),
  });
});

// ============================================================
// API ROUTES (har biri try/catch bilan)
// ============================================================
try {
  app.use('/api/auth', authRoutes);
  console.log('✅ /api/auth yuklandi');
} catch (e) {
  console.error('❌ /api/auth xatosi:', e.message);
}

try {
  app.use('/api/categories', categoryRoutes);
  console.log('✅ /api/categories yuklandi');
} catch (e) {
  console.error('❌ /api/categories xatosi:', e.message);
}

try {
  app.use('/api/products', productRoutes);
  console.log('✅ /api/products yuklandi');
} catch (e) {
  console.error('❌ /api/products xatosi:', e.message);
}

try {
  app.use('/api/orders', orderRoutes);
  console.log('✅ /api/orders yuklandi');
} catch (e) {
  console.error('❌ /api/orders xatosi:', e.message);
}

try {
  app.use('/api/addresses', addressRoutes);
  console.log('✅ /api/addresses yuklandi');
} catch (e) {
  console.error('❌ /api/addresses xatosi:', e.message);
}

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
// ADMIN PANEL ROUTE
// ============================================================
app.get('/admin', (req, res) => {
  if (fs.existsSync(adminPath)) {
    res.sendFile(adminPath);
  } else {
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Admin topilmadi</title><meta charset="UTF-8"></head>
      <body style="font-family:system-ui;padding:40px;text-align:center">
        <h1>⚠️ Admin panel topilmadi</h1>
        <p>Kutilgan joy: <code>${adminPath}</code></p>
        <p><a href="/">→ Bosh sahifa</a></p>
      </body>
      </html>
    `);
  }
});

app.get('/admin.html', (req, res) => {
  res.redirect('/admin');
});

// ============================================================
// STATIC FRONTEND
// ============================================================
app.use(express.static(frontendPath, {
  maxAge: '1h',
  etag: true,
  index: false,
}));

// ============================================================
// SPA FALLBACK (barcha boshqa URL'lar uchun)
// ============================================================
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint topilmadi' });
  }

  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Frontend topilmadi</title><meta charset="UTF-8"></head>
      <body style="font-family:system-ui;padding:40px;max-width:600px;margin:0 auto">
        <h1>⚠️ Frontend topilmadi</h1>
        <p><strong>Kutilgan:</strong> <code>${indexPath}</code></p>
        <p><strong>Server:</strong> <code>${__dirname}</code></p>
        <hr>
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
  console.error('❌ Server xatosi:', err.message);
  console.error('   Path:', req.path);
  console.error('   Method:', req.method);

  res.status(err.status || 500).json({
    error: 'Server xatosi',
    message: NODE_ENV === 'production' ? 'Ichki server xatosi' : err.message,
  });
});

// ============================================================
// SERVER START
// ============================================================
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════╗
║   🚀 BOZORUZ BACKEND ISHGA TUSHDI!            ║
╠════════════════════════════════════════════════╣
║   📡 Port:        ${String(PORT).padEnd(28)}║
║   ✅ CORS:        ENABLED                      ║
║   🔒 Trust Proxy: ENABLED                      ║
║   🌐 Frontend:    ${(fs.existsSync(indexPath) ? 'OK' : 'MISSING').padEnd(28)}║
║   👑 Admin:       ${(fs.existsSync(adminPath) ? 'OK' : 'MISSING').padEnd(28)}║
║   🔗 Supabase:    ${(process.env.SUPABASE_URL ? 'OK' : 'MISSING').padEnd(28)}║
╚════════════════════════════════════════════════╝
  `);

  // ============================================================
  // SELF-PING (Render uxlab qolmasligi uchun)
  // ============================================================
  if (NODE_ENV === 'production' && RENDER_URL.includes('onrender.com')) {
    console.log('🔄 Self-ping yoqildi (har 14 daqiqada)');

    setInterval(() => {
      https.get(`${RENDER_URL}/api/ping`, (res) => {
        // Success
      }).on('error', (err) => {
        console.error('⚠️ Self-ping xatosi:', err.message);
      });
    }, 14 * 60 * 1000); // 14 daqiqa
  }
});

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM — Server yopilmoqda...');
  server.close(() => {
    console.log('✅ Server yopildi');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('⚠️ SIGINT — Server yopilmoqda...');
  server.close(() => {
    console.log('✅ Server yopildi');
    process.exit(0);
  });
});

// ============================================================
// UNHANDLED ERRORS
// ============================================================
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error(err.stack);
  // Process.exit qilmaymiz — server ishlashda davom etadi
});