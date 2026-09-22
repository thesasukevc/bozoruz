import { supabase, supabaseAdmin } from '../config/supabase.js';

// ============================================================
// Token orqali autentifikatsiya
// ============================================================
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token kerak' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Token yaroqsiz' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Autentifikatsiya xatosi' });
  }
}

// ============================================================
// Admin tekshiruvi
// ============================================================
export async function requireAdmin(req, res, next) {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (error || !profile) {
      return res.status(403).json({ error: 'Profil topilmadi' });
    }

    if (profile.role !== 'admin') {
      return res.status(403).json({ error: 'Admin ruxsati kerak' });
    }

    req.profile = profile;
    next();
  } catch (err) {
    console.error('requireAdmin xatosi:', err);
    res.status(403).json({ error: 'Ruxsat yo\'q' });
  }
}

// ============================================================
// Vendor yoki Admin tekshiruvi
// ============================================================
export async function requireVendorOrAdmin(req, res, next) {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (error || !profile) {
      return res.status(403).json({ error: 'Profil topilmadi' });
    }

    if (!['vendor', 'admin'].includes(profile.role)) {
      return res.status(403).json({ error: 'Vendor yoki Admin ruxsati kerak' });
    }

    req.profile = profile;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Ruxsat yo\'q' });
  }
}

// ============================================================
// Ixtiyoriy autentifikatsiya
// ============================================================
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    req.user = user || null;
    next();
  } catch {
    req.user = null;
    next();
  }
}