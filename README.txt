EGO TWEAKS — WEBSITE (v2 design)
================================

Open index.html to view the site. Everything it needs is in this folder.

  index.html              the site: landing page + Download page
  assets/styles.css       the look (same fonts and tokens as the app)
  assets/site.js          page content, intro, app tour, demos, sign-up -> download
  assets/auth.js          accounts (saved in each visitor's own browser)
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


HIDDEN ADMIN PANEL (download count)
-----------------------------------
Scroll to the very bottom of any page and click the "©" in "© 2026 Ego Tweaks".
It looks like plain text. Enter the password, and the panel shows total downloads
and downloads per version. It stays unlocked in that browser tab until you click Lock.

The counts come from GitHub, which counts every download of a file attached to a
Release. One-time setup:
  1. On github.com, open the repo your site is in -> Releases -> Draft a new release.
     Tag it v1.2.0, drag in EgoTweaks.exe (keep that exact name), Publish release.
  2. In assets/site.js, near the top, set
        const GITHUB_REPO = 'your-username/your-repo';
     and upload the file.
From then on the Download button hands out the release file and every download is
counted. For each new version, publish a new release with the new EgoTweaks.exe.

Good to know: this is a static site, so the password check runs in the visitor's
browser. It keeps people out of the panel, but someone determined could read the
counts anyway. That's fine, because GitHub shows download counts on public releases
to anyone. Don't put anything secret in the panel.


ABOUT THE ACCOUNTS
------------------
Accounts are saved in the visitor's own browser, so they don't follow people to other
devices, and you can't see a list of sign-ups. Visitor counts (how many people
reached the site) need the Cloudflare version of the site; on GitHub Pages only
downloads are counted, through GitHub Releases as described above.
