// ═══════════════════════════════════════════════════════════════════
// CalcMaster — Supabase / LocalStorage Sync Middleware  v1.1
// ═══════════════════════════════════════════════════════════════════

'use strict';

// ── Credentials (set by user — already provided below) ─────────────
let SUPABASE_URL      = "https://tktoltdyrrekvbcsldpf.supabase.co";
let SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrdG9sdGR5cnJla3ZiY3NsZHBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5Mzg3NTEsImV4cCI6MjA5OTUxNDc1MX0.YfIo9ycdLWeLSlvQ5D0m7D0ERIM_slaV1N6nhP76yms";

let supabaseClient   = null;
let isCloudConnected = false;

// ── Bootstrap ───────────────────────────────────────────────────────
function initSupabase() {
  // Allow runtime overrides from localStorage (in case user changes creds later)
  const savedUrl = localStorage.getItem('CALCMASTER_SUPABASE_URL');
  const savedKey = localStorage.getItem('CALCMASTER_SUPABASE_KEY');
  if (savedUrl) SUPABASE_URL      = savedUrl;
  if (savedKey) SUPABASE_ANON_KEY = savedKey;

  if (SUPABASE_URL && SUPABASE_ANON_KEY && typeof supabase !== 'undefined') {
    try {
      supabaseClient   = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      isCloudConnected = true;
      console.log('[CalcMaster] Supabase connected ✓');
    } catch (err) {
      console.warn('[CalcMaster] Supabase init failed — using Local Mode.', err);
      isCloudConnected = false;
    }
  } else {
    console.log('[CalcMaster] No Supabase credentials — Local Mode active.');
    isCloudConnected = false;
  }
}

// ── Transparent DB Interface ────────────────────────────────────────
const SyncDB = {

  // Returns a user object with at least { id, email, username } or null
  async getCurrentUser() {
    if (isCloudConnected && supabaseClient) {
      try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
          return {
            id:       user.id,
            email:    user.email,
            username: user.user_metadata?.username || user.email?.split('@')[0] || 'User',
          };
        }
      } catch (e) { /* fall through to local */ }
    }
    const stored = localStorage.getItem('CALCMASTER_MOCK_USER');
    return stored ? JSON.parse(stored) : null;
  },

  // Sign in — throws on hard failure
  async login(email, password) {
    if (isCloudConnected && supabaseClient) {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const u = data.user;
      return { id: u.id, email: u.email, username: u.user_metadata?.username || u.email?.split('@')[0] || 'User' };
    } else {
      const mockUser = {
        id:         'local-' + Date.now(),
        email:      email,
        username:   email.split('@')[0],
        created_at: new Date().toISOString(),
      };
      localStorage.setItem('CALCMASTER_MOCK_USER', JSON.stringify(mockUser));
      return mockUser;
    }
  },

  // Sign up — throws on hard failure
  async signUp(email, password, username) {
    if (isCloudConnected && supabaseClient) {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { username: username || email.split('@')[0] }
        }
      });
      if (error) throw error;
      const u = data.user;
      return { id: u.id, email: u.email, username: username || u.email?.split('@')[0] || 'User' };
    } else {
      const mockUser = {
        id:         'local-' + Date.now(),
        email:      email,
        username:   username || email.split('@')[0],
        created_at: new Date().toISOString(),
      };
      localStorage.setItem('CALCMASTER_MOCK_USER', JSON.stringify(mockUser));
      return mockUser;
    }
  },

  async logout() {
    if (isCloudConnected && supabaseClient) {
      await supabaseClient.auth.signOut();
    }
    localStorage.removeItem('CALCMASTER_MOCK_USER');
  },

  async saveCalculation(calc) {
    const localId = 'calc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const item = {
      id:         localId,
      ...calc,
      created_at: new Date().toISOString(),
    };

    // Try cloud insert
    if (isCloudConnected && supabaseClient) {
      try {
        const user = await this.getCurrentUser();
        if (user) {
          // Send all fields including id so local and cloud stay in sync
          const cloudItem = {
            id:           item.id,
            user_id:      user.id,
            title:        item.title        || '',
            expression:   item.expression   || '',
            calc_type:    item.calc_type     || 'simple',
            result_latex: item.result_latex  || '',
            steps_json:   item.steps_json    || [],
            created_at:   item.created_at,
          };
          const { error } = await supabaseClient
            .from('calculations')
            .insert([cloudItem]);
          if (error) {
            console.warn('[CalcMaster] Cloud insert error:', error.message, error.details);
          } else {
            console.log('[CalcMaster] Saved to Supabase ✓');
          }
        } else {
          console.warn('[CalcMaster] No authenticated user — saving locally only.');
        }
      } catch (e) { console.warn('[CalcMaster] saveCalculation cloud error:', e); }
    }

    // Always cache locally too
    const log = JSON.parse(localStorage.getItem('CALCMASTER_HISTORY') || '[]');
    log.unshift(item);
    localStorage.setItem('CALCMASTER_HISTORY', JSON.stringify(log.slice(0, 500)));
    return item;
  },

  async getHistory() {
    if (isCloudConnected && supabaseClient) {
      try {
        const user = await this.getCurrentUser();
        if (user) {
          const { data, error } = await supabaseClient
            .from('calculations')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(200);
          if (error) {
            console.warn('[CalcMaster] getHistory error:', error.message);
          } else if (data && data.length > 0) {
            return data;
          }
        }
      } catch (e) { console.warn('[CalcMaster] getHistory exception:', e); }
    }
    return JSON.parse(localStorage.getItem('CALCMASTER_HISTORY') || '[]');
  },

  async deleteCalculation(id) {
    if (isCloudConnected && supabaseClient) {
      try {
        await supabaseClient.from('calculations').delete().eq('id', id);
      } catch (e) { /* ignore */ }
    }
    let log = JSON.parse(localStorage.getItem('CALCMASTER_HISTORY') || '[]');
    log = log.filter(x => x.id !== id);
    localStorage.setItem('CALCMASTER_HISTORY', JSON.stringify(log));
  },

  async clearHistory() {
    if (isCloudConnected && supabaseClient) {
      try {
        const user = await this.getCurrentUser();
        if (user) await supabaseClient.from('calculations').delete().eq('user_id', user.id);
      } catch (e) { /* ignore */ }
    }
    localStorage.setItem('CALCMASTER_HISTORY', '[]');
  },
};

// ── Auto-init ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initSupabase);
