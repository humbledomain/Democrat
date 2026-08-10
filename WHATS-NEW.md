# What's new

## The wire reads clean

You were seeing `<p>` tags and `&rsquo;` in the summaries. Feeds nest markup inside markup — CDATA
wrapping HTML, HTML escaped as entities, entities escaped again — and I was stripping tags *before*
decoding entities, so escaped tags reappeared afterwards. It now decodes and strips in turns until
the text stops changing, with a table of every entity these feeds actually use. Scripts and styles
are removed whole, paragraph ends become spaces rather than running words together, and the browser
cleans anything the server misses using an inert parser that can't execute what it's reading.

Summaries also end where a sentence does now, or failing that a word — never mid-word.

## The top bar

The crawl moved right, up against the tools, in a bounded column so it can't push anything around.
**LIVE now sits tight against the wordmark** — the two are one group with a 9px gap, so the red dot
reads as part of the logo rather than as a separate thing. On a phone the crawl still drops to its
own row underneath.

## Any language

A globe in the top bar, twenty languages: Spanish, Chinese, Tagalog, Vietnamese, Arabic, French,
Korean, Russian, Portuguese, Haitian Creole, Hindi, German, Japanese, Italian, Polish, Somali,
Amharic, Ukrainian, Farsi — and English.

Nothing is pre-translated. The words actually on your screen get translated once, cached in your
browser for good, and applied — so the second time you meet a phrase it appears instantly and costs
nothing. It covers everything: the chrome, the news, the posts, the placeholders in the boxes you
type into. Handles, hashtags, links, numbers and names are left exactly as they are, and Arabic and
Farsi flip the whole layout right to left. Timestamps stay as they are because they tick.

It runs through your Anthropic key, so it costs a fraction of a cent the first time someone reads a
page in a new language, and nothing after that.

## Order

Town Hall moved above Chat. Fundraise is last. The phone tabs follow: Today, Town Hall, Feed, Chat,
Profile.


## Live, everywhere

**LIVE is back on the logo** — red dot, pulsing, right after the wordmark. It's honest: it goes grey
and reads OFFLINE the moment the connection drops, and lights again when it returns. The crawl stays
where it is, to the right, still rotating.

**A live column in the town hall.** Everything happening, newest first, in one stream: posts,
positions taken, what's being said on the floor, questions asked, people joining, and the wire. Each
row is timed and clickable — a wire row opens the reader, a post opens the post. It updates itself
the moment anything lands.

**Clocks tick.** Every timestamp on the page corrects itself every thirty seconds without a repaint,
so "2m ago" doesn't sit there saying 2m for an hour.

**The wire refreshes on its own** — every two and a half minutes while you're looking, immediately
when you come back to the tab, and again when the connection returns. The server cache dropped from
four minutes to ninety seconds.

## Twenty-eight feeds

Up from nine. NPR (politics, national, elections), The Guardian, ProPublica, The Hill, Politico
(politics and congress), NBC, CBS, ABC, PBS NewsHour, AP, Reuters, Axios, Vox, The Atlantic,
HuffPost, Mother Jones, The American Prospect, Common Dreams, Talking Points Memo, Roll Call,
Democracy Docket, Courthouse News, Stateline. Any feed that's down is skipped; the page never waits
more than four and a half seconds on one.

## No soft pictures

Two gates. The server refuses any image that declares a width under 600px, or admits to being small
in its filename (`-150x150`), its query string (`?s=200`), its resize instruction, or its folder
(`/thumbs/`) — plus logos, avatars and tracking pixels. Then the browser checks the real width once
the image loads and removes anything under 700px on a hero and 560px on a thumbnail.

A story with no good picture simply runs without one, which looks far better than a blurry one.


## This round

**Today moved under People** in the rail, and the site opens on your profile again — it's a social
network, so it opens where you are.

**Stories open in a reader**, not another tab. Tap a headline and it comes up over the site: the
picture, the headline, the summary, and a *Why it matters* button that reads only what's on screen.
Close it and you're back where you were — Esc, the ✕, or a tap outside. The full story is one button
away at the outlet that wrote it. Cmd-click a headline and you still get a real new tab.

The wire now carries pictures too — a hero on the lead story, thumbnails down the list — pulled from
the feeds themselves, with tracking pixels filtered out.

**Every number is a button.** On a profile: Followers and Following open the actual list of people,
each with a Message button; Posts goes to your posts in the feed; Shares opens the share sheet. On
Reach the same, plus Votes cast → Polls.


## Today — the front page

A new first screen, and the one the site now opens on. Two halves.

**The wire.** Real headlines, newest first, merged from nine politics newsrooms — NPR, The Guardian,
ProPublica, The Hill, Politico, NBC, CBS, Democracy Docket. The top story runs at headline size with
its summary; anything under forty-five minutes old carries a red **JUST IN**. Every headline links
straight to the outlet that reported it. Nothing is rewritten, nothing is republished — the reporting
stays theirs.

This runs through `api/news.js`, a new function that fetches the feeds server-side and caches them for
four minutes. **No API key, no account, no cost.** A feed that's down is skipped rather than breaking
the page.

**Topics.** The chips across the top aren't a fixed menu — they're worked out from today's actual
headlines, against fifteen subjects (healthcare, voting rights, immigration, climate, labor, courts,
cost of living, housing, education, democracy, Congress, LGBTQ+ rights, money in politics, guns,
reproductive rights). Each shows how many of today's stories touch it. Tap one and the wire filters,
the sidebar switches to what people *here* have posted and where they stand on that same subject, and
the daily brief narrows to it.

**Two ways in.** Every story has *Post about this* — which opens the composer with the headline, the
link and a topic tag already in it — and *Take it to the floor*, which opens the town hall with the
story and The Desk called in. News to conversation in one tap.

**Today, in a paragraph.** One button writes a short read on what the day adds up to, from the
headlines on screen, ending with one concrete thing worth doing this week. It can only use the
headlines it was handed — it isn't allowed to add an event that isn't there.

The wire also feeds the crawl at the top of every screen, and the site now opens on Today rather than
your profile — unless someone followed a shared profile link, which still lands where it should.


## A phone gets a real app

The bottom sheet is gone. On a phone this is now built like an app you'd download:

**A tab bar along the bottom** — Feed, Town Hall, Chat, People, Profile, and More — always reachable,
padded past the home indicator, sitting on frosted glass. The five screens that don't fit (Issues,
Ballot, Polls, Fundraise, Reach) live behind More, along with search, notifications and your account.

**A Post button floating above the tabs**, one thumb-reach from anywhere.

**No scroller inside a scroller.** Chat and the town hall used to have their own scrolling boxes inside
a scrolling page, which fights you on a touchscreen. The page scrolls now; the composer sticks above
the tab bar and the section header sticks under the masthead.

Touch targets grew to 40px, fields are 16px so iOS never zooms on focus, the viewport covers the notch,
and it installs to the home screen as a standalone app.

**Your place is kept.** Switch tabs and come back and you're where you left off — and a background
repaint no longer throws you to the top mid-read.

## More in this build

**Links work.** A URL in a post is now a link — scheme stripped for reading, `noopener noreferrer
nofollow` for safety, opened in a new tab.

**A menu on every post** behind the `…` — share, copy the text, delete if it's yours, and mute.

**Muting** hides someone from your feed, your comments and the room. It never leaves your browser:
they aren't told, nothing is sent anywhere, and you can undo it from Account → Muted.

**Drafts.** Start a post, wander off, come back — it's still there. A counter appears in the last
150 characters and turns red at the edge.

**An offline notice** when the connection drops, and an automatic catch-up when it returns.


## The navigation is a sidebar now

Ten app tiles in two columns took a third of the screen and lined up with nothing. They're now a single
column — the same squircle icons at a quarter of the size, label beside each one, a rule down the right
edge, an active row that fills and marks itself with a blue bar. Under it: a **Post** button, and your
own face with a menu behind it (profile, share, invite, notifications, shortcuts, theme, sign out).
On a phone the same nav becomes a five-across tab grid.

The **Feed badge** used to count your own posts, which is not news. It now counts posts you haven't
seen, and clears when you look.

## Where the red dot went

You were right that LIVE next to the wordmark was redundant — the crawl said "democrat.ai" right after
the logo said it. The red dot now appears only where something is actually live:

- **In the crawl**, on a line whose event happened in the last fifteen minutes. Otherwise that line
  shows its own label — LATEST, TRENDING, ON THE FLOOR.
- **On the Town Hall nav item**, when someone has spoken in the room recently or more than one person
  is standing in it. That's the one that pulls people in.
- **On a post**, as JUST IN, for anything under twenty minutes old.

When there's nothing to report, the crawl hides itself rather than filling with brand copy.

## It should feel expensive

**Likes answer instantly** — the heart fills and pops on the tap, then the database catches up. If the
write fails it rolls back and tells you.

**Nothing jumps while you're reading.** Live updates used to repaint the feed and throw you back to the
top. Now, if you're scrolled down, new posts wait behind a *3 new posts* pill at the top of the column.

**Skeletons, not spinners.** Lists shimmer in the shape of the content that's coming.

**Hover cards.** Point at anyone's name on desktop and their card comes to you — face, role, how many
positions and posts, and a message button. No extra request; it's built from what's already loaded.

**Older posts** load on request once there are more than sixty.

Three screens also fetch their own data now if they find it missing, instead of trusting that they were
opened for the first time — that was a real way to get stuck on a loading state.


**Do this first:** Supabase → SQL Editor → New query → paste all of `update.txt` → Run.
It adds photos, saved posts, the timestamps notifications need, and the town hall room.
Safe to run twice. Then upload everything in this folder to GitHub.

`preview.html` is a snapshot of the new look — open it to see the feed and the floor, light and dark,
without deploying anything.

---

## It reads like a newsroom now

**A masthead across the top.** The logo, a live crawl, and your tools all sit in one bar with a rule
under it. The rail divider drops from that rule, so the whole page is one frame instead of parts
floating on a background.

**The crawl is real.** It rotates through what has actually happened — the latest post, how many went
up today, the last thing said on the floor, the next event, the position the most people are taking,
the newest poll, how many people are here. Every line is clickable and goes to the thing it names.
On a phone it drops to its own band under the logo.

**Stories have kickers.** Every post carries an eyebrow line above it: the topic, the place, and a red
**JUST IN** on anything under twenty minutes old. The top story runs at headline size. Bylines sit
underneath with a small face and how long ago.

**Section heads** are set in heavy uppercase with a blue rule under them and an *Updated 2:14 PM* stamp,
the way a section front is dated.

Red appears in exactly two places — the live dot and **JUST IN** — where it reads as broadcast rather
than as the other party. Everything else stays blue.

## Town hall is now a live floor

One room. Everyone is in it, in real time, and you can see who else is there right now.

**Five voices from the desk** can be pulled into the conversation by name or by tapping their chip:

| | |
|---|---|
| **The Desk** | The anchor. What just happened on the network and what it adds up to. |
| **The Organizer** | Turns talk into the call, the meeting, the door, the deadline. |
| **The Analyst** | What the numbers say, and what would need looking up. |
| **The Historian** | The earlier bill, the earlier fight, what it implies now. |
| **The Skeptic** | Finds the weak joint in our own argument before the other side does. |

They read the last twenty messages before they speak, they can query the site's real database, and
they answer in three sentences because it's a chat room. They share the same politics as the rest of
the site — they differ in the job they do, not in what they believe. Type `@desk` in a message and
the anchor walks in.

Nothing was lost: the calendar, events, invites and RSVPs moved to the right-hand column.

## Everything from the last build

⌘K search across people, posts, positions and events · notifications with an unread count · photos on
posts · @mentions with autocomplete · #topics that filter the feed · saved posts · a Following tab ·
dark mode that follows your system · keyboard shortcuts (press `?`).
