/* /api/news — the wire.
   Pulls a handful of politics feeds, merges them, and hands back plain JSON.
   No key, no dependency, no database. A feed that is down is simply skipped. */

const FEEDS = [
  { name:'NPR',              url:'https://feeds.npr.org/1014/rss.xml' },
  { name:'NPR',              url:'https://feeds.npr.org/1003/rss.xml' },
  { name:'The Guardian',     url:'https://www.theguardian.com/us-news/us-politics/rss' },
  { name:'ProPublica',       url:'https://www.propublica.org/feeds/propublica/main' },
  { name:'The Hill',         url:'https://thehill.com/news/feed/' },
  { name:'Politico',         url:'https://rss.politico.com/politics-news.xml' },
  { name:'NBC News',         url:'https://feeds.nbcnews.com/nbcnews/public/politics' },
  { name:'CBS News',         url:'https://www.cbsnews.com/latest/rss/politics' },
  { name:'Democracy Docket', url:'https://www.democracydocket.com/feed/' }
];

const TIMEOUT = 6000;
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
      summary: summary && summary.toLowerCase() !== title.toLowerCase() ? summary : ''
    });
    if(out.length >= 25) break;
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
  if(CACHE.body && Date.now() - CACHE.at < 240e3){
    res.setHeader('cache-control', 's-maxage=240, stale-while-revalidate=900');
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
    items: items.slice(0, 70),
    sources: [...sources].sort(),
    fetched: new Date().toISOString()
  };
  if(body.items.length) CACHE = { at:Date.now(), body };

  res.setHeader('cache-control', 's-maxage=240, stale-while-revalidate=900');
  return res.status(200).json(body);
};
