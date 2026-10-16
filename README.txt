EGO TWEAKS — WEBSITE (v2 design)
================================

Open index.html to view the site. Everything it needs is in this folder.

  index.html              the site: landing page + Download page
  assets/styles.css       the look (same fonts and tokens as the app)
  assets/site.js          page content, intro, app tour, demos, sign-up -> download
  assets/auth.js          Supabase Auth adapter (shared accounts)
  assets/catalog.js       the 87 tweak names used on the page
  assets/shots/           real screenshots of the app (taken with its demo data)
  assets/fonts/           Unbounded, Geist, JetBrains Mono (SIL Open Font License 1.1)
  downloads/EgoTweaks.exe the file visitors get after making an account


WHAT'S ON THE PAGE
------------------
Intro (same loading screen as the app) -> hero with the real app -> scrolling list of
supported games -> six feature cards -> app tour (Home, Tweaks, Games, Network, BIOS)
-> "Made to be undone" with a working tweak demo -> how it works -> free vs paid ->
FAQ -> final call to action -> footer. "Get Ego Tweaks" buttons go to the Download
page, where visitors make an account and the download starts.


ADD YOUR DISCORD AND X LINKS
----------------------------
Open assets/site.js. Near the top:

    const LINKS = { discord: '', x: '' };

Paste your links between the quotes, e.g.
    const LINKS = { discord: 'https://discord.gg/yourcode', x: 'https://x.com/yourname' };
They then appear in the footer (and Discord in the phone menu). Empty = hidden.


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
