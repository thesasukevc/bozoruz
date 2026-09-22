import express from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Categories GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/categories (admin)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, slug, icon, image_url, sort_order } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ error: 'name va slug kerak' });
    }
    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert({ name, slug, icon, image_url, sort_order: sort_order || 0 })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/categories/:id (admin)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/categories/:id (admin)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('categories')
      .update({ active: false })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;