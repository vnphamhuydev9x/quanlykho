# Frontend Build Guide

## Các file env

| File | Dùng khi | Commit? |
|---|---|---|
| `.env` | Dev local (`npm run dev`) | ✅ |
| `.env.dev` | Build deploy lên Cloudflare Pages (dev cloud) | ✅ |
| `.env.production` | Build deploy lên Cloudflare Pages (prod) | ✅ (không có secret) |

Vite load theo thứ tự ưu tiên: `.env.[mode].local` > `.env.[mode]` > `.env.local` > `.env`

---

## Build cho từng môi trường

### Local dev
```bash
cd source/frontend
npm run dev
```
Tự load `.env` → trỏ vào `http://localhost:3000`.

### Build deploy lên dev cloud (Cloudflare Pages)
```powershell
cd source/frontend
npm run build -- --mode dev
```
Load `.env.dev` → trỏ vào Cloud Run dev.

Output: `source/frontend/dist/` → kéo thả lên Cloudflare Pages project `quanlykho-dev`.

### Build deploy lên production (Cloudflare Pages)
```powershell
cd source/frontend
npm run build -- --mode production
```
Load `.env.production` → trỏ vào `api.3tgroup.com`.

Output: `source/frontend/dist/` → kéo thả lên Cloudflare Pages project `quanlykho-prod`.

---

## Deploy lên Cloudflare Pages (drag & drop)

1. Vào Cloudflare Dashboard → Workers & Pages → chọn project
2. **Create deployment** → kéo thả thư mục `dist`
3. Domain chính tự động trỏ vào deployment mới nhất
