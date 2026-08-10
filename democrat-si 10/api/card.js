/* ============================================================================
   The share card.

   When someone posts a link to a profile, this draws the image that appears in
   iMessage, X, Slack and the rest: their photo across the top, a white band
   underneath with the blue dot, democrat.ai, and the invitation.

   White band on purpose — iMessage tints its caption bar from the bottom of the
   image, so a white footer keeps the whole card clean instead of muddy.
   ============================================================================ */

import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const BLUE   = '#0A3FD6';
const INK    = '#0b0d12';
const MUTED  = '#6b7488';
const LINE   = 'Add me in the New AI Social Network';

const SB_URL = process.env.SUPABASE_URL || 'https://bzolcreyjtbvvrsvikrq.supabase.co';
const SB_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_XL4shp-CI0dcSffUONTA5g_rGbG3Fs_';

/* satori reads plain objects shaped like elements, so no JSX build step is needed */
const el = (type, props, ...children) => ({
  type, props: { ...props, children: children.flat().filter(v => v !== null && v !== undefined && v !== false) }
});

const footer = handle => el('div',
  { style:{ display:'flex', alignItems:'center', height:'178px', padding:'0 58px', background:'#ffffff' } },
  el('div', { style:{ display:'flex', width:'54px', height:'54px', borderRadius:'27px',
                      background:BLUE, marginRight:'24px' } }),
  el('div', { style:{ display:'flex', flexDirection:'column', flexGrow:1 } },
    el('div', { style:{ display:'flex', fontSize:'46px', fontWeight:700, color:INK, letterSpacing:'-1.6px' } },
       'democrat.ai'),
    el('div', { style:{ display:'flex', fontSize:'27px', color:MUTED, marginTop:'8px' } }, LINE)),
  handle ? el('div', { style:{ display:'flex', fontSize:'30px', fontWeight:600, color:BLUE } }, '@' + handle) : null
);

export default async function handler(req){
  const url = new URL(req.url);
  const handle = (url.searchParams.get('h') || '').toLowerCase().replace(/[^a-z0-9_]/g,'').slice(0,20);

  let photo = null, name = null;
  if(handle){
    try{
      const r = await fetch(
        `${SB_URL}/rest/v1/profiles?handle=eq.${encodeURIComponent(handle)}&select=name,photo_url&limit=1`,
        { headers:{ apikey:SB_KEY, authorization:`Bearer ${SB_KEY}` } });
      if(r.ok){ const rows = await r.json(); if(rows && rows[0]){ photo = rows[0].photo_url; name = rows[0].name } }
    }catch(e){ /* draw the plain card instead */ }
  }

  const withPhoto = el('div',
    { style:{ display:'flex', flexDirection:'column', width:'1200px', height:'630px', background:'#ffffff' } },
    el('div', { style:{ display:'flex', width:'1200px', height:'452px', overflow:'hidden' } },
      el('img', { src:photo, width:1200, height:452,
                  style:{ width:'1200px', height:'452px', objectFit:'cover' } })),
    footer(handle));

  /* no photo yet: the mark, their name, and the same invitation */
  const withoutPhoto = el('div',
    { style:{ display:'flex', flexDirection:'column', justifyContent:'center', width:'1200px', height:'630px',
              background:'#ffffff', padding:'0 90px' } },
    el('div', { style:{ display:'flex', width:'92px', height:'92px', borderRadius:'46px', background:BLUE,
                        marginBottom:'34px' } }),
    name ? el('div', { style:{ display:'flex', fontSize:'64px', fontWeight:700, color:INK,
                               letterSpacing:'-2.5px', marginBottom:'10px' } }, name) : null,
    el('div', { style:{ display:'flex', fontSize:'40px', fontWeight:600, color:INK, letterSpacing:'-1.2px' } },
       handle ? '@' + handle + ' on democrat.ai' : 'democrat.ai'),
    el('div', { style:{ display:'flex', fontSize:'30px', color:MUTED, marginTop:'14px' } }, LINE));

  try{
    return new ImageResponse(photo ? withPhoto : withoutPhoto, {
      width: 1200, height: 630,
      headers: { 'cache-control':'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800' }
    });
  }catch(e){
    /* if the photo cannot be drawn for any reason, fall back to the plain card */
    try{
      return new ImageResponse(withoutPhoto, { width:1200, height:630 });
    }catch(e2){
      return Response.redirect(`${url.origin}/og.png`, 302);
    }
  }
}
