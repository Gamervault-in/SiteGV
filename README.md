# GamerVault website

A fast static website for gamervault.in. Content lives in simple files in the `content` folder. Vercel rebuilds the site automatically whenever a file changes on GitHub.

## What's inside

| Folder or file | What it is |
| --- | --- |
| `content/site.json` | Email, locations, the form connection, the draft switch and the Inkling settings |
| `content/games.json` | The game catalogue (demo entries plus Inkling) |
| `content/articles/*.md` | The 12 India Gaming Insights articles, one file each |
| `src/styles.css`, `src/app.js` | The design system and site behaviour |
| `build.mjs` | Turns the content into the finished pages (you don't need to edit it) |
| `vercel.json` | Tells Vercel how to build the site |

## 1. Put it online (one time)

1. Unzip `gamervault-site.zip` on your computer.
2. On GitHub, open your **gamervault-site** repository (or create it: **+** then **New repository**, Public).
3. Click **Add file**, then **Upload files**. Drag in **everything inside** the unzipped folder: the `content` and `src` folders plus `build.mjs`, `package.json`, `vercel.json` and `README.md`. Leave out `node_modules` and `dist` if you see them.
4. Click **Commit changes**.
5. In Vercel, click **Add New**, then **Project**. Pick **gamervault-site**, then **Import**, then **Deploy**. Leave the settings as they are, because `vercel.json` handles them.
6. Connect your domain: in Vercel, go to **Project**, **Settings**, **Domains**, add `gamervault.in` and `www.gamervault.in`, then copy the two DNS records Vercel shows into GoDaddy (**My Products**, **DNS**).

## 2. Turn on the forms (about 10 minutes, free)

Until you do this, every form clearly says "Prototype form: nothing was sent".

1. Sign up at formspree.io with gamervaultbiz@gmail.com and create a form called "GamerVault website".
2. Copy the form URL. It looks like `https://formspree.io/f/abcdwxyz`.
3. On GitHub, open `content/site.json`, click the pencil, and paste the URL into `"formEndpoint": ""`. Commit.
4. All five forms (game submission, partner enquiry, contact, and two newsletter sign-ups) now deliver to your inbox. You can view, filter and export every submission in the Formspree dashboard.

The form URL is designed to be public. It is not a secret key. Formspree also filters spam, on top of the site's own hidden spam trap.

## 3. Everyday editing (no code)

You can edit any file directly on github.com: open it, click the pencil, change it, then **Commit changes**. The site updates in about a minute.

**Games:** add an entry to `content/games.json`. For a real title set `"demo": false`, fill in `origin` and `ageRating`, and add a `playUrl` or `storeLinks` only when the link is authorised. To remove the demo catalogue, delete every entry that has `"demo": true`.

**Cover images:** upload an image into a `public/covers/` folder and set `"cover": "/covers/your-file.jpg"`. Leave `cover` empty to use the generated art.

**Articles:** each article is a file in `content/articles`. Change `status: draft` to `status: published` once it has been reviewed. Published articles lose the Draft label and get Google article markup. To hide every draft from the public site, set `"showDrafts": false` in `site.json`. To add an article, copy an existing file, rename it, and edit the top section (title, slug, category, excerpt, date, sources) and the text below it. Optional fields `seoTitle` and `seoDescription` override the search snippet.

**Inkling:** everything is in the `inkling` section of `site.json`.
- Change `description`, `status`, `statusBadge` or `availability` to update the pop-up, card and modal together.
- Set `"cover": "/covers/inkling.png"` to replace the placeholder art.
- Set `"popupEnabled": false` to switch the pop-up off.
- At launch, set `"playUrl"` to the H5 game's address. The "Coming Soon" button then becomes "Play Inkling". Also update `status` and `availability`.

## 4. Still to connect or decide

| Item | Why it matters | What's needed |
| --- | --- | --- |
| Formspree form URL | Forms are prototypes until connected | Free account, paste URL into `site.json` |
| Real GamerVault logo | Site uses a temporary mark | Logo file (SVG or PNG) to swap in |
| Article review | All 12 articles are drafts | Editorial read, then set `status: published` |
| Legal review | Privacy Policy and Terms are sensible starting drafts | Have your legal adviser check them |
| Team section on About | Left out because no approved photos and bios were supplied | Names, roles, short bios and photos |
| Social share image | Links shared on LinkedIn or WhatsApp show no preview image | A 1200 x 630 image, then add an `og:image` tag |
| Newsletter tool | Sign-ups currently arrive as form emails | Later: Mailchimp, Brevo or similar |
| Google Search Console | Get pages indexed | Verify the domain and submit `/sitemap.xml` |
| Analytics (optional) | Visitor numbers | Vercel Web Analytics (cookie-free) is one click in Vercel |

## 5. Phase 2: an admin dashboard (optional)

Editing on GitHub is secure, because only people with access to the repository can change content. If the team wants a visual editor with logins and roles, the recommended route is **Decap CMS** (free and Git-based) with GitHub login, or **Sanity** (hosted, with a free tier). Either can read the same `content` files, so nothing needs redesigning.

## Local preview (for developers)

```
npm install
npm run build
npx serve dist
```
