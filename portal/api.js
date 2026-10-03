const key = 'mua-portal-session-v1';
export class PortalAPI {
  constructor(config) {
    this.url = (config.supabaseUrl || '').replace(/\/$/, '');
    this.key = config.publishableKey || '';
    this.session = null;
    this.refreshing = null;
    try { this.session = JSON.parse(sessionStorage.getItem(key) || 'null'); } catch { sessionStorage.removeItem(key); }
  }
  get configured() { return /^https:\/\/[^/]+$/.test(this.url) && this.key.length > 20; }
  setSession(data) {
    this.session = { access_token: data.access_token, refresh_token: data.refresh_token, expires_at: data.expires_at || Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600) };
    sessionStorage.setItem(key, JSON.stringify(this.session));
  }
  clearSession() { this.session = null; sessionStorage.removeItem(key); }
  async request(path, { method = 'GET', body, auth = true, retry = true } = {}) {
    if (!this.configured) throw new Error('The portal has not been connected yet. Contact the MUA administrator.');
    if (auth && !this.session) throw new Error('Please sign in to continue.');
    if (auth && this.session.expires_at <= Date.now() / 1000 + 30) await this.refresh();
    const headers = { apikey: this.key, 'Content-Type': 'application/json' };
    if (auth) headers.Authorization = 'Bearer ' + this.session.access_token;
    const response = await fetch(this.url + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await response.text();
    let data; try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    if (response.status === 401 && auth && retry) {
      await this.refresh(); return this.request(path, { method, body, auth, retry: false });
    }
    if (!response.ok) throw new Error(data?.msg || data?.error_description || data?.message || data?.error || 'The request failed. Please try again.');
    return data;
  }
  async refresh() {
    if (this.refreshing) return this.refreshing;
    if (!this.session?.refresh_token) throw new Error('Your session ended. Please sign in again.');
    this.refreshing = (async () => {
      try {
        const data = await this.request('/auth/v1/token?grant_type=refresh_token', { method: 'POST', auth: false, body: { refresh_token: this.session.refresh_token } });
        this.setSession(data);
      } catch (error) { this.clearSession(); throw new Error('Your session ended. Please sign in again.'); }
      finally { this.refreshing = null; }
    })();
    return this.refreshing;
  }
  async signIn(email, password) {
    const data = await this.request('/auth/v1/token?grant_type=password', { method: 'POST', auth: false, body: { email, password } });
    this.setSession(data);
  }
  async signOut() { try { if (this.session) await this.request('/auth/v1/logout', { method: 'POST' }); } finally { this.clearSession(); } }
  async user() { return this.request('/auth/v1/user'); }
  async profile() {
    const user = await this.user();
    return (await this.request('/rest/v1/portal_profiles?id=eq.' + encodeURIComponent(user.id) + '&select=*'))[0];
  }
  rpc(name, args) { return this.request('/rest/v1/rpc/' + name, { method: 'POST', body: args }); }
  proposals() { return this.request('/rest/v1/portal_proposals?select=*&order=updated_at.desc'); }
  leads() { return this.request('/rest/v1/portal_leads?select=*&order=updated_at.desc'); }
  projects() { return this.request('/rest/v1/portal_projects?select=*&order=updated_at.desc'); }
  documents() { return this.request('/rest/v1/portal_documents?select=*&order=issued_at.desc'); }
  services() { return this.request('/rest/v1/portal_services?select=*&order=name.asc'); }
  profiles() { return this.request('/rest/v1/portal_profiles?select=*&order=created_at.desc'); }
  events(id) { return this.request('/rest/v1/portal_events?proposal_id=eq.' + encodeURIComponent(id) + '&select=*&order=created_at.asc'); }
  recover(email) { return this.request('/auth/v1/recover?redirect_to=' + encodeURIComponent(new URL('./index.html', location.href).href), { method: 'POST', auth: false, body: { email } }); }
  setPassword(password) { return this.request('/auth/v1/user', { method: 'PUT', body: { password } }); }
  invite(email, full_name) { return this.request('/functions/v1/invite-ambassador', { method: 'POST', body: { email, full_name } }); }
}
