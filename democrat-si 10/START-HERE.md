# Start here

Three parts. Do Part 1 today. Parts 2 and 3 whenever you're ready.

---

## Part 1 — Get the site online (10 minutes)

1. Unzip this folder.
2. Go to **github.com** and sign in.
3. Click the **+** in the top right → **New repository**.
4. Name it `democrat-ai`. Choose **Public**. Click **Create repository**.
5. On the next page click **uploading an existing file**.
6. Drag in every file from the unzipped folder. Click **Commit changes**.
7. Click **Settings** at the top of the repo, then **Pages** on the left.
8. Under "Branch," pick **main**, leave the folder as **/ (root)**, click **Save**.
9. Wait about a minute, then refresh. GitHub shows your live link at the top.

Your site is online. It works right now — you can make a profile, post, add positions.

**One catch:** at this stage everything saves only on the device it was typed on. Nobody else can see it. Part 2 fixes that.

---

## Part 2 — Let people make real accounts (20 minutes)

1. Go to **supabase.com** → **Start your project** → sign in with GitHub.
2. Click **New project**. Name it `democrat-ai`. Make up a database password and save it somewhere. Pick the region closest to you. Click **Create new project**.
3. Wait about two minutes while it sets up.
4. On the left, click **SQL Editor** → **New query**.
5. Open `schema.sql` from your folder, select all the text, copy it, paste it into the box.
6. Click **Run**. You should see "Success."
7. On the left, click the gear icon (**Project Settings**) → **API**.
8. You'll see **Project URL** and, under Project API keys, **anon public**. Keep this tab open.
9. Back in your unzipped folder, open `index.html` in TextEdit or Notepad.
10. Near the top you'll see:

```
const CFG = {
  url: '',
  key: ''
};
```

11. Paste the Project URL between the first pair of quotes. Paste the anon key between the second pair. Save the file.
12. Go back to GitHub → your repo → click `index.html` → click the pencil icon → delete everything → paste your new version → **Commit changes**.

## Part 3 — Turn on sign-in emails (2 minutes)

1. In Supabase, click **Authentication** on the left → **URL Configuration**.
2. In **Site URL**, paste your live GitHub Pages link.
3. Add the same link under **Redirect URLs**. Click **Save**.

Done. Anyone can now visit your site, enter their email, and get a sign-in link. Their profile lives at `yoursite.com/?u=theirhandle`.

---

## If something goes wrong

**The site is blank.** Give GitHub Pages two or three minutes after saving, then hard refresh (Cmd-Shift-R, or Ctrl-Shift-R on Windows).

**It still says "Local mode."** The two keys didn't save. Reopen `index.html` on GitHub and check that both sit inside the quote marks, like `url: 'https://abcd.supabase.co',`.

**The sign-in email never arrives.** Check spam first. Then confirm Part 3 — the Site URL must match your live link exactly, including `https://`.

**"That handle is taken."** Handles are unique across the whole site. Pick another.

## Making changes later

Edit any file on GitHub directly: open the file, click the pencil, edit, commit. Your live site updates in about a minute.


---

## Part 4 — Switch on the AI features (5 minutes)

Four screens use Claude, and each one works on text *you* typed. Compose and Profile can tighten your
own writing. Issues can give you the strongest argument against a position you hold. Polls can flag a
leading question. Ballot can turn a pasted measure into plain English. Until you do this step, those
buttons simply say the AI is not switched on — nothing else breaks.

1. Go to **console.anthropic.com** → sign in → **API Keys** → **Create Key**. Copy it.
2. Go to **vercel.com** → your `democrat` project → **Settings** → **Environment Variables**.
3. Name: `ANTHROPIC_API_KEY`. Value: paste the key. Leave all three environments checked. **Save**.
4. Go to **Deployments** → the top one → the three dots → **Redeploy**.

The key stays on Vercel's servers. It is never sent to anyone's browser, which is why the `api/ai.js`
file in this folder exists — every AI request goes through it.
