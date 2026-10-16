# QuickDrop — Design & AI Implementation Brief

> **Purpose:** Build a polished, private, desktop-first web app for moving screenshots, videos, documents, links, and other files between the user's own devices.  
> **Product name:** QuickDrop (working name; make the name easy to change).  
> **Platform:** Web only. No native iOS/Android application in this phase.

## 1. Product concept

QuickDrop is a personal file shelf. When the user captures a screenshot during QA testing on a phone or desktop, they can upload it to QuickDrop and retrieve it from any other browser. The same workflow applies to videos, PDFs, documents, downloaded files, URLs, and notes.

The core promise is: **upload once, find it quickly, copy or download it anywhere.**

Do not build social features, teams, chat, comments, or public profiles. Optimize for one authenticated personal user.

## 2. Technology constraints

- Next.js App Router + TypeScript.
- Tailwind CSS and a consistent component system (use shadcn/ui if it fits the project).
- MongoDB Atlas for metadata only.
- Cloudinary for supported asset storage and delivery.
- Vercel deployment, subject to current plan eligibility and limits.
- Use Next.js Route Handlers/server-only modules for secure backend operations; a separate persistent Express server is not required for v1.
- Optional Turborepo only if the repository truly contains multiple packages/apps. Do not add monorepo complexity without a practical reason.
- Use Zod or an equivalent schema validator for request validation.
- Use a maintained authentication solution with secure, HTTP-only cookies/sessions.
- Keep provider integrations behind small service modules so storage can be changed later.

## 3. Visual direction

Create a clean, minimal, modern productivity interface. The product should feel lightweight, calm, trustworthy, and fast—not like a social network or a complicated enterprise DAM.

### Palette and styling

- Page background: very light neutral gray/off-white.
- Main surfaces: white with subtle gray borders.
- Primary text: dark slate/near-black.
- Secondary text: muted slate gray.
- Accent: a restrained indigo/blue-violet or similarly accessible cool accent.
- Success, warning, and error colors should be semantic and used sparingly.
- Cards: moderate rounded corners, thin borders, subtle shadows only when useful.
- Typography: Inter or a similar clean sans-serif.
- Use a consistent spacing scale, clear hierarchy, and comfortable whitespace.
- Include hover, pressed, disabled, loading, focus-visible, empty, and error states.
- Avoid excessive gradients, oversized hero sections, glassmorphism, decorative charts, and unnecessary animation.
- Prefer simple line icons and clear text labels.
- Support keyboard navigation and visible focus indicators. Respect reduced-motion preferences.

## 4. Main application layout

Desktop-first layout at common laptop widths.

### Left sidebar

- QuickDrop logo/wordmark at the top.
- Primary navigation:
  - All Files
  - Images
  - Videos
  - Documents
  - Links & Notes
  - Favorites
- Storage usage card near the bottom with used space/estimate, progress bar, and a small “Manage storage” link.
- Settings and account controls at the bottom.
- Sidebar can collapse at narrower widths.

### Top header

- Page title and optional breadcrumb.
- Search field with a clear shortcut hint if implemented.
- Prominent primary **Upload files** button.
- Secondary **Add link** action.
- Account/avatar menu with Settings and Sign out.
- Keep the header compact; do not waste vertical space.

### Main content

- Show a welcome/utility message only when useful; prioritize the file library.
- Recent uploads or All Files heading.
- Type filters as compact tabs or chips.
- Grid/list toggle.
- Sort menu: Newest, Oldest, Name, Largest.
- File cards with preview/thumbnail, filename, type/size, upload date, and a compact overflow menu.
- Use pagination or infinite scrolling; do not load the entire library at once.
- Show helpful empty states for a new account and for empty search results.

## 5. Required screens

### Screen A — Login

- Small centered login panel.
- QuickDrop mark, concise product statement (“Your personal space for files between devices”).
- Email/password or selected auth provider.
- Clear validation and loading states.
- No unnecessary marketing sections.

### Screen B — Main Dashboard / All Files

- Sidebar + top header.
- Recent items or All Files grid.
- Search, filters, sort, grid/list controls.
- Upload action visible without scrolling.
- Storage usage indicator.
- Support a drag-and-drop target that becomes visually apparent while a file is dragged over the page.
- File actions should be discoverable without clutter.

### Screen C — Upload Queue

- Present as a side panel or modal that does not hide the entire library.
- Each item row includes thumbnail/type icon, filename, original size, processed size (if applicable), status, progress, and cancel/retry action.
- Statuses: Waiting, Preparing, Compressing, Uploading, Saving details, Completed, Failed, Cancelled.
- When compression is used, show original size → processed size and saved percentage.
- For a file that becomes larger after processing, suggest the original.
- Provide a clear retry action on recoverable failures.
- Avoid fake progress when actual progress is unavailable; show an indeterminate state instead.

### Screen D — File Preview

- Use a large central preview area for supported image/video/PDF types.
- Show title/filename, file type, size, date, and any compression details.
- Main actions: **Copy Image** (only where supported), **Copy Link**, **Download**, **More**.
- Secondary actions: rename display title, edit notes/tags, favorite, delete.
- For video, use standard controls and avoid autoplay with sound.
- For unsupported preview types, show file icon, metadata, and Download.
- Copy Image must have a graceful fallback if browser permissions, MIME type, or CORS restrictions prevent clipboard writing.

### Screen E — Add Link / Note

- Lightweight modal or panel.
- Input for URL or text, optional title, optional note.
- Validate URLs and allow only expected safe schemes such as `https:` and `http:` for web links.
- Make saved links easy to copy/open later.
- If saving plain text, label it as a note rather than treating it as a URL.

### Screen F — Settings

- Image compression toggle.
- Image quality/preset selector and maximum dimensions.
- Video compression opt-in with a warning that processing can be slow and memory intensive.
- Maximum accepted upload size setting (bounded by server/provider policy).
- Default library view and sort.
- Storage usage/estimate and a link to the provider usage dashboard if appropriate.
- Account/session controls.
- Do not display secret API keys in the UI.

### Screen G — Empty, Error, and Quota States

Design polished states for:
- No files yet.
- No search results.
- Unsupported file.
- File exceeds configured/provider limit.
- Cloud storage quota/usage warning.
- Compression failed.
- Upload interrupted.
- Upload succeeded but metadata could not be saved.
- Delete partially failed.
- Clipboard unavailable.
- Session expired.

Each state should explain what happened and the next action. Avoid raw stack traces and provider error jargon.

## 6. Compression UX and behavior

Compression is a key feature, but must not risk corrupting files or making the app sluggish.

### Images

- Offer client-side image compression/resizing before upload.
- Display original size, processed size, and percentage saved.
- Never upscale.
- Prioritize screenshot text clarity; do not force JPEG for screenshots or images with transparency.
- If output is larger, processing fails, or the format is unsupported, offer the original.
- Explain that processing may remove metadata such as EXIF.
- Use a worker when useful to avoid blocking the interface.

### Videos

- Video compression should be optional and disabled by default until performance has been validated.
- If implemented, use a Web Worker and a browser-compatible solution such as FFmpeg.wasm where appropriate.
- Display a warning before starting: video processing may take time, consume CPU/memory, and vary by browser/device.
- Show progress where available, a cancel action, and an original-file fallback when the original is within upload limits.
- Do not claim all codecs and formats are supported.
- Do not send the entire video through a Vercel function just to compress it.

### Documents and arbitrary files

- Do not automatically alter PDFs, Office documents, archives, code files, or arbitrary binaries.
- Upload unchanged when supported and within limits.
- If too large, explain the limit and allow the user to reduce/compress it externally or use a suitable storage provider.
- Already compressed formats such as JPEG, MP4, and ZIP may not shrink meaningfully.

## 7. Key interactions

### Upload from desktop

1. User clicks Upload files, drops files into the window, or pastes a clipboard image where supported.
2. App validates each file.
3. For supported images, show compression/preparation if enabled.
4. User can cancel queued/preparing items.
5. App requests a signed upload authorization from the server.
6. Browser uploads directly to Cloudinary.
7. App saves validated metadata to MongoDB.
8. The item appears at the top of the library and can be previewed, copied, or downloaded.

### Retrieve from another device

1. User opens the deployed web app and signs in.
2. Search or select the file.
3. User copies the image where supported, copies its link, or downloads the file.
4. Provide clear feedback after every action.

### Delete

- Require confirmation for deletion.
- Delete the provider asset and metadata with a recoverable, clearly communicated workflow.
- If one side succeeds and the other fails, show the partial status and offer retry/reconciliation.

## 8. Core components

Build reusable components such as:

- `AppSidebar`
- `AppHeader`
- `GlobalSearch`
- `StorageUsage`
- `FileGrid`
- `FileList`
- `FileCard`
- `FileTypeIcon`
- `FilePreview`
- `UploadDropzone`
- `UploadQueue`
- `UploadQueueItem`
- `CompressionSummary`
- `TypeFilter`
- `SortMenu`
- `AddLinkDialog`
- `EditMetadataDialog`
- `DeleteConfirmationDialog`
- `EmptyState`
- `ErrorState`
- `ToastProvider`
- `SettingsForm`

Keep components focused and avoid a single giant page component.

## 9. Data and API expectations

Persist file metadata in MongoDB. Suggested record fields:

- `ownerId`
- `kind`
- `originalName`
- `displayName`
- `mimeType`
- `originalSizeBytes`
- `storedSizeBytes`
- `compression` metadata
- `cloudinaryAssetId`
- `cloudinaryPublicId`
- `resourceType`
- `secureUrl`
- `thumbnailUrl`
- `linkUrl`
- `note`
- `tags`
- `isFavorite`
- `createdAt`
- `updatedAt`

All private records must be queried by the authenticated owner. Use pagination, input validation, and consistent error responses.

Implement server operations for:
- Create short-lived signed upload authorization.
- Register upload metadata.
- List/search/filter/sort items.
- Fetch one item.
- Update display metadata/favorites.
- Delete an item and provider asset.
- Save links/notes.
- Return app-level storage totals and available usage estimates.

Exact URL paths are an implementation decision; do not hard-code them into the design system.

## 10. Security requirements

- Never expose Cloudinary API secret, MongoDB URI, or auth secrets in client code.
- Use server-only environment variables; never use `NEXT_PUBLIC_` for secrets.
- Require authentication for every private operation.
- Verify ownership on every read, update, and delete.
- Restrict signed uploads by folder, resource type, allowed formats, and size wherever the provider supports it.
- Do not trust client-submitted asset IDs or URLs without verification.
- Avoid public listing APIs.
- Remember that a private app dashboard does not automatically make a direct Cloudinary asset URL private. Configure authenticated/signed delivery if the content itself must be protected.
- Validate and escape user-provided filenames, notes, and URLs.
- Do not commit credentials. Include only placeholders in `.env.example`.

## 11. Responsive behavior

Although desktop is the primary experience, the interface should remain usable on mobile browsers:
- Collapse sidebar to a drawer.
- Keep Upload files accessible.
- Use a single-column list or compact grid.
- Ensure file picker and preview actions fit small screens.
- Avoid horizontal overflow.
- Do not build a native mobile app in this phase.

## 12. Quality bar

- The interface must look complete, not like a generic admin template.
- Every visible button must work or be clearly disabled with an explanation.
- Include loading, empty, error, success, and disabled states.
- Use realistic sample data only in development/demo mode; never mix demo files into a real user's library.
- Use accessible semantic HTML and keyboard navigation.
- Do not add charts unless they help explain storage usage.
- Optimize thumbnails and lazy-load large previews.
- Keep compression work cancellable and avoid blocking the main UI thread.
- Provide clear success/error toasts for upload, copy, download, save, and delete actions.

## 13. Suggested build order

1. Project setup, design tokens, auth, environment validation, MongoDB connection.
2. Sidebar/header, dashboard, empty state, file grid/list, search/filter/sort.
3. Secure Cloudinary signed upload and MongoDB metadata registration.
4. Upload queue, drag-and-drop, progress, cancel/retry, direct browser-to-Cloudinary upload.
5. File preview, copy link/image, download, save link/note, metadata edit, favorite, delete.
6. Image compression and before/after size summary.
7. Optional video compression behind a feature flag after device/browser testing.
8. Storage estimates, quota warnings, security review, tests, deployment, README.

## 14. Instructions to the coding agent

Before coding:
1. Inspect the existing repository and preserve working conventions.
2. If the repository is empty, scaffold the simplest suitable Next.js + TypeScript app. Do not introduce a monorepo tool unless there are multiple real workspaces.
3. Create a short implementation plan and identify assumptions.
4. Build in small phases and keep the project runnable after each phase.
5. Add `.env.example`, setup/deployment instructions, and tests for security-sensitive flows.
6. Do not use mock APIs for the final upload flow. Connect the actual configured Cloudinary and MongoDB services.
7. Never hard-code or print real credentials.
8. Verify current Cloudinary and Vercel free-tier limits instead of assuming fixed quotas.
9. Implement a secure, usable baseline before adding video compression.
10. At completion, report what is implemented, what remains, required environment variables, and exact local run/test commands.
