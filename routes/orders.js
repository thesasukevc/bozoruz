import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

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

    for (const item of items) {
      try {
        await supabaseAdmin.rpc('decrement_stock', {
          p_product_id: item.id,
          p_qty: item.qty,
        });
      } catch (e) { console.error('Stock:', e); }
    }

    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

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

export default router;