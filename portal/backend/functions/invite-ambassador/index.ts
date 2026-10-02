// Supabase Edge Function. Secrets stay here, never in portal/config.js.
const root = Deno.env.get('SUPABASE_URL')!;
const publicKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const secretKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const origin = Deno.env.get('PORTAL_ORIGIN') || '';
const redirect = Deno.env.get('PORTAL_REDIRECT_URL') || '';
const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json', 'Vary': 'Origin' };
const respond = (status: number, message: string) => new Response(JSON.stringify({ message }), { status, headers });
async function fetchJson(url: string, options: RequestInit) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.msg || data.message || data.error_description || 'Invitation could not be completed.');
  return data;
}
Deno.serve(async (request: Request) => {
  if (!origin || !redirect || !root || !publicKey || !secretKey) return respond(503, 'Invitations have not been configured.');
  if (request.headers.get('Origin') !== origin) return respond(403, 'This origin is not allowed.');
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return respond(405, 'POST required.');
  const bearer = request.headers.get('Authorization') || '';
  if (!bearer.startsWith('Bearer ')) return respond(401, 'Sign in first.');
  try {
    const authHeaders = { apikey: publicKey, Authorization: bearer };
    const user = await fetchJson(root + '/auth/v1/user', { headers: authHeaders });
    const profiles = await fetchJson(root + '/rest/v1/portal_profiles?id=eq.' + encodeURIComponent(user.id) + '&select=role,active', { headers: authHeaders });
    if (!profiles[0]?.active || profiles[0].role !== 'admin') return respond(403, 'Admin access required.');
    const body = await request.json();
    const email = String(body.email || '').trim();
    const name = String(body.full_name || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !name || name.length > 200) return respond(400, 'Enter a valid email and full name.');
    const serviceHeaders = { apikey: secretKey, Authorization: 'Bearer ' + secretKey, 'Content-Type': 'application/json' };
    const invited = await fetchJson(root + '/auth/v1/invite?redirect_to=' + encodeURIComponent(redirect), { method: 'POST', headers: serviceHeaders, body: JSON.stringify({ email, data: { full_name: name } }) });
    const id = invited.id || invited.user?.id;
    if (!id) throw new Error('The invitation response did not contain a user.');
    // The database trigger creates the profile inactive, with ambassador role.
    await fetchJson(root + '/rest/v1/portal_profiles?id=eq.' + encodeURIComponent(id) + '&role=eq.ambassador', { method: 'PATCH', headers: { ...serviceHeaders, Prefer: 'return=representation' }, body: JSON.stringify({ full_name: name, active: true }) }).then(rows => { if (!rows.length) throw new Error('The account needs manual activation in the admin dashboard.'); });
    return respond(200, 'Invitation sent.');
  } catch (error) { return respond(400, error instanceof Error ? error.message : 'Invitation failed.'); }
});
