import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// ============================================================
// ENV VALIDATSIYA
// ============================================================
const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY'];
const missing = required.filter(k => !process.env[k]);

if (missing.length > 0) {
  console.error('════════════════════════════════════════════════');
  console.error('❌ MISSING ENVIRONMENT VARIABLES');
  console.error('════════════════════════════════════════════════');
  missing.forEach(k => console.error(`   ❌ ${k}`));
  console.error('════════════════════════════════════════════════');
  console.error('📝 Render Dashboard → Environment → qo\'shing');
  console.error('════════════════════════════════════════════════');
  process.exit(1);
}

// ============================================================
// KALIT FORMATINI TEKSHIRISH
// ============================================================
const validateKey = (name, key) => {
  if (!key) {
    console.error(`❌ ${name} bo'sh`);
    return false;
  }
  
  // JWT format: 3 qismdan iborat, `.` bilan ajratilgan, `eyJ` bilan boshlanadi
  const isJWT = key.startsWith('eyJ') && key.split('.').length === 3;
  
  // Yangi format: `sb_publishable_...` yoki `sb_secret_...`
  const isNewFormat = key.startsWith('sb_publishable_') || key.startsWith('sb_secret_');
  
  if (isJWT) {
    console.log(`✅ ${name}: JWT format (${key.slice(0, 20)}...)`);
    return true;
  }
  
  if (isNewFormat) {
    console.warn(`⚠️  ${name}: Yangi format (${key.slice(0, 30)}...)`);
    console.warn(`   ⚠️  Bu format @supabase/supabase-js bilan ishlamasligi mumkin!`);
    console.warn(`   ⚠️  Supabase → Settings → API → Legacy API keys'dan JWT oling`);
    return true; // Urinish uchun davom et
  }
  
  console.warn(`⚠️  ${name}: Noma'lum format (${key.slice(0, 20)}...)`);
  return true;
};

console.log('════════════════════════════════════════════════');
console.log('🔐 SUPABASE KONFIGURATSIYA');
console.log('════════════════════════════════════════════════');
console.log('🔗 URL:', process.env.SUPABASE_URL);
validateKey('SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY);
validateKey('SUPABASE_SERVICE_KEY', process.env.SUPABASE_SERVICE_KEY);
console.log('════════════════════════════════════════════════');

// ============================================================
// CLIENT OPTIONS
// ============================================================
const clientOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'x-application-name': 'bozoruz-backend',
    },
  },
};

// ============================================================
// PUBLIC CLIENT (RLS)
// ============================================================
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  clientOptions
);

// ============================================================
// ADMIN CLIENT (bypass RLS)
// ============================================================
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  clientOptions
);

// ============================================================
// ULANISH TESTI
// ============================================================
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('id, name')
      .limit(1);
    
    if (error) throw error;
    
    console.log('✅ Supabase ulanish: OK');
    return { ok: true };
  } catch (err) {
    console.error('❌ Supabase ulanish xatosi:', err.message);
    console.error('   Kod:', err.code);
    console.error('   Tafsilot:', err.details || 'yo\'q');
    
    // Aniq xatolikni aniqlash
    if (err.message?.includes('Invalid API key')) {
      console.error('   🔑 API kalit noto\'g\'ri formatda!');
      console.error('   💡 Supabase → Settings → API → Legacy API keys → JWT oling');
    }
    if (err.message?.includes('relation') && err.message?.includes('does not exist')) {
      console.error('   📊 SQL schema ishga tushirilmagan!');
      console.error('   💡 Supabase → SQL Editor → SQL ishga tushiring');
    }
    if (err.message?.includes('fetch failed')) {
      console.error('   🌐 Tarmoq xatosi — Supabase URL noto\'g\'ri');
    }
    
    return { ok: false, error: err.message };
  }
}

// ============================================================
// AVTOMATIK TEST (server ishga tushganda)
// ============================================================
setTimeout(async () => {
  await testSupabaseConnection();
}, 1000);