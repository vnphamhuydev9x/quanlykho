# Quy trình Kiểm thử (Test Workflow)

Tài liệu hướng dẫn chạy Integration Test theo quy trình tách biệt (Black-box).

## Bước 1: Bật Môi trường (Docker)
Bật Database và Redis cho môi trường test.
```bash
cd d:\projects\quanlykho\deploy
docker-compose -f docker-compose.test.yml up -d
```

## Bước 2: Setup Project Test (Lần đầu hoặc khi có Schema mới)
Cài đặt thư viện, copy schema và đồng bộ DB:
```bash
cd d:\projects\quanlykho\source\integration_tests
npm install
npm run setup
```

## Bước 3: Bật Server Backend (Target)
Mở một **Terminal mới**, chạy Backend ở chế độ Test (Port 5001) để Test Suite gọi vào.
```bash
cd d:\projects\quanlykho\source\backend
npm run dev:test
```
*Giữ Terminal này chạy trong suốt quá trình test.*

## Bước 4: Chạy Integration Test
Ở một **Terminal khác**, chạy bộ test từ folder `integration_tests`:

**Chạy toàn bộ test:**
```bash
cd d:\projects\quanlykho\source\integration_tests
npm test
```

**Chạy chế độ Watch (Code đến đâu test đến đó):**
```bash
cd d:\projects\quanlykho\source\integration_tests
npm run test:watch
```

---
## Lệnh tiện ích (Tại folder integration_tests)

*   `npm run db:push`: Cập nhật lại cấu trúc DB (khi có thay đổi Schema).
*   `npm run generate`: Regenerate Prisma Client.
