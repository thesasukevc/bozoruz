import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// ============================================================
// Admin tekshirish yordamchi funksiyasi
// ============================================================
async function isAdmin(userId) {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  return profile?.role === 'admin';
}

// ============================================================
// GET /api/orders — O'z buyurtmalarim
// ============================================================
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/orders/all — Barcha buyurtmalar (FAQAT ADMIN)
// ============================================================
router.get('/all', requireAuth, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) {
      return res.status(403).json({ error: 'Admin ruxsati kerak' });
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/orders — Buyurtma yaratish
// ============================================================
router.post('/', requireAuth, async (req, res) => {
  try {
    const { items, address, phone, payment_method, comment, total } = req.body;

    if (!items?.length || !address || !phone) {
      return res.status(400).json({ error: 'Ma\'lumotlar to\'liq emas' });
    }

    const orderNumber = 'BZ' + Date.now().toString().slice(-8);

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: req.user.id,
        order_number: orderNumber,
        total,
        status: 'pending',
        payment_method,
        delivery_address: address,
        phone,
        comment,
        items,
      })
      .select()
      .single();

    if (error) throw error;

    // Stock kamaytirish
    for (const item of items) {
      try {
        await supabaseAdmin.rpc('decrement_stock', {
          p_product_id: item.id,
          p_qty: item.qty,
        });
      } catch (e) {
        console.error('Stock:', e);
      }
    }

    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ============================================================
// PATCH /api/orders/:id/cancel — Buyurtmani bekor qilish (foydalanuvchi)
// ============================================================
router.patch('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ============================================================
// PATCH /api/orders/:id/status — Holatni o'zgartirish (FAQAT ADMIN)
// ============================================================
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) {
      return res.status(403).json({ error: 'Admin ruxsati kerak' });
    }

    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Noto'g'ri holat. Ruxsat etilgan: ${validStatuses.join(', ')}`,
      });
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Update status:', err);
    res.status(400).json({ error: err.message });
  }
});

// ============================================================
// GET /api/orders/:id — Bitta buyurtma (egasi yoki admin)
// ============================================================
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;

    const admin = await isAdmin(req.user.id);

    if (order.user_id !== req.user.id && !admin) {
      return res.status(403).json({ error: 'Ruxsat yo\'q' });
    }

    res.json(order);
  } catch (err) {
    res.status(404).json({ error: 'Buyurtma topilmadi' });
  }
});

export default router;