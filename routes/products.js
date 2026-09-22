import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth, requireVendorOrAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const {
      category, search, min_price, max_price, brand,
      sort = 'popular', page = 1, limit = 24,
    } = req.query;

    let query = supabaseAdmin
      .from('products')
      .select('*, categories(id, name, slug)', { count: 'exact' })
      .eq('active', true);

    if (category) query = query.eq('category_id', category);
    if (search) query = query.ilike('name', `%${search}%`);
    if (min_price) query = query.gte('price', parseInt(min_price));
    if (max_price) query = query.lte('price', parseInt(max_price));
    if (brand) query = query.eq('brand', brand);

    const sortMap = {
      'price-asc': ['price', true],
      'price-desc': ['price', false],
      'rating': ['rating', false],
      'new': ['created_at', false],
      'popular': ['reviews_count', false],
    };
    const [col, asc] = sortMap[sort] || sortMap.popular;
    query = query.order(col, { ascending: asc });

    const from = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(from, from + parseInt(limit) - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      products: data || [],
      total: count || 0,
      page: parseInt(page),
      pages: Math.ceil((count || 0) / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*, categories(id, name, slug), seller:profiles(id, name, avatar_url)')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;

    const { data: reviews } = await supabaseAdmin
      .from('reviews')
      .select('*, profiles(name, avatar_url)')
      .eq('product_id', req.params.id)
      .order('created_at', { ascending: false });

    res.json({ ...data, reviews: reviews || [] });
  } catch (err) {
    res.status(404).json({ error: 'Mahsulot topilmadi' });
  }
});

router.post('/', requireAuth, requireVendorOrAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({ ...req.body, seller_id: req.user.id })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', requireAuth, requireVendorOrAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', requireAuth, requireVendorOrAdmin, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('products')
      .update({ active: false })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;