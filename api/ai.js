/* ============================================================================
   democrat.si — Anthropic endpoint
   The API key lives in Vercel's environment and never reaches a browser.

   Two kinds of work happen here:
     1. small grounded tasks (tighten, the case against, explain a measure...)
     2. chat, where Claude can query this site's own database through tools
        and answer from real rows instead of memory.
   ============================================================================ */

const MODEL      = 'claude-haiku-4-5-20251001';   // quick tasks
const CHAT_MODEL  = 'claude-sonnet-5';            // conversation and tool use
const MAX_IN      = 4000;
const MAX_TURNS   = 5;                            // tool round trips per message

/* Supabase is read with the publishable key — every table below is public by
   policy, so this exposes nothing that the site does not already show. */
const SB_URL = process.env.SUPABASE_URL || 'https://bzolcreyjtbvvrsvikrq.supabase.co';
const SB_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_XL4shp-CI0dcSffUONTA5g_rGbG3Fs_';

async function sb(path){
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: { apikey: SB_KEY, authorization: `Bearer ${SB_KEY}` }
  });
  if(!r.ok) throw new Error(`db ${r.status}`);
  return r.json();
}
const stateOf = loc => {
  const part = String(loc || '').split(',').pop().trim().toUpperCase();
  return /^[A-Z]{2}$/.test(part) ? part : null;
};
const inState = (row, st) => !st || stateOf(row && row.profiles && row.profiles.location) === st;
const ago = ts => {
  const s = (Date.now() - new Date(ts).getTime())/1000;
  if(s < 3600) return Math.max(1,Math.floor(s/60)) + 'm ago';
  if(s < 86400) return Math.floor(s/3600) + 'h ago';
  return Math.floor(s/86400) + 'd ago';
};

/* ------------------------------------------------------------------ tools */
const TOOLS = [
  { name:'site_numbers',
    description:'How many people, posts, positions, questions and events exist on democrat.si, overall and in one state. Use before making any claim about the size or activity of the site.',
    input_schema:{ type:'object', properties:{ state:{type:'string', description:'Two letter state code, e.g. VA'} } } },
  { name:'find_people',
    description:'People on democrat.si, optionally filtered to a state or to what they care about. Returns handles you can point the user to.',
    input_schema:{ type:'object', properties:{ state:{type:'string'}, about:{type:'string', description:'a word to match against what they care about'} } } },
  { name:'positions',
    description:'What positions people have taken and how they split between support and oppose. Use for "what do people think about X" questions.',
    input_schema:{ type:'object', properties:{ state:{type:'string'}, topic:{type:'string'} } } },
  { name:'recent_posts',
    description:'The most recent posts on the site, newest first, with who wrote them.',
    input_schema:{ type:'object', properties:{ state:{type:'string'}, limit:{type:'integer'} } } },
  { name:'upcoming_events',
    description:'Events people have posted that have not happened yet.',
    input_schema:{ type:'object', properties:{ state:{type:'string'} } } },
  { name:'open_questions',
    description:'Polls people have asked, with each option and its vote count.',
    input_schema:{ type:'object', properties:{ state:{type:'string'} } } }
];

async function runTool(name, input = {}){
  const st = (input.state || '').toUpperCase().slice(0,2) || null;

  if(name === 'site_numbers'){
    const [people, posts, issues, polls, events] = await Promise.all([
      sb('profiles?select=handle,location&handle=not.is.null&limit=1000'),
      sb('posts?select=id,profiles!posts_author_fkey(location)&limit=1000'),
      sb('issues?select=id,profiles!issues_author_fkey(location)&limit=1000'),
      sb('polls?select=id,profiles!polls_author_fkey(location)&limit=1000'),
      sb('events?select=id,date,profiles!events_author_fkey(location)&limit=1000')
    ]);
    const near = rows => st ? rows.filter(r => inState(r, st)).length : null;
    return {
      total:{ people:people.length, posts:posts.length, positions:issues.length,
              questions:polls.length, events:events.length },
      in_state: st ? { state:st,
        people: people.filter(p => stateOf(p.location)===st).length,
        posts: near(posts), positions: near(issues), questions: near(polls), events: near(events) } : null,
      note:'This site is new. Say so plainly if the numbers are small.'
    };
  }

  if(name === 'find_people'){
    let rows = await sb('profiles?select=handle,name,role,location,bio&handle=not.is.null&order=created_at.desc&limit=200');
    if(st) rows = rows.filter(p => stateOf(p.location) === st);
    if(input.about){
      const q = input.about.toLowerCase();
      rows = rows.filter(p => `${p.role||''} ${p.bio||''}`.toLowerCase().includes(q));
    }
    return { count: rows.length, people: rows.slice(0,15).map(p => ({
      handle:p.handle, name:p.name, cares_about:p.role || null, place:p.location || null,
      link:`https://www.democrat.si/${p.handle}` })) };
  }

  if(name === 'positions'){
    let rows = await sb('issues?select=title,stance,profiles!issues_author_fkey(handle,location)&order=created_at.desc&limit=400');
    if(st) rows = rows.filter(r => inState(r, st));
    if(input.topic){
      const q = input.topic.toLowerCase();
      rows = rows.filter(r => r.title.toLowerCase().includes(q));
    }
    const tally = {};
    rows.forEach(r => {
      const k = r.title.trim().toLowerCase();
      tally[k] = tally[k] || { title:r.title.trim(), support:0, oppose:0, who:[] };
      tally[k][r.stance === 'Support' ? 'support' : 'oppose']++;
      if(r.profiles && r.profiles.handle && tally[k].who.length < 6) tally[k].who.push(r.profiles.handle);
    });
    const list = Object.values(tally).sort((a,b) => (b.support+b.oppose) - (a.support+a.oppose));
    return { count:list.length, positions:list.slice(0,20) };
  }

  if(name === 'recent_posts'){
    let rows = await sb('posts?select=text,created_at,profiles!posts_author_fkey(handle,name,location)&order=created_at.desc&limit=100');
    if(st) rows = rows.filter(r => inState(r, st));
    return { count: rows.length, posts: rows.slice(0, Math.min(input.limit || 12, 25)).map(p => ({
      by: p.profiles && p.profiles.handle, when: ago(p.created_at),
      text: p.text.slice(0,400),
      link: p.profiles && p.profiles.handle ? `https://www.democrat.si/${p.profiles.handle}` : null })) };
  }

  if(name === 'upcoming_events'){
    const today = new Date().toISOString().slice(0,10);
    let rows = await sb(`events?select=title,date,place,profiles!events_author_fkey(handle,location)&date=gte.${today}&order=date&limit=100`);
    if(st) rows = rows.filter(r => inState(r, st));
    return { count: rows.length, events: rows.slice(0,15).map(e => ({
      title:e.title, date:e.date, place:e.place || null, by: e.profiles && e.profiles.handle })) };
  }

  if(name === 'open_questions'){
    let polls = await sb('polls?select=id,question,created_at,poll_options(id,text,ord),profiles!polls_author_fkey(handle,location)&order=created_at.desc&limit=40');
    if(st) polls = polls.filter(p => inState(p, st));
    const votes = await sb('poll_votes?select=poll_id,option_id&limit=2000');
    return { count: polls.length, questions: polls.slice(0,12).map(p => ({
      question:p.question, by:p.profiles && p.profiles.handle,
      total: votes.filter(v => v.poll_id === p.id).length,
      options:(p.poll_options||[]).sort((a,b)=>a.ord-b.ord).map(o => ({
        text:o.text, votes: votes.filter(v => v.option_id === o.id).length })) })) };
  }

  return { error:'unknown tool' };
}

/* --------------------------------------------------------------- prompts */
const CHAT_SYSTEM = `You are a thinking partner inside democrat.si, a site where ordinary people keep their
political positions, posts, local events and ballot information on one public page. You are talking with a
citizen, not a candidate or a campaign.

How to answer:
- Be brief and plain. Usually under 150 words. No headings. Lists only when the content is genuinely a list.
- Answer the question that was asked. Do not restate it back.
- On contested political questions give the strongest version of each side and say which facts would settle
  it. Never tell anyone what to think or how to vote.
- Ask a question back only when the answer genuinely depends on it.

What you know and do not know:
- You have no live information about the world. Never state a current officeholder, election date, vote
  count, poll result, law or news event as fact. Say you cannot verify it and name the primary source they
  should check: their county elections office, the bill text, the meeting minutes, vote.org.
- You DO have tools that read this site's real database. Use them whenever the question touches what people
  here think, who is here, what is being asked, or what is happening nearby. Never guess at those numbers.
- The site is new and small. If a tool returns little, say so plainly rather than dressing it up.
- When you mention someone from this site, use their handle, and link them as https://www.democrat.si/handle

What you never do:
- Never write the words someone will publish as their own. If they are working out what to say, help them
  sharpen their sentence, ask what they actually mean, or point out what is missing. Do not hand them a post.`;

const TASKS = {
  tighten: { max:400, system:
    'Rewrite the text to be shorter and clearer. Keep the writer\'s meaning, claims, tone and point of view ' +
    'exactly. Add no facts, statistics, names or examples that are not already there. No call to action, no ' +
    'rhetorical questions, no slogans. Return only the rewritten text.' },

  against: { max:500, system:
    'The user states a political position. Give the strongest honest argument against it, as its most ' +
    'thoughtful opponent would put it. Two or three sentences. No hedging, no "some people say", no ' +
    'restating their position, no conclusion telling them what to think. Return only the argument.' },

  neutral: { max:300, system:
    'The user wrote a poll question. If the wording leads the respondent, rewrite it neutrally, keeping the ' +
    'same subject and the same decision. If it is already neutral, return it unchanged. Return only the question.' },

  measure: { max:700, system:
    'The user pasted the text of a ballot measure or a piece of legislation. Explain in plain English: what ' +
    'it does, then what a yes vote means, then what a no vote means. Under 120 words. Use only what is in the ' +
    'text provided. If it is too vague or incomplete to explain, say exactly that in one sentence and stop. ' +
    'Take no side and recommend nothing.' },

  invite: { max:300, system:
    'The user gives the name, date and place of an event they are organising. Write a short invitation they ' +
    'can send, under 40 words. Use only the details given — invent no speakers, no agenda, no claims about ' +
    'who will attend. If the place is missing, do not mention a place. Return only the invitation.' },

  claims: { max:450, system:
    'The user is about to post the text below publicly. List only the specific factual claims in it that a ' +
    'reader could reasonably ask them to source — numbers, dates, quotes, statements about what an official ' +
    'said or did. For each, name in a few words where they could verify it. If there is nothing that needs a ' +
    'source, reply exactly: Nothing here needs a source. Never rewrite their text and never judge the opinion.' },

  interview: { max:400, system:
    'You are helping someone work out where they stand politically, one question at a time. Ask ONE short, ' +
    'concrete question about a real local trade-off — housing, transit, schools, policing, taxes, land use. ' +
    'Make it specific enough that the answer reveals a position, and neutral enough that neither answer is ' +
    'the obvious right one. Do not reference previous answers in the question itself. Under 25 words. ' +
    'Return only the question.' },

  distil: { max:800, system:
    'Below is a short interview: questions put to someone, and their own answers. Turn ONLY what they ' +
    'actually said into a list of positions. Return strict JSON, no prose, no code fence: ' +
    '{"positions":[{"title":"...","stance":"Support"|"Oppose","because":"..."}]} ' +
    'Rules: title is the issue in under seven words, in their words where possible. stance must be exactly ' +
    'Support or Oppose. because is a short quote or paraphrase of their own reason, under 15 words. ' +
    'Include a position ONLY where their answer was clear. If they were unsure, leave it out. ' +
    'Never invent a position they did not express. Maximum six.' },

  brief: { max:600, system:
    'Below is real activity from a civic site: posts, questions and events, each with a handle. Write a short ' +
    'brief of what is actually going on — three bullets at most, one line each, plainest possible language. ' +
    'Mention handles as @handle. Use only what is given; add no context, no analysis of national politics, no ' +
    'encouragement, no closing line. If there is very little activity, say that in one sentence instead.' }
};

/* ------------------------------------------------------------------ entry */
module.exports = async (req, res) => {
  if(req.method !== 'POST') return res.status(405).json({ error:'POST only' });
  const key = process.env.ANTHROPIC_API_KEY;
  if(!key) return res.status(501).json({ error:'not configured' });

  const call = body => fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{ 'content-type':'application/json', 'x-api-key':key, 'anthropic-version':'2023-06-01' },
    body: JSON.stringify(body)
  });
  const textOf = data => (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();

  const { task, input, messages, context } = req.body || {};

  /* ---------------- conversation, with tools ---------------- */
  if(task === 'chat'){
    const turns = (Array.isArray(messages) ? messages : [])
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-20)
      .map(m => ({ role:m.role, content:m.content.slice(0, MAX_IN) }));
    if(!turns.length) return res.status(400).json({ error:'nothing to say' });

    let system = CHAT_SYSTEM;
    if(context && typeof context === 'string') system += '\n\nAbout the person you are talking to:\n' + context.slice(0,1500);

    try{
      const convo = [...turns];
      const used = [];
      for(let i = 0; i < MAX_TURNS; i++){
        const r = await call({ model:CHAT_MODEL, max_tokens:1000, system, tools:TOOLS, messages:convo });
        if(!r.ok){
          const detail = await r.text();
          return res.status(502).json({ error:'upstream', detail: detail.slice(0,300) });
        }
        const data = await r.json();
        if(data.stop_reason !== 'tool_use'){
          return res.status(200).json({ text: textOf(data), used });
        }
        convo.push({ role:'assistant', content:data.content });
        const calls = data.content.filter(b => b.type === 'tool_use');
        const results = [];
        for(const c of calls){
          used.push(c.name);
          let out;
          try{ out = await runTool(c.name, c.input || {}) }
          catch(e){ out = { error:'could not read the database' } }
          results.push({ type:'tool_result', tool_use_id:c.id, content: JSON.stringify(out).slice(0,12000) });
        }
        convo.push({ role:'user', content:results });
      }
      return res.status(200).json({ text:'That needed more digging than I can do in one go — try asking it more narrowly.', used });
    }catch(e){
      return res.status(500).json({ error:'request failed' });
    }
  }

  /* ---------------- small grounded tasks ---------------- */
  const spec = TASKS[task];
  if(!spec) return res.status(400).json({ error:'unknown task' });
  const text = String(input || '').trim().slice(0, MAX_IN);
  if(text.length < 3) return res.status(400).json({ error:'nothing to work with' });

  try{
    const r = await call({ model:MODEL, max_tokens:spec.max, system:spec.system,
                           messages:[{ role:'user', content:text }] });
    if(!r.ok){
      const detail = await r.text();
      return res.status(502).json({ error:'upstream', detail: detail.slice(0,300) });
    }
    return res.status(200).json({ text: textOf(await r.json()) });
  }catch(e){
    return res.status(500).json({ error:'request failed' });
  }
};
