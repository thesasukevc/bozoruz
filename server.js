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

// ============ ES MODULE __dirname ============
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ============ PATHS ============
const frontendPath = path.join(__dirname, 'frontend');
const indexPath = path.join(frontendPath, 'index.html');

console.log('════════════════════════════════════════════════');
console.log('📁 Frontend path:', frontendPath);
console.log('📄 Index path:   ', indexPath);
console.log('✅ Index mavjud: ', fs.existsSync(indexPath) ? 'HA' : 'YO\'Q ❌');
console.log('════════════════════════════════════════════════');

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

// ============ API ROUTES ============
// API root
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    ok: true, 
    ts: Date.now(), 
    env: process.env.NODE_ENV || 'development',
    frontend: fs.existsSync(indexPath) ? 'ok' : 'missing',
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/addresses', addressRoutes);

// ⚠️ API 404 - MUHIM: Bu GET '*' dan OLDIN turishi kerak
app.all('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint topilmadi', 
    path: req.originalUrl 
  });
});

// ============ STATIC FRONTEND ============
app.use(express.static(frontendPath));

// ============ SPA FALLBACK ============
// Eng oxirida — barcha boshqa so'rovlar uchun index.html
app.get('*', (req, res) => {
  // API so'rovlar bu yerga yetib kelmasligi kerak (yuqorida 404 qaytariladi)
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Frontend topilmadi</title></head>
      <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
        <h1>⚠️ Frontend topilmadi</h1>
        <p><strong>Kutilgan joy:</strong> <code>${indexPath}</code></p>
        <p><strong>Server ishga tushgan joy:</strong> <code>${__dirname}</code></p>
        <hr>
        <h2>Nima qilish kerak?</h2>
        <ol>
          <li>GitHub repoda <code>frontend/index.html</code> fayli borligini tekshiring</li>
          <li>Render'da <strong>Root Directory</strong> bo'sh ekanligiga ishonch hosil qiling</li>
          <li>Qayta deploy qiling</li>
        </ol>
        <hr>
        <p><a href="/api/health">→ /api/health</a></p>
        <p><a href="/api">→ /api</a></p>
      </body>
      </html>
    `);
  }
});

// ============ ERROR HANDLER ============
app.use((err, req, res, next) => {
  console.error('❌ Server xatosi:', err);
  res.status(500).json({ 
    error: 'Server xatosi', 
    message: err.message 
  });
});

// ============ START ============
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║   🚀 BozorUz Backend ishga tushdi!            ║
╠════════════════════════════════════════════════╣
║   📡 Port:      ${PORT}                           
║   🌐 Frontend:  http://localhost:${PORT}           
║   💚 Health:    /api/health                    
╚════════════════════════════════════════════════╝
  `);
});
