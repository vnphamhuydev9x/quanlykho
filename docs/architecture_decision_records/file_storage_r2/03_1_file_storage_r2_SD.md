Version: SD-v1.2.0
Base on Requirement Version: N/A (Technical Design only)

---

# 1. Data Model (Database Schema)

## Bảng & Trường

### 1.1 Image (`images`) — THÊM MỚI

Bảng chứa metadata từng ảnh, thay thế JSON field trong Declaration/CustomerInquiry.

```prisma
model Image {
  id            Int              @id @default(autoincrement())
  url           String           @db.Text  // Full URL (R2) hoặc relative path (LOCAL)
  provider      String                     // STORAGE_PROVIDER enum: LOCAL | CLOUDFLARE_R2
  sortOrder     Int              @default(0) // Thứ tự hiển thị (0-based); Declaration tối đa 3 ảnh

  // FK — chỉ 1 trong 2 được set, cái còn lại null
  declarationId Int?
  declaration   Declaration?     @relation(fields: [declarationId], references: [id])

  inquiryId     Int?
  inquiry       CustomerInquiry? @relation(fields: [inquiryId], references: [id])

  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  @@index([declarationId])
  @@index([inquiryId])
  @@map("images")
}
```

**Constraint nghiệp vụ (enforced ở BE):**
- `declarationId != null` XOR `inquiryId != null` — mỗi Image chỉ thuộc 1 entity
- Declaration: tối đa 3 Image rows per `declarationId`
- CustomerInquiry: tối đa 1 Image row per `inquiryId`

---

### 1.2 Declaration (`declarations`) — THAY ĐỔI

| Field | Thay đổi | Ghi chú |
|-------|----------|---------|
| `images String? @db.Text` | **XÓA** | Thay bằng relation `images Image[]` |

```prisma
// Thêm vào model Declaration:
images  Image[]
```

---

### 1.3 CustomerInquiry (`customer_inquiries`) — THAY ĐỔI

| Field | Thay đổi | Ghi chú |
|-------|----------|---------|
| `image String? @db.Text` | **XÓA** | Thay bằng relation `images Image[]` |

```prisma
// Thêm vào model CustomerInquiry:
images  Image[]
```

---

### 1.4 ImageDeletionQueue (`image_deletion_queue`) — KHÔNG THAY ĐỔI

Giữ nguyên `imageUrl` + `provider` per entry (không FK về `images` table).
Lý do: cần persist URL để retry cleanup kể cả sau khi Image row đã bị hard-delete.

```prisma
model ImageDeletionQueue {
  id        Int      @id @default(autoincrement())
  imageUrl  String               // Full URL hoặc relative path cần xóa
  provider  String   @default("LOCAL")   // STORAGE_PROVIDER enum: LOCAL | CLOUDFLARE_R2
  status    String   @default("PENDING") // IMAGE_DELETION_STATUS enum: PENDING | DONE | FAILED
  retries   Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("image_deletion_queue")
}
```

---

## Database Indexing Strategy

| Index | Trên bảng | Lý do |
|-------|-----------|-------|
| `@@index([declarationId])` | `images` | Query ảnh theo declaration |
| `@@index([inquiryId])` | `images` | Query ảnh theo inquiry |

---

# 2. API Specification

## 2.1 fileStorageService Public API — KHÔNG THAY ĐỔI so với SD-v1.1.0

```
moveTempFileToStorage(tempFilePath, entityType, entityId, originalname)
  → Promise<{ url: string, provider: string }>

buildImageUrl(imageData)  → string | null
// imageData: Image row (Prisma) hoặc { url, provider } hoặc string (legacy)

deleteFile(imageUrl)      → Promise<void>
deleteTempFiles(files)    → void
```

`buildImageUrl` tương thích với Prisma `Image` model vì `Image` row có `url` và `provider` — cùng shape với ImageObject.

---

## 2.2 Declaration — Thay đổi response/request format

### GET response (có images)
```json
{
  "id": 1,
  "images": [
    { "id": 1, "url": "https://pub-xxx.r2.dev/declarations/1/uuid.jpg", "provider": "CLOUDFLARE_R2", "sortOrder": 0 },
    { "id": 2, "url": "https://pub-xxx.r2.dev/declarations/1/uuid2.jpg", "provider": "CLOUDFLARE_R2", "sortOrder": 1 }
  ],
  "imageUrls": ["https://...", "https://..."]
}
```
`imageUrls` giữ lại để backward compat với FE (absolute URL strings, built bằng `buildImageUrl`).

### PUT request (update images)
```
multipart/form-data:
  files[]         → new image files (optional)
  keepImageIds    → JSON array of Image IDs to keep, e.g. "[1,2]"
                    (images không có trong list này sẽ bị xóa)
```

---

## 2.3 CustomerInquiry — Thay đổi response format

### GET response (có image)
```json
{
  "id": 9,
  "images": [
    { "id": 5, "url": "https://pub-xxx.r2.dev/inquiries/9/uuid.jpg", "provider": "CLOUDFLARE_R2", "sortOrder": 0 }
  ],
  "imageUrl": "https://..."
}
```
`imageUrl` giữ lại để backward compat (absolute URL của ảnh đầu tiên).

---

# 3. Cache Strategy (Redis)
Không thay đổi so với SD-v1.1.0. Cache key, TTL, invalidation logic giữ nguyên.

---

# 4. Core Business Logic & Workflows

## 4.1 Upload Image Flow — THAY ĐỔI

### Declaration (update có upload ảnh mới)
```
1. Multer lưu file vào temp dir
2. imageObject = await moveTempFileToStorage(tempPath, 'declarations', id, filename)
   → { url: "https://...", provider: "CLOUDFLARE_R2" }
3. Đếm ảnh hiện tại: COUNT Image WHERE declarationId = id
4. Validate: (existing_count + new_count) ≤ 3
5. INSERT Image: { url, provider, sortOrder: existing_count, declarationId: id }
6. Xóa temp file trong finally block
```

### CustomerInquiry (submit có file)
```
1. CREATE CustomerInquiry (chưa có image)
2. Upload: imageObject = await moveTempFileToStorage(tempPath, 'inquiries', inquiry.id, filename)
3. INSERT Image: { url, provider, sortOrder: 0, inquiryId: inquiry.id }
4. Xóa temp file trong finally block
```

---

## 4.2 Update Declaration — Xử lý keepImageIds

```
1. Parse keepImageIds từ request body (JSON array of int)
2. Query existing images: Image[] WHERE declarationId = id
3. Tính images cần xóa: existing - keepImageIds
4. Validate: len(keepImageIds) + len(newFiles) ≤ 3
5. Transaction:
   a. Enqueue deleted images (R2 only) → ImageDeletionQueue { imageUrl, provider, status: PENDING }
   b. DELETE Image rows không trong keepImageIds
   c. Upload + INSERT new Image rows (sortOrder = keepCount + index)
6. Best-effort: cleanup R2 files đã enqueue
```

---

## 4.3 Delete Declaration Flow — THAY ĐỔI

```
1. Query: Declaration với include: { images: true }
2. Lọc r2Images: images có provider = CLOUDFLARE_R2 (hoặc legacy http URL)
3. Transaction:
   a. INSERT ImageDeletionQueue: { imageUrl: img.url, provider: img.provider, status: PENDING }
      cho từng r2Image
   b. DELETE Image rows WHERE declarationId = id  (hard delete)
   c. UPDATE Declaration: { deletedAt: now() }
4. Best-effort: gọi deleteFile(url), update queue status → DONE hoặc giữ PENDING
```

**Lý do hard-delete Image rows:** Image table chỉ là metadata; entity (Declaration) đã soft-delete thì Image rows không còn dùng nữa. ImageDeletionQueue đã lưu đủ thông tin để retry mà không cần Image row còn tồn tại.

---

## 4.4 Delete CustomerInquiry Flow (nếu có)

```
1. Query: CustomerInquiry với include: { images: true }
2. Xử lý images tương tự Delete Declaration (§4.3)
3. Hard-delete Image rows + Soft-delete CustomerInquiry
```

---

## 4.5 Format Response Helper

```js
// Build imageUrls[] từ Image[] (backward compat)
const toImageUrls = (images) =>
    (images || [])
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(img => buildImageUrl(img))
        .filter(Boolean);
```

---

## 4.6 Storage Architecture (không đổi từ SD-v1.1.0)

### Strategy Pattern
```
fileStorageService.js (facade)
    ├── localStorageProvider.js   ← FILE_STORAGE_PROVIDER != 'CLOUDFLARE_R2'
    └── r2StorageProvider.js      ← FILE_STORAGE_PROVIDER == 'CLOUDFLARE_R2'
```

### Provider Interface
```
moveTempFileToStorage(tempFilePath, entityType, entityId, originalname) → Promise<string>
deleteFile(imageUrl) → Promise<void>
```

### Shared Utility: storageUtils.buildKey
```
{entityType}/{entityId}/{uuid}{ext}
```

### Provider Selection
```js
const isR2 = STORAGE_PROVIDER.CLOUDFLARE_R2 === process.env.FILE_STORAGE_PROVIDER;
```

### Env Vars
| Var | Mô tả |
|-----|-------|
| `FILE_STORAGE_PROVIDER` | `CLOUDFLARE_R2` \| `LOCAL` (default) |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET_NAME` | Tên bucket |
| `R2_PUBLIC_URL` | Public URL prefix |
| `BE_HOST` | Backend host (dùng khi build LOCAL URL) |

---

## 4.7 buildImageUrl Logic (không đổi từ SD-v1.1.0)

```js
buildImageUrl(imageData) {
  if (!imageData) return null;
  // Object { url, provider } hoặc Prisma Image row
  if (typeof imageData === 'object' && imageData.url) {
    const p = imageData.provider ?? STORAGE_PROVIDER.LOCAL;
    if (STORAGE_PROVIDER.CLOUDFLARE_R2 === p) return imageData.url;
    return `${BE_HOST}${imageData.url}`;
  }
  // Legacy string
  if (typeof imageData === 'string') {
    if (imageData.startsWith('http')) return imageData;
    return `${BE_HOST}${imageData}`;
  }
  return null;
}
```
