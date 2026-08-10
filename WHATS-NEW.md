# What's new

## Six fixes

**The blank Polls page.** A real bug, and a nasty one. At startup, if you'd set a location, the app
was still assigning the old `near` scope to Polls — a value the rebuilt screen has no case for, so it
rendered an empty string and you got a white page with a working sidebar. That assignment is gone,
and the screen now falls back to Everyone rather than to nothing if it's ever handed a value it
doesn't recognise. Polls opens on **Everyone** now, so there's always something there.

**Ready to ask moved to the top** — a shelf of cards that scroll sideways, above the questions, on
both the Answer and Everyone tabs. Each card shows the question, what the answer would tell you, its
answers, and one button.

**The Messages panel is off the People page**, and the unread count is off the People tile — both of
those now live on the Messages button where they belong.

**Followers and Following go to People**, on their own tabs — a real screen with search and profiles
rather than a small list in a sheet. There's a new Followers tab to land on. **Shares goes to Reach.**
On someone else's page those numbers still open a list, since you can't browse their followers.

**Chat answers can leave the chat.** Every answer now has **Post** and **Share** beside the other
buttons. Post drops it into the feed composer so you can edit before it goes out; Share opens the
usual sheet with it ready to send anywhere.


## Messages have a home

A **Messages button in the nav, directly above Post**, built the same way, with the unread count on
it. On a phone it's a second floating button beside Post.

It opens a **full-screen hub**. Conversations down the left, the one you're in on the right. On a
phone it's one at a time with a back arrow.

- **Search** across every name, handle and word anyone has sent you.
- **New message** — a `+` that opens a searchable list of everyone on the network.
- Threads show the last line, who said it, when, and an unread count in bold.
- The newest conversation opens by itself on a wide screen, and reading one marks it read straight
  away — in the database, on the badge, and in the nav.
- Messages are grouped into runs and split by day: **Today**, **Yesterday**, then the weekday, then
  the date. Time under the last of each run, and *Seen* under your last one when they've read it.
- Sending shows the message instantly and rolls it back if the write fails.
- New messages arrive live while the hub is open.
- `@handles` inside a message are links. Esc closes it. `M` opens it from anywhere.

Every Message button on the site — profile pages, the People screen, hover cards, notifications —
now opens this instead of the old cramped sheet.


## Reach is a real dashboard

Four **metric cards** across the top — what came back, what you put out, new followers, shares — each
with the number, a sparkline drawn behind it, and the change against the same length of time before.
Green up, red down.

**The chart.** Thirty days by default, seven or ninety on a switch. A blue line and filled area for
everything that came back to you — likes, replies, follows, shares, RSVPs, votes — with grey bars
underneath for what you put out. Hover any point or bar and it tells you the day and the number.

**A donut** breaking the return down by kind, with the total in the middle and a colour key beside it.

**Twelve weeks of squares** — a contribution grid, one square per day, darker the more you did. Under
it: active days in the period, your current run, and the day of the week people answer you most.

**What travelled furthest** — your best posts, ranked by what came back, weighting a reply above a
like. Click one and it opens.

**Where they are** — the states your followers are actually in, as a bar list. And what you've built:
posts, positions, questions, events.

All of it is hand-drawn SVG. No chart library, nothing to load, nothing to go stale — and every
number is a count of rows in your database, which is why the page says so at the bottom. Nothing here
is estimated or modelled.


> **Run `update.txt` again** — it adds one line that lets people change their answer to a poll.

## Polls, rebuilt

Same treatment as Issues. Three tabs and a library of **28 questions ready to ask**, grouped by what
you're trying to find out: getting organised, where we live, strategy, where you stand, a temperature
check, and the ballot. Each comes with its answers written and a line on what the result would tell
you — *"Usually it is not apathy. It is childcare and timing."* One tap asks it as your own.

**Answer** is the tab you land on: every question you haven't answered, as big tappable options.

**The numbers stay hidden until you answer.** That's deliberate — a room that sees the result first
just agrees with whoever got there earliest. There's a *See the result* link if you'd rather look
than vote.

When you answer, the bars sweep in behind the words with the percentage and the count, your pick
outlined, the leader shaded darker. **And the question stays put** — the old build filtered answered
polls off this tab, so the thing you just voted on vanished before you could see what happened. Now
it holds its place until you leave the screen.

**Change my answer** is there too, which needs that one new line of SQL.

**Yours** is what you asked, **Everyone** is the whole board by volume, and the sidebar has your
progress, the *closest call* — the questions nearly tied, which are the ones worth arguing about —
and the people whose answers match yours.

Writing your own opens a proper sheet: question, two to five answers, add more as you go, and a
*Check my wording* that flags a question which only allows one honest answer.


## Issues, rebuilt

The blank box was the problem — you typed something and nobody, including you, could tell what it
meant. There's a library now: **60 real policy positions across 15 subjects**, and three tabs.

**Browse.** Pick a subject — healthcare, housing, voting rights, climate, labor, education, guns,
immigration, courts, cost of living, democracy, LGBTQ+ rights, reproductive rights, public safety,
transit — and read down the list. Every position says in one line what it would actually do
("Medicare bargains directly with drugmakers, the way every other rich country does") and who
decides it: **Federal, State or Local**. That last part matters. Half of what people argue about
federally is settled in a city council.

Then two buttons: Support, Oppose. One tap. Tap the side you already hold and it clears. Tap the
other and it switches — one row, not two, which the old version got wrong. And a `?` on each that
gives you the strongest case *against* your own position.

**Yours.** Everything you've taken, with the split across the network, and the case against.

**Everyone.** The whole board, most-held first, with the buttons right there so you can join a
position someone else opened.

**Your own words still work** — the Add button opens a sheet that asks for what should *happen*
rather than how you feel, with a Sharpen button that tightens your line without changing your
meaning. Custom positions are marked as your words, and they aggregate with anyone else who writes
the same thing.

**You agree with.** A card showing the people whose positions line up with yours and by how much —
measured only on the positions you've both actually taken, so it can't be gamed by volume.

And a progress bar: how many of the 60 you've been through. "Not sure? Work it out" still runs the
interview that turns your answers into positions you approve.


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
