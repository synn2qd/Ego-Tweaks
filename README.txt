EGO TWEAKS — WEBSITE (v3 design)
================================

Open index.html to view the site. Everything it needs is in this folder.

  index.html              the site: landing page, Download page, Premium page
  assets/styles.css       the look (same fonts and tokens as the app, black and white only)
  assets/site.js          page content, intro, app tour, demos, sign-up -> download, Premium, Discord
  assets/auth.js          Supabase Auth adapter (shared accounts) — unchanged from v2
  assets/catalog.js       the 87 tweak names used on the page — unchanged from v2
  assets/shots/           real screenshots of the app (taken with its demo data)
  assets/fonts/           Unbounded, Geist, JetBrains Mono (SIL Open Font License 1.1)
  downloads/EgoTweaks.exe the file visitors get after making an account
  supabase-setup.sql      Supabase tables and security rules — unchanged from v2


WHAT'S ON THE PAGE
------------------
Intro (same loading screen as the app) -> spotlight hero with the app's dial behind the headline
and the real app on a tilted stage that flattens as you scroll -> numbers -> games ticker ->
01 What it tunes (six areas) -> 02 The full list (search and filter all 87 tweaks) ->
03 The app (auto-playing tour of Home, Tweaks, Games, Network, BIOS) -> 04 Made to be undone
(working tweak demo) -> 05 How it works -> 06 Pricing (Free vs Premium) -> Reviews (only if you add
some, see below) -> Discord -> FAQ -> final call to action -> footer.
"Get Ego Tweaks" buttons go to the Download page, where visitors make an account and the download
starts. "Premium" goes to the Premium page; "Buy Premium" opens Payhip's checkout on the page.

Touches: a soft light follows the mouse over cards, buttons lean toward the cursor, sections fade
in as you scroll, the nav shrinks into a glass bar and marks the section you're in. Everything
calms down automatically for visitors who turn on "reduce motion" in their system settings.


LIVE DISCORD NUMBERS
--------------------
The hero and the Discord section show how many people are online and in your server. These come
from your public invite link (PREMIUM.discord, or LINKS.discord if you fill that in), so keep that
invite set to never expire. If Discord can't be reached, the numbers simply stay hidden.


ADD REVIEWS (optional)
----------------------
Open assets/site.js. Near the top:

    const REVIEWS = [];

Add real reviews from customers (for example vouches from your Discord) and a Reviews section
appears on the home page:

    const REVIEWS = [
      { name: 'kai', text: 'Input feels instant now.', tag: 'VALORANT' },
      { name: 'mo', text: 'Easy to set up, and I could undo everything.' },
    ];

Only add real ones. Leave the list empty and the section stays hidden.


ADD YOUR DISCORD AND X LINKS
----------------------------
Open assets/site.js. Near the top:

    const LINKS = { discord: '', x: '' };

Paste your links between the quotes, e.g.
    const LINKS = { discord: 'https://discord.gg/yourcode', x: 'https://x.com/yourname' };
They then appear in the nav, footer and phone menu. Empty = hidden. If LINKS.discord is empty,
the site uses your Premium ticket link (PREMIUM.discord) as the Discord link everywhere.


SET UP EGO TWEAKS PREMIUM (Payhip + Discord)
--------------------------------------------
Premium is $10 a month: each purchase is a key that lasts one month, and buyers buy again
to renew. Nothing charges them automatically, and the site says so.

Premium has its own page (egotweaks.com/#/premium) and a card in the Pricing section.
"Buy Premium" opens Payhip's checkout right on the page. After paying, Payhip sends the
buyer back to a thanks page that tells them to open a ticket in your Discord for their key.

1. In Payhip, add a NEW DIGITAL PRODUCT (not a membership), e.g. "Ego Tweaks Premium —
   1 month", priced $10. Payhip's on-site checkout does not work for memberships, courses,
   coaching or bundles. If Payhip asks for a file, a small text file saying "Open a ticket
   in our Discord to get your key" works.
2. Open assets/site.js. Near the top:

    const PREMIUM = {
      payhip: '',
      discord: '',
      price: '$10',
      perks: [ ... ],
    };

  payhip   your Payhip product link, e.g. 'https://payhip.com/b/AbC12' (or just 'AbC12').
           Until this is filled in, Buy Premium only says checkout isn't open yet.
  discord  where buyers open a ticket: your invite link, or a link straight to your tickets
           channel. Leave '' to use the Discord link in LINKS.
  price    the price of one month, shown on the site only. Payhip charges whatever you set
           in Payhip, so keep the two the same.
  perks    the list on the Premium card. Change it to say what the key unlocks.

Keys are handed out by you in Discord, so check the order in Payhip before sending one, and
make each key stop working after a month. Premium does not touch Supabase.


SHIPPING A NEW VERSION
----------------------
1. Replace downloads/EgoTweaks.exe with the new build.
2. In assets/site.js, update the BUILD block at the very top: version, bytes, sha256.
   Get the size and hash on Windows with PowerShell:
     (Get-Item .\downloads\EgoTweaks.exe).Length
     (Get-FileHash .\downloads\EgoTweaks.exe -Algorithm SHA256).Hash.ToLower()


HOSTING ON GITHUB PAGES
-----------------------
Upload everything in this folder to your repo (keep the folder layout) and replace the
old files. Pages serves it as before at egotweaks.com.


SUPABASE ACCOUNTS + ADMIN STATISTICS
------------------------------------
This version uses Supabase for shared account registrations and tracked download clicks.
The hidden admin panel is opened by clicking the tiny © at the very bottom of the site.
It shows registered accounts, all recorded download clicks, and clicks in the last 30 days.
These are click events, not proof that a file finished downloading or unique people.

ONE-TIME SETUP (required before publishing this version)
  1. In your Supabase project, open SQL Editor -> New query.
  2. Open supabase-setup.sql from this folder, copy all of it into the SQL editor, and Run.
  3. In Supabase -> Authentication -> Users, register the admin email you own
     (kellanevers100@gmail.com) using the site's Sign up form, or create that user in Supabase.
  4. In SQL Editor, run this separate query after that account exists:
       update auth.users
       set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
       where lower(email) = lower('kellanevers100@gmail.com');
  5. In Supabase -> Authentication settings, if you want new users to be able to sign in
     immediately without confirming email, disable email confirmations. Otherwise users must
     confirm their email before signing in.
  6. Upload the contents of this folder to the root of your GitHub Pages repository, preserving
     the assets/ and downloads/ folders. Do not upload the enclosing folder itself.
  7. Open the live site over HTTPS. Sign in to the admin panel with the admin email and its
     Supabase Auth password. If you were already signed in, sign out and back in after setting
     the admin role so the new role is included in the session.

SECURITY
--------
The frontend contains only the Supabase publishable key. Never put a Supabase secret or
service_role key in any website file. Admin permissions are checked using the trusted
app_metadata role set through SQL, not user-editable profile metadata. The SQL setup enables
Row Level Security. Do not remove those policies.

ABOUT THE ACCOUNTS
------------------
Accounts are stored in Supabase, so registered users are shared across browsers and devices.
A registration count appears in the admin panel once the SQL setup is complete. Existing accounts
that lived only in visitors' localStorage cannot be automatically migrated into Supabase.
