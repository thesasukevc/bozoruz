import { supabase } from '../config/supabase.js';

export async function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token kerak' });
    }

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

export async function requireAdmin(req, res, next) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin ruxsati kerak' });
    }
    next();
  } catch (err) {
    res.status(403).json({ error: 'Ruxsat yo\'q' });
  }
}

export async function requireVendorOrAdmin(req, res, next) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (!['vendor', 'admin'].includes(profile?.role)) {
      return res.status(403).json({ error: 'Vendor yoki Admin ruxsati kerak' });
    }
    next();
  } catch (err) {
    res.status(403).json({ error: 'Ruxsat yo\'q' });
  }
}