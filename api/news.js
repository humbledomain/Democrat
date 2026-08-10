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

/* ------------------------------------------------------------- tiny parsers */
const unwrap = t => String(t || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&#(\d+);/g, (m,d)=>String.fromCharCode(+d))
  .replace(/&#x([0-9a-f]+);/gi, (m,h)=>String.fromCharCode(parseInt(h,16)))
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

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
    const summary = unwrap(tag(block,'description') || tag(block,'summary')).slice(0, 260);
    out.push({
      title, link, source,
      when: isFinite(t) ? new Date(t).toISOString() : null,
      summary: summary && summary.toLowerCase() !== title.toLowerCase() ? summary : '',
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
