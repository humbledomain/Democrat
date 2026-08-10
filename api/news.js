/* /api/news — the wire.
   Pulls a handful of politics feeds, merges them, and hands back plain JSON.
   No key, no dependency, no database. A feed that is down is simply skipped. */

const FEEDS = [
  { name:'NPR',               url:'https://feeds.npr.org/1014/rss.xml' },
  { name:'NPR',               url:'https://feeds.npr.org/1003/rss.xml' },
  { name:'NPR',               url:'https://feeds.npr.org/1012/rss.xml' },
  { name:'The Guardian',      url:'https://www.theguardian.com/us-news/us-politics/rss' },
  { name:'The Guardian',      url:'https://www.theguardian.com/us-news/rss' },
  { name:'ProPublica',        url:'https://www.propublica.org/feeds/propublica/main' },
  { name:'The Hill',          url:'https://thehill.com/news/feed/' },
  { name:'The Hill',          url:'https://thehill.com/homenews/feed/' },
  { name:'Politico',          url:'https://rss.politico.com/politics-news.xml' },
  { name:'Politico',          url:'https://rss.politico.com/congress.xml' },
  { name:'NBC News',          url:'https://feeds.nbcnews.com/nbcnews/public/politics' },
  { name:'CBS News',          url:'https://www.cbsnews.com/latest/rss/politics' },
  { name:'ABC News',          url:'https://abcnews.go.com/abcnews/politicsheadlines' },
  { name:'PBS NewsHour',      url:'https://www.pbs.org/newshour/feeds/rss/politics' },
  { name:'Democracy Docket',  url:'https://www.democracydocket.com/feed/' },
  { name:'Courthouse News',   url:'https://www.courthousenews.com/feed/' },
  { name:'Stateline',         url:'https://stateline.org/feed/' },
  { name:'Talking Points Memo', url:'https://talkingpointsmemo.com/feed' },
  { name:'Mother Jones',      url:'https://www.motherjones.com/politics/feed/' },
  { name:'The American Prospect', url:'https://prospect.org/api/rss/content.rss' },
  { name:'Vox',               url:'https://www.vox.com/rss/policy-and-politics/index.xml' },
  { name:'Common Dreams',     url:'https://www.commondreams.org/feeds/news.rss' },
  { name:'Roll Call',         url:'https://rollcall.com/feed/' },
  { name:'The Atlantic',      url:'https://www.theatlantic.com/feed/channel/politics/' },
  { name:'HuffPost',          url:'https://chaski.huffpost.com/us/auto/vertical/politics' },
  { name:'Axios',             url:'https://api.axios.com/feed/politics' },
  { name:'Reuters',           url:'https://www.reutersagency.com/feed/?best-topics=political-general' },
  { name:'Associated Press',  url:'https://apnews.com/hub/politics.rss' }
];

const TIMEOUT = 4500;
let CACHE = { at:0, body:null };

/* ------------------------------------------------------------- tiny parsers
   Feeds arrive with markup inside markup: CDATA wrapping HTML, HTML escaped as
   entities, and entities escaped again. Decode and strip in turns until the
   text stops changing, so no tag or &rsquo; ever reaches a reader. */
const ENT = {
  nbsp:' ', amp:'&', lt:'<', gt:'>', quot:'"', apos:"'",
  rsquo:'\u2019', lsquo:'\u2018', rdquo:'\u201d', ldquo:'\u201c', sbquo:'\u201a', bdquo:'\u201e',
  mdash:'\u2014', ndash:'\u2013', minus:'\u2212', hellip:'\u2026', bull:'\u2022', middot:'\u00b7',
  prime:'\u2032', Prime:'\u2033', deg:'\u00b0', trade:'\u2122', copy:'\u00a9', reg:'\u00ae',
  laquo:'\u00ab', raquo:'\u00bb', eacute:'\u00e9', egrave:'\u00e8', agrave:'\u00e0',
  ccedil:'\u00e7', ntilde:'\u00f1', uuml:'\u00fc', ouml:'\u00f6', auml:'\u00e4',
  aacute:'\u00e1', iacute:'\u00ed', oacute:'\u00f3', uacute:'\u00fa', euro:'\u20ac',
  pound:'\u00a3', dollar:'$', frac12:'\u00bd', times:'\u00d7', shy:'', zwnj:'', zwj:'', ensp:' ',
  emsp:' ', thinsp:' ', lrm:'', rlm:''
};
const decode = t => String(t || '')
  .replace(/&#(\d+);/g, (m,d)=>{ const n = +d; return n > 8 && n < 1114112 ? String.fromCodePoint(n) : ' ' })
  .replace(/&#x([0-9a-f]+);/gi, (m,h)=>{ const n = parseInt(h,16);
    return n > 8 && n < 1114112 ? String.fromCodePoint(n) : ' ' })
  .replace(/&([a-z][a-z0-9]{1,8});/gi, (m,n)=>{
    const v = ENT[n] !== undefined ? ENT[n] : ENT[n.toLowerCase()];
    return v !== undefined ? v : m;
  });
const strip = t => String(t || '')
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<br\s*\/?>|<\/p>|<\/div>|<\/li>/gi, ' ')
  .replace(/<[^>]*>/g, ' ');

const unwrap = t => {
  let x = String(t || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  for(let i = 0; i < 3; i++){
    const next = strip(decode(x));
    if(next === x) break;
    x = next;
  }
  return x.replace(/\s+/g, ' ').trim();
};

/* cut at a sentence if we can, a word if we cannot, never mid-word */
const clamp = (t, n) => {
  t = String(t || '').trim();
  if(t.length <= n) return t;
  const cut = t.slice(0, n);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
  if(stop > n * 0.55) return cut.slice(0, stop + 1);
  const sp = cut.lastIndexOf(' ');
  return (sp > 0 ? cut.slice(0, sp) : cut).replace(/[,;:\u2014\u2013-]+$/, '') + '\u2026';
};

const tag = (block, name) => {
  const m = block.match(new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + name + '>', 'i'));
  return m ? m[1] : '';
};
/* a picture, but only a decent one. Tracking pixels, avatars, logos and
   thumbnails are all worse than no picture at all. */
const MINW = 600;
const IMGBAD = /pixel|tracking|1x1|spacer|blank\.|\.gif(\?|$)|logo|avatar|favicon|sprite|icon[-_.]/i;
const tooSmall = url => {
  /* dimensions people put in the filename or the query string */
  const dash = url.match(/[-_](\d{2,4})x(\d{2,4})\.(?:jpe?g|png|webp)/i);
  if(dash && +dash[1] < MINW) return true;
  const q = url.match(/[?&](?:w|width|s|size|mw)=(\d{2,4})\b/i);
  if(q && +q[1] < MINW) return true;
  const res = url.match(/resize[/=](\d{2,4})x/i);
  if(res && +res[1] < MINW) return true;
  if(/\/(?:thumb|thumbs|thumbnail|small|square)\//i.test(url)) return true;
  return false;
};
const clean = u => u.replace(/&amp;/g,'&').trim();

const image = block => {
  /* media:content carries real dimensions often enough to be worth reading */
  const withDims = [...block.matchAll(/<media:(?:content|thumbnail)[^>]*>/gi)]
    .map(m => m[0])
    .map(t => ({
      url: (t.match(/url=["']([^"']+)["']/i) || [])[1] || '',
      w:  +((t.match(/width=["'](\d+)["']/i) || [])[1] || 0),
      h:  +((t.match(/height=["'](\d+)["']/i) || [])[1] || 0)
    }))
    .filter(x => x.url && !IMGBAD.test(x.url))
    .sort((a,b) => b.w - a.w);

  /* anything that states its width must state a big one */
  const sized = withDims.find(x => x.w >= MINW);
  if(sized) return clean(sized.url);
  const unsized = withDims.find(x => !x.w && !tooSmall(x.url));
  if(unsized) return clean(unsized.url);
  if(withDims.length && withDims[0].w) return '';        /* it told us, and it was small */

  const tries = [
    /<enclosure[^>]+url=["']([^"']+\.(?:jpe?g|png|webp)[^"']*)["']/i,
    /<image[^>]*>\s*<url>([^<]+)<\/url>/i,
    /<img[^>]+src=["']([^"']+)["']/i
  ];
  for(const re of tries){
    const m = block.match(re);
    if(m && m[1] && !IMGBAD.test(m[1]) && !tooSmall(m[1])) return clean(m[1]);
  }
  return '';
};
const atomLink = block => {
  const m = block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i)
         || block.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  return m ? m[1] : '';
};

function parse(xml, source){
  const out = [];
  const isAtom = /<feed[\s>]/i.test(xml) && /<entry[\s>]/i.test(xml);
  const blocks = xml.split(isAtom ? /<entry[\s>]/i : /<item[\s>]/i).slice(1);
  for(const raw of blocks){
    const block = raw.split(isAtom ? /<\/entry>/i : /<\/item>/i)[0];
    const title = unwrap(tag(block, 'title'));
    if(!title) continue;
    let link = unwrap(tag(block, 'link'));
    if(!link || !/^https?:/i.test(link)) link = atomLink(block);
    if(!/^https?:/i.test(link)) continue;
    const when = tag(block,'pubDate') || tag(block,'published') || tag(block,'updated')
              || tag(block,'dc:date');
    const t = Date.parse(unwrap(when));
    const summary = clamp(unwrap(tag(block,'description') || tag(block,'summary')
                                 || tag(block,'content:encoded')), 240);
    out.push({
      title, link, source,
      when: isFinite(t) ? new Date(t).toISOString() : null,
      summary: summary && summary.toLowerCase().replace(/\u2026$/,'') !== title.toLowerCase()
               && !/^\s*(read more|continue reading)/i.test(summary) ? summary : '',
      image: image(block)
    });
    if(out.length >= 16) break;
  }
  return out;
}

async function pull(feed){
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctl ? setTimeout(()=>ctl.abort(), TIMEOUT) : null;
  try{
    const r = await fetch(feed.url, {
      signal: ctl ? ctl.signal : undefined,
      headers: { 'user-agent':'democrat.si news reader (+https://www.democrat.si)',
                 'accept':'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' }
    });
    if(!r.ok) return [];
    const xml = await r.text();
    return parse(xml, feed.name);
  }catch(e){ return [] }
  finally{ if(timer) clearTimeout(timer) }
}

module.exports = async (req, res) => {
  /* a warm function serves the same wire for four minutes */
  if(CACHE.body && Date.now() - CACHE.at < 90e3){
    res.setHeader('cache-control', 's-maxage=90, stale-while-revalidate=600');
    return res.status(200).json(CACHE.body);
  }

  const lists = await Promise.all(FEEDS.map(pull));
  const seen = new Set();
  const items = [];
  const sources = new Set();

  lists.flat().forEach(it=>{
    const key = it.title.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().slice(0, 70);
    if(!key || seen.has(key)) return;
    seen.add(key);
    sources.add(it.source);
    items.push(it);
  });

  items.sort((a,b)=> new Date(b.when || 0) - new Date(a.when || 0));

  const body = {
    items: items.slice(0, 90),
    sources: [...sources].sort(),
    fetched: new Date().toISOString()
  };
  if(body.items.length) CACHE = { at:Date.now(), body };

  res.setHeader('cache-control', 's-maxage=90, stale-while-revalidate=600');
  return res.status(200).json(body);
};
