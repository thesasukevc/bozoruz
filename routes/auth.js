import express from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// ============ SIGNUP ============
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email va parol kerak' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Parol kamida 6 belgi' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Email formati noto\'g\'ri' });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: name || email.split('@')[0] },
      },
    });

    if (error) throw error;

    if (data.user) {
      try {
        await supabaseAdmin
          .from('profiles')
          .upsert({
            id: data.user.id,
            name: name || email.split('@')[0],
            email: email,
          }, { onConflict: 'id' });
      } catch (e) {
        console.error('Profile error:', e);
      }
    }

    res.json({
      user: {
        id: data.user?.id,
        email: data.user?.email,
        name: name || email.split('@')[0],
      },
      session: data.session ? {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      } : null,
      message: data.session ? 'Muvaffaqiyatli' : 'Emailni tasdiqlang',
    });
  } catch (err) {
    console.error('Signup:', err);
    res.status(400).json({ error: err.message });
  }
});

// ============ LOGIN ============
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email va parol kerak' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email, password,
    });

    if (error) throw error;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile?.name || data.user.user_metadata?.name || 'Foydalanuvchi',
        avatar: profile?.avatar_url,
        role: profile?.role || 'customer',
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    });
  } catch (err) {
    console.error('Login:', err);
    res.status(400).json({ error: 'Email yoki parol noto\'g\'ri' });
  }
});

// ============ LOGOUT ============
router.post('/logout', requireAuth, async (req, res) => {
  res.json({ ok: true });
});

// ============ ME ============
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
      },
      profile: profile || null,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ============ UPDATE PROFILE ============
router.patch('/me', requireAuth, async (req, res) => {
  try {
    const { name, phone, avatar_url } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (avatar_url) updates.avatar_url = avatar_url;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ============ FORGOT PASSWORD ============
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email kerak' });

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
    });

    if (error) throw error;
    res.json({ ok: true, message: 'Emailni tekshiring' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;