# Trading Journal

[Tiếng Việt](README.md) · [English](README.en.md)

Ứng dụng nhật ký giao dịch cá nhân — ghi chép trade, upload ảnh chart, lọc/sắp xếp theo ngày, và tùy chỉnh giao diện.

## Tech stack

| Phần | Công nghệ |
|------|-----------|
| Frontend | Vue 3, TypeScript, Vue Router, Tailwind CSS v4, Vite |
| Backend | Node.js, Express 5, SQLite (`node:sqlite`) |
| Ảnh | Multer (upload), Sharp (thumbnail WebP) |
| Auth | Bearer token, credentials trong `.env` |

## Tính năng

### Nhật ký giao dịch
- Bảng compact: No., Date, Session, Pair, R:R, PnL, Note, HTF/MTF/LTF
- Inline edit, auto-save (debounce 500ms)
- Paste / upload ảnh chart (Ctrl+V), xem full qua lightbox
- Thumbnail WebP ~320px trong bảng, click mới load ảnh gốc
- Gợi ý pair từ database
- Lọc theo khoảng ngày, nút **Tuần này** / **Tháng này**
- Sort: Date (theo `created_at`), Session, Pair, R:R, PnL
- Expand ảnh toàn cục hoặc từng dòng

### Xác thực
- Chưa đăng nhập: chỉ xem (read-only)
- Đăng nhập: thêm/sửa/xóa entry, upload ảnh
- Token lưu trong `sessionStorage` (mất khi đóng tab)

### Giao diện
- Dark / light mode (lưu `localStorage`)
- Tùy chỉnh nền trang: màu solid, pattern, hoặc upload ảnh
- Cài đặt nền lưu server + `localStorage` (ảnh nền cần đăng nhập)

## Cấu trúc thư mục

```
journal/
├── frontend/          # Vue SPA (dev :5173)
├── backend/           # Express API + serve static production
│   ├── src/           # server, routes, db, auth
│   ├── data/          # journal.db (SQLite)
│   ├── uploads/       # ảnh chart + ảnh nền
│   ├── dist/          # frontend build (production)
│   └── .env           # AUTH_USERNAME, AUTH_PASSWORD
├── scripts/
│   └── build.sh       # build frontend → backend/dist
└── ecosystem.config.js  # PM2 config
```

## Yêu cầu

- **Node.js** `^22.18.0` hoặc `>=24.12.0` (frontend)
- **npm**

## Cài đặt

```bash
# Clone / vào thư mục project
cd journal

# Cài dependencies
cd frontend && npm install
cd ../backend && npm install
```

### Biến môi trường

Tạo file `backend/.env` (tham khảo `backend/.env.example`):

```env
AUTH_USERNAME=admin
AUTH_PASSWORD=your-password
```

> File `.env` đã được gitignore — không commit credentials.

## Chạy development

Mở **2 terminal**:

```bash
# Terminal 1 — API (:3001)
cd backend && npm run dev

# Terminal 2 — Frontend (:5173, proxy /api và /uploads)
cd frontend && npm run dev
```

Truy cập: http://localhost:5173

## Production

### 1. Build frontend vào backend

```bash
./scripts/build.sh
# hoặc
cd backend && npm run build:frontend
```

Script sẽ `npm run build` trong `frontend/` rồi copy output vào `backend/dist/`.

### 2. Chạy server

```bash
cd backend && npm start
```

Truy cập: http://localhost:3001 — backend serve cả API lẫn static HTML.

### 3. PM2 (tùy chọn)

```bash
# Từ thư mục gốc project, sau khi đã build frontend
pm2 start ecosystem.config.js
```

Cấu hình mặc định: port `3001`, `NODE_ENV=production`.

## API

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| `GET` | `/api/entries` | — | Danh sách entries |
| `GET` | `/api/pairs` | — | Danh sách pair đã dùng |
| `POST` | `/api/entries` | ✓ | Tạo entry |
| `PATCH` | `/api/entries/:id` | ✓ | Cập nhật entry |
| `DELETE` | `/api/entries/:id` | ✓ | Xóa entry |
| `POST` | `/api/entries/:id/images/:slot` | ✓ | Upload ảnh (`htf`/`mtf`/`ltf`) |
| `DELETE` | `/api/entries/:id/images/:slot` | ✓ | Xóa ảnh |
| `POST` | `/api/auth/login` | — | Đăng nhập |
| `POST` | `/api/auth/logout` | ✓ | Đăng xuất |
| `GET` | `/api/auth/me` | ✓ | Kiểm tra session |
| `GET` | `/api/settings/background` | — | Đọc cài đặt nền |
| `PUT` | `/api/settings/background` | ✓ | Cập nhật nền |
| `POST` | `/api/settings/background/image` | ✓ | Upload ảnh nền |

Ảnh static: `/uploads/<filename>`

## Dữ liệu

| Dữ liệu | Vị trí |
|---------|--------|
| SQLite DB | `backend/data/journal.db` |
| Ảnh chart / nền | `backend/uploads/` |
| Theme, nền (cache) | `localStorage` (browser) |
| Cài đặt nền (server) | bảng `settings` trong SQLite |
| Auth token | `sessionStorage` (browser) |

Backup: copy `backend/data/journal.db` và thư mục `backend/uploads/`.

## Scripts hữu ích

```bash
# Frontend
cd frontend
npm run dev          # dev server
npm run build        # build production
npm run type-check   # kiểm tra TypeScript
npm run lint         # eslint + oxlint

# Backend
cd backend
npm run dev          # API + hot reload (--watch)
npm start            # production
npm run build:frontend
```

## Ghi chú

- SQLite dùng `node:sqlite` built-in (Node 22+), không cần `better-sqlite3`.
- Upload ảnh chart tự tạo thumbnail `*-thumb.webp` qua Sharp.
- `backend/dist/` và `backend/data/*.db` không được commit (xem `.gitignore`).
