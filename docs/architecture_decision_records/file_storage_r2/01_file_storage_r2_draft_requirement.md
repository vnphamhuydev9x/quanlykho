# comment 1 [Triaged]
- Sửa fileStorageService.js: upload ảnh lên R2 thay vì disk local
- Sửa buildImageUrl(): trả về R2 URL trực tiếp
# comment 2 [Triaged]
- Tổ chức folder ảnh theo entity ID: `{type}/{id}/uuid.ext` để dễ cleanup theo batch
- Issue: nếu DB reset sequence, ID cũ bị tái sử dụng → file cũ và mới lẫn lộn trong cùng folder
# comment 3 [Triaged]
- hãy tôi muốn áp dụng strategy pattern trong trường hợp này
    - một interface cho phép tương tác với file
    - phụ thuộc vào paremeter ta chọn đc provider phù hợp
    - những method hiện tại có dùng liên quan đến ảnh thì truyền parameter là m2 (biến này lấy từ config) - tôi phải làm loằng ngoằng như vậy kết quả cuối cùng vẫn dựa vào config nhưng khiến cho method của tôi dễ reuse hơn chứ k phải hard code là dựa vào config
    - có 2 provider là localStorageProvider và r2StorageProvider
# comment 4 [Triaged]
    - tôi thấy hàm sau đúng ra phải được dùng lại ở cả 2 provider, việc không dùng lại này là 1 lỗi rất cơ bản. bạn xem đã có rule nhắc về việc này chưa. nếu chưa có thì tạo mới 1 rule để lần sau chúng ta k mắc lại
    ```javascript
    const buildKey = (entityType, entityId, originalname) => {
        const ext      = path.extname(originalname);
        const filename = `${uuidv4()}${ext}`;
        return `${entityType}/${entityId}/${filename}`;
    };
    ```
    - xóa hàm sau đi ở cả inteface và các provider vì chúng ta sẽ không dùng đến
    ```javascript
    const saveFile = (buffer, entityType, entityId, originalname) =>
    provider.saveFile(buffer, entityType, entityId, originalname);
    ```

    - đổi tên hàm moveTempFile thành moveTempFileToStorage cho dễ hình dung hơn

# comment 4 [Triaged]
- hãy thêm 1 biến vào trong images là biết xem nó được upload lên đâu. kiểu như ta có 1 enum hiện tại có 2 cái là LOCAL và CLOUDFLARE_R2 để ta sẽ không cần phải code detect nó là ở local hay ở cloud thông qua url có chứa http hay không. nó cũng đồng thời giải quyết đc vấn đề sau này ta dùng thêm 1 hệ thống image khác ví dụ như s3, ch\úng ta vẫn phân biệt được đâu là cloudflare đâu là s3
- hãy dựa vào 1 biến env tên là process.env.FILE_STORAGE_PROVIDER để biết ta dùng provider nào. nó sẽ được dùng để so sánh với enum bên trên
- tôi thấy mặc dù đã có rule về dùng enum rồi nhưng code đoạn deleteDeclaration vẫn đang hard code status

# comment 5 [Triaged]
- bảng ImageDeletionQueue cũng cần thêm provider vào tôi đã bảo rồi. sau này có thể còn thêm provider khác ví dụ như s3 chứ không riêng gì cloudflare đâu
- bạn sửa lại cái rule ## 9. DRY — Shared Utility giữa các Provider/Implementation hộ tôi cái. tôi chỉ muốn nói là đừng repeat yourself thôi mà nó viết cái gì mà provider hay implementation gì đó nghe ngu thực sự
- nếu provider bằng null thì coi như nó là local đi. mà thực tế là không bao giờ có trường hợp nó bị null đâu. code này chưa golive nên chẳng bao giờ có trường hợp đó cả
- bạn hiểu sai ý tôi rồi cái thông tin imagesStorageProvider nó phải đi kèm với image url. trước kia thông tin image chỉ chứa image url thôi giờ thì cho thêm provider vào thôi. chứ k phải lưu imagesStorageProvider ở declaration hay inquiry như thế đâu. mà cái provider này nó được lấy ngay sau khi upload moveTempFileToStorage chứ không phải upload 1 nơi mà set provider 1 nơi đâu nghe nó k chuyên nghiệp

# comment 6 [Triaged]
- tôi thấy chúng ta đang dùng postgres nên việc dùng image json nghe vẻ không hay lắm. chúng nên đc tách thành 1 bảng mới rồi reference đến nhau. như vậy hợp lý hơn