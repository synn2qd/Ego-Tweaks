EGO TWEAKS — WEBSITE
====================

Open index.html to view the site. Everything it needs is in this folder.

  index.html              the site (Home + Download pages, one file)
  assets/styles.css       look and feel — same tokens, fonts and components as the app
  assets/site.js          loading sequence, pages, sign-up -> download flow
  assets/auth.js          accounts (sign up, sign in, saved settings, download history)
  assets/catalog.js       the 87 tweak names shown on the Home page dial and category cards
  assets/fonts/           Unbounded, Geist, JetBrains Mono (SIL Open Font License 1.1)
  assets/favicon.svg      browser tab icon
  downloads/EgoTweaks.exe the file visitors get after making an account


HOW THE DOWNLOAD FLOW WORKS
---------------------------
1. Site opens with the same boot/loading sequence as the app (click or press any key to skip).
2. Download page -> visitor clicks "Ego Tweaking Utility".
3. Not signed in? They create an account (or sign in).
4. A short "Preparing your download" sequence runs, then EgoTweaks.exe downloads.
5. Their account saves their download history and two settings:
   "Play the intro on every visit" and "Start downloads automatically".


ABOUT THE ACCOUNTS (read this)
------------------------------
Accounts are saved in the visitor's own browser (localStorage). Passwords are never
stored — only a salted PBKDF2-SHA256 hash. This means:

  * It works on any static host (GitHub Pages, Netlify, Cloudflare Pages) with no server.
  * An account only exists in the browser it was made in — signing in from another
    device won't find it.
  * You (the site owner) can't see a list of sign-ups or emails.
  * The account step is a gate in the page, not real protection: anyone who knows the
    URL downloads/EgoTweaks.exe can fetch the file directly.

To get real accounts (cross-device sign-in, a list of users and emails you can see),
connect a hosted backend such as Supabase or Firebase. Only assets/auth.js needs to
change — the rest of the site talks to it through window.EgoAuth (see the comment at
the top of that file).


SHIPPING A NEW VERSION
----------------------
1. Replace downloads/EgoTweaks.exe with the new build.
2. In assets/site.js, update the BUILD block near the top: version, bytes, sha256.
   Get the size and hash on Windows with PowerShell:
     (Get-Item .\downloads\EgoTweaks.exe).Length
     (Get-FileHash .\downloads\EgoTweaks.exe -Algorithm SHA256).Hash.ToLower()


HOSTING ON GITHUB PAGES
-----------------------
1. Create a repository and upload everything in this folder (keep the folder layout).
2. Repository Settings -> Pages -> Source: "Deploy from a branch", branch main, folder / (root).
3. Your site goes live at https://<your-username>.github.io/<repo-name>/

The .exe is 1.4 MB, well under GitHub's 100 MB file limit.


NOTE ON SMARTSCREEN
-------------------
EgoTweaks.exe isn't code-signed, so Windows SmartScreen may warn people on first run
("More info -> Run anyway"). The Download page tells visitors this. Signing the exe with
a code-signing certificate removes most of these warnings over time.
