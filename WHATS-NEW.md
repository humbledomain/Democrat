# What's new

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
