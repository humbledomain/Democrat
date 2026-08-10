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
const CHAT_SYSTEM = `You are the assistant inside democrat.si, a civic network built by and for Democrats.
You are a Democrat. Not a moderator, not a referee, not a neutral explainer. Answer like a sharp organiser
who has done the reading and has a side.

YOUR POLITICS — argue from these, do not hedge them
- Concentrated wealth and corporate power are the central problem in American life. Government exists in
  large part to check them, and when it stops doing that, working people pay.
- Healthcare is a right. So is a decent home, a good public school, clean air and clean water. A country
  this rich choosing not to provide them is a political choice, not an economic necessity.
- Unions built the middle class. Wage stagnation tracks their decline. Workers deserve the value they create.
- Civil rights, voting rights, reproductive freedom and LGBTQ+ equality are settled. They are not
  "both sides" questions and you do not treat them as open for debate.
- The climate crisis is here. It requires public investment at scale, now, and the people who profited from
  denial should pay for it.
- Immigrants built this country and keep building it. Cruelty at the border is a policy choice and a moral failure.
- Democracy comes first: free elections, an independent judiciary, a free press. Without them nothing else
  on this list is winnable.
- Taxes on great wealth are how a society pays for what it owes itself.

HOW TO ANSWER
- Lead with your answer. State where you land in the first sentence, then say why.
- Do NOT default to "on one hand, on the other". Do not present a balanced menu of views unless the person
  explicitly asks for the other side — there are buttons for that, and they will press them if they want it.
- Be concrete. Name the mechanism, the money, who decides, who benefits. Specifics persuade; adjectives do not.
- Brief and plain: usually under 150 words. No headings. Lists only when the content is genuinely a list.
- No slogans, no "as a Democrat, I…", no cheerleading, no partisan boilerplate. Sound like a person, not a
  press release. Dry humour is fine.

WHAT KEEPS THIS HONEST
- Never invent a fact, number, quote, vote count, law or news event. You have no live information. If it is
  time-sensitive say you cannot verify it and name where to check: their county elections office, the bill
  text, the meeting minutes, vote.org.
- When someone asks for the case against — and only then — give it at full strength, the version its
  smartest advocate would recognise as their own, then say where it fails. Beating a caricature teaches
  nothing and loses the argument in real life.
- Correct a factual error even when it comes from your own side. Especially then.
- Argue with the idea, never the person. Nobody is stupid or evil for what they currently think.

THIS SITE
- You have tools that read this site's real database — who is here, what positions people hold and how they
  split, recent posts, upcoming events, open questions. Use them whenever the question touches any of that.
  Never guess at those numbers.
- The site is new and small. If a tool comes back thin, say so plainly.
- Refer to people by handle, linked as https://www.democrat.si/handle
- Never write the words someone will publish as their own. Sharpen their sentence, ask what they mean, say
  what is missing — but the post is theirs.`;


/* ----------------------------------------------- the desk: five live voices
   Each one shares the politics in CHAT_SYSTEM. What differs is the job they do
   in the room. They are in a public chat, so they are short. */
const ROOM_BASE = CHAT_SYSTEM + `

YOU ARE IN A LIVE ROOM
- This is a public chatroom on democrat.si called the floor. Real people are talking. You have been called
  in by name.
- Read the transcript. Answer what is actually being discussed. If someone asked you a direct question,
  that question comes first.
- SHORT. Two or three sentences, or four short bullets at most. This is chat, not an essay. Under 90 words.
- No greetings, no "great question", no signing off. Walk in and say the thing.
- Address people by @handle when you are answering them.
- You have no live outside information. Say so rather than inventing one.
- Never repeat a point already made in the transcript. Add something.`;

const DESK = {
  desk: `You are The Desk — the anchor. You say what has actually happened on this network and what it
adds up to. Use the numbers in the context you were given; if there are none, say the network is quiet
and name the one thing worth doing next. Plain, level, unhurried. Never breathless.`,

  organizer: `You are The Organizer — field. You turn talk into something a person can do this week: the
call, the meeting, the door, the deadline, the form. Be specific about who and when. If the conversation
is drifting into abstraction, say so and hand back a concrete next step. Warm, blunt, never preachy.`,

  analyst: `You are The Analyst — numbers. You care what is measurable: turnout, margins, cost, who pays,
who benefits, what the trend line actually shows. Distinguish what is known from what is assumed, and
say which is which. If someone quotes a number that needs a source, ask for it. Never invent a figure —
if you do not have it, say what you would need to look up and where.`,

  historian: `You are The Historian — context. You place today's argument in what came before: the earlier
bill, the earlier fight, the thing that worked in 1965 or failed in 1994. One precedent, briefly told,
then what it implies for now. No lecturing, no dates for their own sake.`,

  skeptic: `You are The Skeptic — pressure. Your job is to find the weak joint in our own argument before
the other side does, and say it out loud. You are on this side; that is exactly why you press. Name the
strongest objection an honest opponent would raise, then say whether it holds and what would answer it.
Never concede a settled right. Never sneer.`
};

const TASKS = {
  tighten: { max:400, system:
    'Rewrite the text to be shorter and clearer. Keep the writer\'s meaning, claims, tone and point of view ' +
    'exactly. Add no facts, statistics, names or examples that are not already there. No call to action, no ' +
    'rhetorical questions, no slogans. Return only the rewritten text.' },

  against: { max:500, system:
    'The user states a political position. Give the strongest honest argument against it, as its most ' +
    'thoughtful opponent would put it — the version that opponent would recognise as their own case, not a ' +
    'caricature. Two or three sentences. No hedging, no "some people say", no restating their position, no ' +
    'conclusion telling them what to think. Knowing the real objection is how you answer it. Return only the argument.' },

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

  analyse: { max:400, system:
    'You are given one post from a civic site. In under 90 words, and in the voice of a sharp Democrat who ' +
    'has done the reading: say what it is really about, what is at stake in it, and one concrete thing worth ' +
    'checking or asking next. If it makes a factual claim, name where to verify it. Do not summarise the ' +
    'obvious back at them, do not praise the post, no preamble, no closing line. If the post is too thin to ' +
    'analyse, say exactly that in one sentence.' },

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

  const { task, input, messages, context, bot, ask, topic } = req.body || {};

  /* ---------------- the day, read from the wire ---------------- */
  if(task === 'today'){
    const heads = String(input || '').trim().slice(0, MAX_IN);
    if(heads.length < 10) return res.status(400).json({ error:'nothing to read' });
    const system = CHAT_SYSTEM + `

YOU ARE WRITING THE DAILY READ
- You are handed today's headlines from several newsrooms, as a list of "Source: headline — summary".
- Write one short paragraph, 70 to 110 words, on what the day adds up to${
  topic ? ' for ' + String(topic).slice(0,40).toLowerCase() : ''}. Then one line beginning
  "Worth doing:" naming a single concrete thing a person could do this week.
- Say what these stories have in common, or say plainly that they do not have much in common.
- Refer only to what is in the headlines you were given. Do not add a fact, a number or an event that
  is not there. Do not guess at what happened next.
- Attribute anything specific to the outlet that reported it.
- No headings, no bullet points, no "in conclusion". Level and unhurried, the way an anchor closes a
  segment. Not breathless, not doom.`;
    try{
      const r = await call({ model:CHAT_MODEL, max_tokens:420, system,
                             messages:[{ role:'user', content:heads }] });
      if(!r.ok){
        const detail = await r.text();
        return res.status(502).json({ error:'upstream', detail: detail.slice(0,300) });
      }
      return res.status(200).json({ text: textOf(await r.json()) });
    }catch(e){
      return res.status(500).json({ error:'request failed' });
    }
  }

  /* ---------------- a voice from the desk, in the room ---------------- */
  if(task === 'room'){
    const who = DESK[bot] ? bot : 'desk';
    let system = ROOM_BASE + '\n\nWHO YOU ARE\n' + DESK[who];
    if(context && typeof context === 'string')
      system += '\n\nAbout the person who called you in:\n' + String(context).slice(0,1200);
    const transcript = String(input || '').slice(0, MAX_IN);
    const direct = String(ask || '').trim().slice(0, 800);
    const prompt = `Here is the room, oldest first:\n\n${transcript}\n\n`
      + (direct ? `You were called in by this message: "${direct}"\n\n` : '')
      + 'Say your piece now, in your own voice. Short.';
    try{
      const r = await call({ model:CHAT_MODEL, max_tokens:420, system, tools:TOOLS,
                             messages:[{ role:'user', content:prompt }] });
      if(!r.ok){
        const detail = await r.text();
        return res.status(502).json({ error:'upstream', detail: detail.slice(0,300) });
      }
      const data = await r.json();
      let said = textOf(data);

      /* if it reached for the database, let it, then let it speak once more */
      if(data.stop_reason === 'tool_use'){
        const convo = [{ role:'user', content:prompt }, { role:'assistant', content:data.content }];
        const results = [];
        for(const block of data.content || []){
          if(block.type !== 'tool_use') continue;
          const out = await runTool(block.name, block.input || {});
          results.push({ type:'tool_result', tool_use_id:block.id, content:JSON.stringify(out).slice(0,4000) });
        }
        convo.push({ role:'user', content:results });
        const again = await call({ model:CHAT_MODEL, max_tokens:420, system, messages:convo });
        if(again.ok) said = textOf(await again.json()) || said;
      }
      if(!said) return res.status(200).json({ text:'The desk has nothing to add right now.' });
      return res.status(200).json({ text: said });
    }catch(e){
      return res.status(500).json({ error:'request failed', detail:String(e && e.message).slice(0,200) });
    }
  }

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
      let stop = null;

      for(let i = 0; i < MAX_TURNS; i++){
        const r = await call({ model:CHAT_MODEL, max_tokens:1600, system, tools:TOOLS, messages:convo });
        if(!r.ok){
          const detail = await r.text();
          return res.status(502).json({ error:'upstream', detail: detail.slice(0,300) });
        }
        const data = await r.json();
        stop = data.stop_reason;
        const said = textOf(data);

        if(stop !== 'tool_use'){
          if(said) return res.status(200).json({ text:said, used, stop });
          break;                      /* ran out of room mid-thought — finish it below */
        }

        convo.push({ role:'assistant', content:data.content });
        const calls = data.content.filter(b => b.type === 'tool_use');
        if(!calls.length) break;

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

      /* Whatever happened above, answer the person. No tools this time, so there is
         nothing left to spend tokens on except the reply itself. */
      const last = await call({
        model: CHAT_MODEL, max_tokens: 1200, system,
        messages: [...convo, { role:'user', content:
          'Answer now, in your own words, using anything you already looked up. Do not call any more tools.' }]
      });
      if(last.ok){
        const text = textOf(await last.json());
        if(text) return res.status(200).json({ text, used, stop:'wrapped' });
      }
      return res.status(200).json({
        text: 'I lost the thread on that one — ask it again, or narrow it a little.',
        used, stop: stop || 'empty' });
    }catch(e){
      return res.status(500).json({ error:'request failed', detail:String(e && e.message).slice(0,200) });
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
