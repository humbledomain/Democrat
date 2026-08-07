/* Anthropic proxy.
   The API key lives in Vercel's environment, never in the browser.
   Set it once: Vercel -> Project -> Settings -> Environment Variables -> ANTHROPIC_API_KEY
   Every task below is grounded in text the person typed. Nothing is invented from nothing. */

const MODEL      = 'claude-haiku-4-5-20251001';   // quick utility tasks
const CHAT_MODEL = 'claude-sonnet-5';             // conversation
const MAX_IN = 4000;

const TASKS = {
  tighten: {
    max: 400,
    system:
      'Rewrite the text to be shorter and clearer. Keep the writer\'s meaning, claims, tone and point of view exactly. ' +
      'Do not add facts, statistics, names or examples that are not already there. Do not add a call to action. ' +
      'Do not use rhetorical questions or slogans. Plain sentences. Return only the rewritten text, nothing else.'
  },
  against: {
    max: 500,
    system:
      'The user states a political position. Give the strongest honest argument against it, as its most thoughtful ' +
      'opponent would put it. Two or three sentences. No hedging, no "some people say", no restating their position, ' +
      'no conclusion telling them what to think. Return only the argument.'
  },
  neutral: {
    max: 300,
    system:
      'The user wrote a poll question. If the wording leads the respondent, rewrite it neutrally, keeping the same ' +
      'subject and the same decision being asked about. If it is already neutral, return it unchanged. ' +
      'Return only the question.'
  },
  invite: {
    max: 300,
    system:
      'The user gives the name, date and place of an event they are organising. Write a short invitation ' +
      'they can send, under 40 words. Use only the details given — invent no speakers, no agenda, no cause, ' +
      'no claims about who will be there. If the place is missing, do not mention a place. Plain and direct. ' +
      'Return only the invitation.'
  },
  measure: {
    max: 700,
    system:
      'The user pasted the text of a ballot measure or a piece of legislation. Explain in plain English: what it does, ' +
      'then what a yes vote means, then what a no vote means. Under 120 words. Use only what is in the text provided. ' +
      'If the text is too vague or incomplete to explain, say exactly that in one sentence and stop. ' +
      'Take no side and recommend nothing.'
  }
};

const CHAT_SYSTEM =
  'You are a thinking partner for someone working out their own political views. You are talking with a citizen, ' +
  'not a candidate. Be concrete, brief and plain: usually under 150 words, no headings, no bullet lists unless ' +
  'they ask. ' +
  'Take questions seriously and answer them. On contested political questions, give the strongest version of each ' +
  'side rather than your own verdict, and say which facts would settle it. Never tell them what to think or how to ' +
  'vote. ' +
  'You do not have live information. Never state a current officeholder, vote count, poll number, law, deadline or ' +
  'news event as fact — say what you do not know and point them at the primary source: their county elections ' +
  'office, the bill text, the meeting minutes. ' +
  'If they are working out what to say publicly, help them sharpen their own words rather than writing it for them. ' +
  'Ask a question back only when it would genuinely change your answer.';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(501).json({ error: 'not configured' });

  const { task, input, messages } = req.body || {};

  /* conversation */
  if (task === 'chat') {
    const turns = Array.isArray(messages) ? messages : [];
    const clean = turns
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-20)
      .map(m => ({ role: m.role, content: m.content.slice(0, MAX_IN) }));
    if (!clean.length) return res.status(400).json({ error: 'nothing to say' });
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: CHAT_MODEL, max_tokens: 900, system: CHAT_SYSTEM, messages: clean })
      });
      if (!r.ok) {
        const detail = await r.text();
        return res.status(502).json({ error: 'upstream', detail: detail.slice(0, 300) });
      }
      const data = await r.json();
      const out = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
      return res.status(200).json({ text: out });
    } catch (e) {
      return res.status(500).json({ error: 'request failed' });
    }
  }

  const spec = TASKS[task];
  if (!spec) return res.status(400).json({ error: 'unknown task' });
  const text = String(input || '').trim().slice(0, MAX_IN);
  if (text.length < 3) return res.status(400).json({ error: 'nothing to work with' });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: spec.max,
        system: spec.system,
        messages: [{ role: 'user', content: text }]
      })
    });

    if (!r.ok) {
      const detail = await r.text();
      return res.status(502).json({ error: 'upstream', detail: detail.slice(0, 300) });
    }
    const data = await r.json();
    const out = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
    return res.status(200).json({ text: out });
  } catch (e) {
    return res.status(500).json({ error: 'request failed' });
  }
};
