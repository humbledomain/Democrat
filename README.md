# democrat.ai

A political presence in one place: profile, posts, positions, endorsements, events, ballot help, polls, fundraising, and reach — as ten apps on one screen.

The whole site is a single static file. No build step, no framework, no dependencies to install.

## Run it

Open `index.html` in a browser. It works immediately, saving to that browser and showing a **Local mode** chip in the corner.

## Connect the backend

Follow `SETUP.md`. Short version:

1. Create a project at [supabase.com](https://supabase.com)
2. SQL Editor → paste `schema.sql` → Run
3. Paste your Project URL and anon key into the `CFG` block at the top of the script in `index.html`
4. Deploy anywhere static, then set your Site URL in Supabase → Authentication → URL Configuration

## Deploy

| Host | How |
|---|---|
| GitHub Pages | Settings → Pages → deploy from branch `main`, root |
| Vercel | Import the repo, framework preset **Other**, no build command |
| Netlify | Import the repo, no build command, publish directory `.` |

## Files

```
index.html    the entire site — markup, styles, icons, app logic
schema.sql    Supabase tables, row-level security, storage bucket
SETUP.md      step-by-step backend setup
```

## How it works

- **Public pages** — every profile is shareable at `/?u=handle`, readable without an account.
- **Passwordless auth** — email a one-tap sign-in link; no passwords stored.
- **Security in the database** — row-level security means the rules hold even if someone calls the API directly.
- **Shares are counted** — every share writes a row, so Reach reports real distribution rather than a guess.
