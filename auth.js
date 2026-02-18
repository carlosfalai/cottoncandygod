/**
 * Seva Auth — Google Sign-In via Supabase OAuth
 */

const SUPABASE_URL = 'https://gbxksgxezbljwlnlpkpz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieGtzZ3hlemJsandsbmxwa3B6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NTE1ODksImV4cCI6MjA2NDMyNzU4OX0.MCZ9NTKCUe8DLwXz8Cy2-Qr-KYPpq-tn376dpjQ6HxM';

window.SevaAuth = {
  client: null,
  user: null,
  _listeners: [],

  init() {
    if (window.supabase && window.supabase.createClient) {
      this.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      this._checkSession();
      this._listenForChanges();
    }
  },

  async _checkSession() {
    if (!this.client) return;
    try {
      const { data: { session } } = await this.client.getSession();
      if (session && session.user) {
        this.user = session.user;
        this._notify();
      }
    } catch (e) {
      console.warn('[Auth] Session check failed:', e.message);
    }
  },

  _listenForChanges() {
    if (!this.client) return;
    this.client.auth.onAuthStateChange((event, session) => {
      this.user = session ? session.user : null;
      this._notify();
      if (event === 'SIGNED_IN' && this.user) {
        this._upsertProfile(this.user);
      }
    });
  },

  async signIn() {
    if (!this.client) {
      alert('Still loading... try again in a second.');
      return;
    }
    const redirectTo = window.location.origin + window.location.pathname;
    await this.client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    });
  },

  async signOut() {
    if (this.client) {
      await this.client.auth.signOut();
    }
    this.user = null;
    this._notify();
  },

  async _upsertProfile(user) {
    if (!this.client || !user) return;
    try {
      await this.client.from('hamsa_profiles').upsert({
        id: user.id,
        name: user.user_metadata?.full_name || user.email,
        email: user.email,
        available_for_seva: true,
      }, { onConflict: 'id', ignoreDuplicates: false });
    } catch (e) { /* table may not exist yet */ }
  },

  onAuthChange(callback) {
    this._listeners.push(callback);
  },

  _notify() {
    this._listeners.forEach(fn => fn(this.user));
  },

  renderAuthButton() {
    if (this.user) {
      const name = this.user.user_metadata?.full_name || this.user.email || '';
      const avatar = this.user.user_metadata?.avatar_url || '';
      return `
        <div class="auth-user-info">
          ${avatar ? `<img src="${SevaUtils.escapeHtml(avatar)}" alt="Profile" class="auth-avatar">` : ''}
          <span class="auth-name">${SevaUtils.escapeHtml(name)}</span>
          <button class="auth-btn auth-signout" onclick="SevaAuth.signOut()">Sign Out</button>
        </div>
      `;
    }
    return `
      <button class="auth-btn auth-signin" onclick="SevaAuth.signIn()">
        <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/></svg>
        Sign in with Google
      </button>
    `;
  }
};
