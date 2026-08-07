/* ============================================================================
   Link previews for profile pages.

   A path like /god is served through here. We fetch the app's own index.html
   and rewrite only the title and share tags for whoever's page it is, so a link
   posted to iMessage, X, Slack or Facebook shows their name, what they care
   about and their photo — instead of the same generic card every time.

   Everything else about the page is untouched; the app still runs client side.
   ============================================================================ */

const SB_URL = process.env.SUPABASE_URL || 'https://bzolcreyjtbvvrsvikrq.supabase.co';
const SB_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_XL4shp-CI0dcSffUONTA5g_rGbG3Fs_';

const RESERVED = new Set(['','index.html','api','icons','favicon.ico','og.png',
                          'apple-touch-icon.png','site.webmanifest','robots.txt','vercel.json']);

const esc = t => String(t || '').replace(/[&<>"]/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const TAGLINE = 'Where you stand, what you post, the events you turn up to and your ballot, on one link.';

module.exports = async (req, res) => {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'www.democrat.si';
  const site = `https://${host}`;

  /* the handle arrives as ?h= from the rewrite, or we read it off the path */
  let handle = (req.query && req.query.h) || '';
  if(!handle){
    handle = decodeURIComponent((req.url || '/').split('?')[0].replace(/^\/+|\/+$/g,'')).split('/')[0];
  }
  handle = String(handle).toLowerCase().replace(/[^a-z0-9_]/g,'').slice(0,20);

  /* fetch the real app shell — static files win over rewrites, so this is the raw file */
  let html;
  try{
    const r = await fetch(`${site}/index.html`, { headers:{ 'user-agent':'democrat-preview' } });
    if(!r.ok) throw new Error('shell ' + r.status);
    html = await r.text();
  }catch(e){
    res.setHeader('location', `${site}/?u=${handle}`);
    return res.status(302).end();
  }

  const serve = out => {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.setHeader('cache-control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400');
    return res.status(200).send(out);
  };

  if(!handle || RESERVED.has(handle)) return serve(html);

  /* who is this? */
  let p = null;
  try{
    const r = await fetch(
      `${SB_URL}/rest/v1/profiles?handle=eq.${encodeURIComponent(handle)}` +
      `&select=handle,name,bio,role,location,photo_url&limit=1`,
      { headers:{ apikey:SB_KEY, authorization:`Bearer ${SB_KEY}` } });
    if(r.ok){ const rows = await r.json(); p = rows && rows[0]; }
  }catch(e){ /* fall through to the plain shell */ }

  if(!p) return serve(html);

  const name  = p.name || '@' + p.handle;
  const title = `${name} · democrat.si`;
  const desc  = p.bio
    || [p.role, p.location].filter(Boolean).join(' · ')
    || TAGLINE;
  const image = p.photo_url || `${site}/og.png`;
  const card  = p.photo_url ? 'summary' : 'summary_large_image';
  const url   = `${site}/${p.handle}`;

  /* swap only the tags that describe this page */
  const set = (src, pattern, replacement) => pattern.test(src) ? src.replace(pattern, replacement) : src;
  let out = html;
  out = set(out, /<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  out = set(out, /<meta name="description"[^>]*>/, `<meta name="description" content="${esc(desc)}">`);
  out = set(out, /<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(title)}">`);
  out = set(out, /<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(desc)}">`);
  out = set(out, /<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${esc(image)}">`);
  out = set(out, /<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${esc(url)}">`);
  out = set(out, /<meta name="twitter:card"[^>]*>/, `<meta name="twitter:card" content="${card}">`);
  out = set(out, /<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${esc(title)}">`);
  out = set(out, /<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${esc(desc)}">`);
  out = set(out, /<meta name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${esc(image)}">`);

  /* a photo is square; the width and height tags describe the wide card, so drop them */
  if(p.photo_url){
    out = out.replace(/<meta property="og:image:width"[^>]*>\s*/, '')
             .replace(/<meta property="og:image:height"[^>]*>\s*/, '');
  }
  return serve(out);
};
