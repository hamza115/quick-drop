# QuickDrop

A private, personal file shelf for moving screenshots, videos, documents, links and notes between your own
devices. Upload once, find it quickly, copy or download it anywhere.

- **Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Auth:** Better Auth (email and password, cookie sessions)
- **Metadata:** MongoDB Atlas
- **Files:** Cloudinary (signed, direct browser uploads)

## Features

- Email and password accounts. Each account sees only its own items.
- Upload by button, drag and drop anywhere, or paste (Ctrl/Cmd+V; press-and-hold Paste on phones).
- Upload queue with progress, cancel and retry. Files go straight from the browser to Cloudinary.
- Image compression in the browser before upload: presets, maximum size, never enlarges, keeps screenshots
  sharp (every image keeps its format; PNG screenshots stay lossless PNG and are only scaled down), and keeps
  the original when compression doesn't help.
- Optional video compression in the browser (FFmpeg.wasm, experimental): off by default. The user turns it on in Settings,
  Uploads. Converts to MP4 (H.264/AAC) at 480p, 720p or 1080p, shows
  progress, and can be skipped per video with "Use original".
- Links and notes. Pasted text becomes a link if it is one web address, otherwise a note.
- Library with search, type filters, favorites, sort, grid and list views, and pagination.
- File page with preview (images, video, PDFs), Copy image (with a fallback to copying the link), Copy link,
  Download, edit details, favorite and delete.
- Private files: everything opens only while you're signed in (see Privacy below).
- Select several items (Select button, or press and hold on a phone) to download or delete them together.
  Each card and row also has a "⋯" menu with the same actions as the file page.
- Modern interface with light and dark themes. On phones it works like an app: bottom tab bar, a "+" button
  (upload, camera, paste from clipboard, link or note), bottom sheets, and it can be installed to the home
  screen (web app manifest).
- Settings: image compression (per browser), default view and sort, personal upload limit, storage usage,
  and signing out on other devices.
- Optional storage limit per account with a usage bar and warnings.
- Daily cleanup of files that were uploaded but never saved.

## Local setup

Requires Node.js 22.9 or later.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in the values (see below).
3. Start the dev server:

   ```bash
   npm run dev
   ```

4. Open http://localhost:3000, create an account on `/signup`, and sign in.

## Environment variables

All variables are server-only. Never add a `NEXT_PUBLIC_` prefix to any of them.

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string (`mongodb://` or `mongodb+srv://`). |
| `MONGODB_DB_NAME` | No | Database name. Default `quickdrop`. |
| `AUTH_SECRET` | Yes | Random string, at least 32 characters. |
| `APP_URL` | Yes | Canonical origin, e.g. `http://localhost:3000`. Must be `https://` in production. |
| `CLOUDINARY_CLOUD_NAME` | For uploads | Cloudinary cloud name. |
| `CLOUDINARY_API_KEY` | For uploads | Cloudinary API key. It is sent to the browser inside signed upload forms, as Cloudinary requires; it is not the secret. |
| `CLOUDINARY_API_SECRET` | For uploads | Cloudinary API secret. Never leaves the server. |
| `STORAGE_LIMIT_MB` | No | Per-account storage limit. Blank means no limit and no quota bar. |
| `CRON_SECRET` | No | Enables the cleanup job. At least 16 characters. |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Without the Cloudinary settings the app still runs; uploads show a "not set up yet" message, and links and
notes still work.

## Video compression (FFmpeg.wasm)

`npm install` runs `scripts/copy-ffmpeg.mjs`, which copies the FFmpeg worker and core (about 31 MB) into
`public/ffmpeg/`. They are served from your own deployment, not a CDN, and are not committed (git-ignored).
The worker loads its core with a dynamic import that bundlers can't follow, so it is loaded unbundled on purpose.

- Uses the single-threaded core, so no cross-origin isolation headers are needed (those would block Cloudinary
  images). It is slow: expect minutes for a long or high-resolution video.
- One video is compressed at a time. Videos over 250 MB, and devices reporting under 4 GB of memory, skip
  compression and upload the original.
- The original is uploaded whenever compression fails, isn't supported for the codec, or doesn't make the file
  smaller.
- Test video compression on your target browsers and devices before relying on it.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests (Vitest) |

## Deploying to Vercel

1. Check the current Vercel plan terms (the Hobby plan is for non-commercial personal use) and the current
   Cloudinary free-tier limits. If Cloudinary's limits are lower than the defaults, update the per-type limits in
   `src/lib/uploads/policy.ts` (images 10 MB, video and ZIP 100 MB, documents 25 MB, text and CSV 10 MB).
2. Import the repository into Vercel.
3. Add every variable from the table above in the Vercel project settings. Set `APP_URL` to the deployed
   `https://` address.
4. In MongoDB Atlas, allow connections from Vercel (Network Access).
5. Deploy, then open `https://<your-app>/api/health`. It returns 200 when MongoDB answers.
6. Confirm the deployment serves `/ffmpeg/ffmpeg-core.wasm` (needed for video compression).
7. To enable the cleanup job, set `CRON_SECRET`. `vercel.json` runs `/api/cron/cleanup-uploads` daily at
   03:00 UTC; Vercel sends the secret as a Bearer token.

## Privacy: who can open a file

Files are **private**. New uploads are stored in Cloudinary as `authenticated` assets, which Cloudinary only
delivers through URLs signed with the API secret.

- The browser never receives a stored Cloudinary address. Previews, thumbnails, Copy link and Copy image use
  QuickDrop routes (`/api/files/<id>/content` and `/thumbnail`) that check the session and the owner, then
  redirect to a freshly signed URL.
- A copied link therefore opens only for the signed-in owner. It can't be shared with other people.
- Downloads of documents use signed links that expire after 5 minutes.
- Residual risk: a signed preview URL picked out of the browser's developer tools stays valid until the file is
  deleted (Cloudinary's time-limited token URLs need a paid plan).
- Records saved before private delivery (public `upload` assets) keep working through the same routes.

Other notes:

- Image and video compression remove metadata such as camera details and location.
- Compression settings are stored in the browser. Library defaults and the upload limit are stored with the
  account.

## Security summary

- Secrets stay on the server (`server-only` modules); nothing uses `NEXT_PUBLIC_`.
- Every private route checks the session; ownership is checked on every read, update, download and delete.
- State-changing API routes reject requests from other sites (Origin / Sec-Fetch-Site check); Better Auth
  protects its own routes.
- Rate limits per user (stored in MongoDB): upload signing, saving links and notes, deleting, downloading.
- Upload signatures fix the public ID, folder, delivery type (`authenticated`), overwrite and (for images and
  video) allowed formats. The server
  re-checks the uploaded asset's ID, type and size with Cloudinary before saving it.
- Links are limited to `http` and `https` and checked again when shown. React escapes all user text.

## API routes

All routes return `{ error: { code, message } }` on failure; messages are safe to show to the user.

| Route | Purpose |
| --- | --- |
| `GET /api/files` | List, search, filter and sort items |
| `POST /api/files` | Save a link or note |
| `POST /api/files/bulk-delete` | Delete up to 100 items; reports each failure |
| `GET /api/files/[id]/content` | Open a private file (owner only; redirects to a signed URL) |
| `GET /api/files/[id]/thumbnail` | Preview image for images and videos (owner only) |
| `GET /api/files/[id]` | One item (404 for missing and other owners' items alike) |
| `PATCH /api/files/[id]` | Edit title, note, tags, favorite |
| `DELETE /api/files/[id]` | Delete the stored file, then the item. `delete_partial` means deleting again finishes it |
| `GET /api/files/[id]/download` | Download (redirect); `?mode=json` returns `{ url }` |
| `POST /api/uploads` | Sign an upload |
| `POST /api/uploads/complete` | Verify an upload with Cloudinary and save it |
| `POST /api/uploads/discard` | Remove a cancelled, unsaved upload |
| `GET`/`PATCH /api/preferences` | Library defaults and upload limit |
| `GET /api/cron/cleanup-uploads` | Scheduled cleanup (needs `CRON_SECRET`) |
| `GET /api/health` | 200 when MongoDB answers, 503 otherwise |
