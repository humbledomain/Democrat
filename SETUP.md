# democrat.ai — turning on the backend

Right now `index.html` works on its own, saving to the browser it's opened in. It says **Local mode** in the corner when it's doing that. Four steps switch it to a real backend with accounts and shared data.

---

## 1. Create the Supabase project

Go to **supabase.com** → New project. Pick any name and region, set a database password, wait about a minute for it to finish provisioning. The free tier is enough to launch.

## 2. Create the tables

In your project: **SQL Editor** → **New query** → paste the entire contents of `schema.sql` → **Run**.

That creates every table, turns on row-level security with the right policies, adds the trigger that gives each new signup a profile row, and creates the public `avatars` storage bucket.

You should see "Success. No rows returned."

## 3. Paste your two keys

In Supabase: **Project Settings → API**. Copy the **Project URL** and the **anon / publishable** key.

Open `index.html` and find this at the top of the script, around line 8:

```js
const CFG = {
  url: '',   // https://xxxxxxxx.supabase.co
  key: ''    // anon / publishable key
};
```

Paste both values between the quotes. Save. That's the whole integration — the anon key is meant to be public; row-level security is what protects the data, and the schema already sets it up.

## 4. Put it online

Any static host works, since the site is one file.

- **Vercel** — drag the folder onto vercel.com/new, or `npx vercel` in this directory.
- **Netlify** — drag the folder onto app.netlify.com/drop.
- **GitHub Pages** — push the folder, enable Pages in repo settings.

Then in Supabase → **Authentication → URL Configuration**, set **Site URL** to your live domain and add it to **Redirect URLs**. Sign-in links won't work until you do.

---

## How it behaves once connected

**Signing in** — someone enters an email and gets a one-tap link. No passwords to store or reset. Their profile row is created automatically on first sign-in.

**Public pages** — every profile lives at `yoursite.com/?u=handle`. Anyone can open it without an account and see posts, positions, endorsements, events, polls, and the ballot checklist. Share buttons hand out that URL.

**What visitors can do** — read everything, vote in polls, like posts, RSVP, and follow, once they sign in. What they *can't* do is edit someone else's page; the database rejects it, not just the interface.

**What stays private** — logged gifts in Fundraise are visible only to the account that entered them. Everything else on a profile is public by design.

**Photos** — uploaded to the `avatars` bucket, center-cropped to a square in the browser first, stored under a folder named for the user's ID. The policy lets people write only to their own folder.

---

## Costs

Supabase free tier: 500 MB database, 1 GB file storage, 50,000 monthly active users. Vercel and Netlify both host static sites free. You'd need real traction before either starts charging, and both scale by usage after that.

## Worth doing before launch

- **Reserve handles** you don't want taken (`admin`, `support`, your own name).
- **Turn on email rate limiting** in Supabase → Authentication → Rate Limits, so nobody can spam sign-in emails.
- **Add your own SMTP** (Authentication → Email) before real volume — Supabase's built-in sender is capped and meant for testing.
- **Consider pretty URLs** — `?u=handle` works everywhere with zero config. If you'd rather have `democrat.ai/@handle`, that's a small rewrite rule on Vercel or Netlify.
