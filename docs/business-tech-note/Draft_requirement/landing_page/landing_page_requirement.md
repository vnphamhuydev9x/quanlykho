# tôi muốn làm mới 1 landing page
## functional requirements
- cho phép người dùng lạ vào để đặt câu hỏi và kèm theo email của họ để đội ngũ admin và sale, chứng từ trả lời
- câu hỏi sẽ có format như sau, đây là 1 ví dụ:
    ```text
    Để check thuế phí sản phẩm anh/chị vui lòng gửi giúp em thông tin các sản phẩm theo các nội dung sau để em hỗ trợ nhanh và chính xác hơn, tránh phải trao đổi lại nhiều lần ạ.
    – Tên sản phẩm
    – Chất liệu
    – Công dụng
    – Kích thước/kích cỡ
    – Nhãn hàng (nếu có; nếu không có, anh/chị ghi giúp “không hiệu”)
    – Thông tin đặc thù của sản phẩm (ví dụ: có pin, điện áp, áp suất… nếu có)
    – Hàng máy móc thì phải cần có thông số kỹ thuật, catalogue, tem etiket dán trên máy
    – Nhu cầu: CSNK, giá khai, …
    ```
- sau khi khách hàng gửi câu hỏi ta response lại id và nội dung câu hỏi cho khách hàng
- sau khi khách hàng gửi câu hỏi, sẽ có 1 bản ghi được hiển thị thêm trong menu "Tư vấn khách hàng"
    - menu này hiển thị 1 table liệt kê tất cả các câu hỏi của khách hàng
        - sắp xếp theo: câu hỏi chưa được trả lời lên trước, câu hỏi nào hỏi lâu rồi lên trước
        - ngoài các thông tin bên trên, thêm thông tin số thời gian đã hỏi(ý là tính từ lúc có câu hỏi đến giờ đã trải qua bao lâu rồi mà chưa có câu trả lời - tính real time, có thể nhìn thấy số giây nhảy - cái này chỉ cần dùng FE để nhảy số giây thôi)
- admin và sale sẽ nhìn thấy ngay lập tức những câu hỏi của khách hàng, họ sẽ view câu hỏi và review xem câu hỏi có chứa thông tin nhạy cảm nào không?
    - nếu ok thì ấn nút nào đó để báo rằng đã review xong và nhân viên chứng từ lúc nào mới nhìn thấy câu hỏi
    - nếu không thì reject -> nhân viên chứng từ không nhìn thấy câu hỏi, update trạng thái review
- nhân viên chứng từ khi nhìn thấy câu hỏi thì có thể view record và chỉ được update trường thông tin câu trả lời
- sau khi nhân viên chứng từ trả lời, admin và sale sẽ nhìn thấy và lại review
    - nếu review ok thì ấn nút nào đó để hệ thống gửi email phản hồi khách hàng
    - nếu không thì reject, update trạng thái review

- mẫu email trả lời
    ```text
    Cty 3T Group
    - nội dung khách hỏi
    - Nội dung trả lời
    ```

## non functional requirements
- có tính năng noti khi có câu hỏi mới đến và khi có sự thay đổi về trạng thái của câu hỏi
- thêm 1 icon cái chuông bên cạnh avatar của người dùng.
- FE sẽ scan 5s 1 lần để biết có noti mới hay không
- khi click vào chuông thì sổ dọc 1 danh sách các noti, có nút set tất cả các noti là đã đọc
- có noti báo rằng có 1 tin nhắn mới cho phép người dùng click vào và đi đến menu "Tư vấn khách hàng" và mở popup view câu hỏi đó -> tính là đã read
- số lượng các noti chưa được xử lý sẽ xuất hiện trên tab của browser
- với admin và sale thì hiển thị noti khi có câu hỏi mới, khi có update câu trả lời của nhân viên chứng từ
- với với nhân viên chứng từ thì có noti khi có câu hỏi mới(sau khi đã được admin, sale approve câu hỏi, vì nếu chưa thì chứng từ không hề biết sự xuất hiện của câu hỏi của khác hàng)

## technical spec notes
- sử dụng lại và enhance cơ chế noti hiện tại(khi mã hàng có update) chỉ khác là cách hiển thị noti và type noti mới (có sử dụng redis cache, và đối tượng Notification)
- khi có noti mới thì đồng thời fetch lại data của table trong menu "Tư vấn khách hàng"


# review implement 1
- tôi thấy mấy cái constant như kiểu roles và status đang không get ra từ enum mà là plan text -> cho vào enum
	- ví dụ như roles
	- inquiry status
-> cần xem xem có rule cho BE đoạn này chưa nếu chưa có thì thêm vào
- chứng từ chỉ không nhìn thấy các inquiry nếu chưa đc approve bước 1 thôi. còn lại là nhìn thấy hết. hiện tại đang 
- các api trong inquiryController.js đang không verify role admin và sale dẫn đến nếu họ không phải là chứng từ thì họ có thể làm nhiều thứ. tham khảo file source\backend\src\routes\categoryRoute.js
	- nếu đúng vậy thì cần thêm 1 rule cho BE đó là khi implement BE api phải có bộ roles chuẩn nếu không có thì bạn phải hỏi tôi

# review implement 2
- tôi có 1 update nhỏ về functional requirment đó là nhân viên chứng từ họ chỉ nhìn thấy như sau:
    - đã có những câu hỏi nào
    - họ đã trả lời những câu hỏi nào
    - họ không biết là trước đó có cái nào đã bị reject và sau đó cái nào đã bị reject
    - => bạn update vào docs\business-tech-note\Draft_requirement\landing_page\landing_page_requirement_rephrase.md nhé

- về roles thì bản chất là admin làm đc tất cả nên config như sau cần bổ sung thêm admin:
    - router.put('/:id/answer', authMiddleware, roleMiddleware([ROLES.CHUNG_TU]), inquiryController.submitAnswer);

- bạn bổ sung thêm thông tin trong quá trình phát triển phần mềm của tôi là, tôi bây giờ sẽ viết trong các file draft requiment sau đó sẽ cần bạn fix những review của tôi. nếu có thay đổi nào liên quan đến business (functional requirment, nonfunctional requirment thì bạn **BẮT BUỘC** phải update vào rephrase version)


# review implement 3
- get list câu hỏi dang chưa có sort theo đúng mô tả liên quan đến việc cho các câu hỏi mà chưa trả lời lên trước
- tôi thấy INQUIRY_STATUS đang có các trạng thái viết bằng text nên chúng ta cần override hàm compare hẳn hoi chứ không thể là dựa vào chữ cái abc để đánh giá cái nào trước cái nào sau đc
- không nên viết thế này if (role === ROLES.CHUNG_TU) mà if (ROLES.CHUNG_TU === role) để tránh nullpointer exception => thêm rule
- với nhân viên chứng từ, logic hiện tại đang chưa đúng ý tôi.
    - đúng là họ k nhìn thấy các câu hỏi chưa có approve 1
    - sai họ k nhìn thấy câu hỏi mà bị reject lần review 2
    - nên: họ k nhìn thấy các câu hỏi chưa có approve 1, sau đó họ chỉ nhìn thấy tất cả các câu hỏi còn lại, nhưng chỉ biết là câu hỏi đó đã đc trả lời hay chưa.
        - trả lời rồi mà approved -> đã sent email -> cũng chỉ hiện là đã trả lời
        - trả lời rồi mà reject cũng hiển thị là đã trả lời
- update thêm rằng nhân viên chứng từ không nhìn thấy thông tin email của người hỏi

# review implement 4
- đoạn sau trong rephrase bị sai nhé:
    - **Trạng thái chi tiết**: Chứng từ chỉ biết câu hỏi "chưa trả lời" hay "đã trả lời" — không biết câu trả lời đang bị reject hay đã gửi email thành công. Việc mapping status → nhãn hiển thị do FE xử lý.
    - trạng thái phải bảo mật từ BE không thể để FE hanlde vụ này được. vì thực tế nhân viên chứng từ đang được coi là người ngoài trong hệ thống này. nên phải cực kỳ cẩn thận. không để lộ thông tin khách hàng cho họ được.
- không cần có chức năng này, khi bị reject không có 1 noti nào cả
    - **Khi bị reject lần 2**: Admin/sale gửi notification cho chứng từ. Chứng từ click vào notification để mở trực tiếp popup câu hỏi đó và sửa lại — có thể tìm trong list (thấy là "đã trả lời") hoặc qua notification.

# review implement 5
- tôi thấy cũng không cần thiết phải bảo mật đến mức vậy :D. thôi quay lại thành cho phép nhân viên chứng từ biết được trạng thái chính xác sau khi họ đã trả lời(đã bị reject đã được gửi đến khách hàng) để họ còn có cơ hội vào sửa lại câu trả lời

# review implement 6
- sửa lại thành khi bị reject thì người chứng từ sẽ nhận được noti cho sự reject đó.
- cần có thêm 1 trường ghi chú cho câu hỏi và có toltip rõ rằng nó sẽ không được gửi đi trong email mà chỉ dùng để lưu nội bộ

# review implement 6
- giúp tôi ignore các file trong D:\projects\quanlykho\source\frontend\.vite\. Nếu nó không cần thiết phải push lên
- thứ tự này chưa chuẩn
    ```javascript
    const STATUS_PRIORITY = {
        [INQUIRY_STATUS.PENDING_REVIEW]: 1,
        [INQUIRY_STATUS.PENDING_ANSWER]: 2,
        [INQUIRY_STATUS.ANSWER_REJECTED]: 3,
        [INQUIRY_STATUS.PENDING_SEND]: 4,
        [INQUIRY_STATUS.QUESTION_REJECTED]: 5,
        [INQUIRY_STATUS.EMAIL_SENT]: 6,
    };
    ```
    - nên là
    ```javascript
    const STATUS_PRIORITY = {
        [INQUIRY_STATUS.PENDING_REVIEW]:
        [INQUIRY_STATUS.PENDING_ANSWER]:
        [INQUIRY_STATUS.PENDING_SEND]
        [INQUIRY_STATUS.EMAIL_SENT]
        [INQUIRY_STATUS.ANSWER_REJECTED]:
        [INQUIRY_STATUS.QUESTION_REJECTED]:
    };
    ```
    - => update vào rephrase.md file nhé(update phần requirement chứ k phải bê code vào trong đó nhé)
- đoạn này có redis vào là ngon hơn, ttl dài ra là đỡ phải query vào db
    ```javascript
    const getUserIdsByRoles = async (roles)
    ```
- đoạn này chỉ cần email là required thôi -> nhớ check null và update vào rephrase.md file(update phần requirement chứ k phải bê code vào trong đó nhé)
    ```js
        if (!email || !productName || !material || !usage || !size || !brand || !demand) {
                return res.status(400).json({ code: 400, message: 'Missing required fields' });
            }
    ```
- đoạn này code hình như chưa chuẩn, khi bị reject nó cũng vào luồng này. => noti sẽ không chuẩn
    ```js
     if (approved) {
        // Chỉ đến lúc này CHUNG_TU mới được notify
        const chungTuIds = await getUserIdsByRoles([ROLES.CHUNG_TU]);
        await createInquiryNotification(
            chungTuIds,
            `New inquiry approved and needs answer from ${inquiry.email}`,
            inquiry.id
        );
    }
    ```
# review implement 7
- hãy suy nghĩ thêm về việc apply cache cho các api của phần này nhé. vì tôi nghĩ đội người dùng sẽ hay dùng kiểu f5 để hi vọng có data mới lắm :D

# review implement 8
- chúng ta đang quên 1 thứ rất quan trọng đó là pagin -> hãy update code nhé -> udpate vào rephrase.md file nhé. mục nonfunctional requirement
- update luôn caching vì khi xuất hiện paging key sẽ phải khác đi

# review implement 9
- tôi không thích lý do này: Tại sao in-memory pagination hợp lý ở đây: sort ORDER dựa trên STATUS_PRIORITY là custom logic, không thể dùng DB-level skip/take kết hợp với custom sort. Inquiry table kỳ vọng nhỏ, nên fetch-all + sort + cache + paginate là đủ tốt.
- vậy hãy chuyển status thành số nhé. rồi mapping với text để hiển thị sau
- tôi cần cache 1 cách chuyên nghiệp chứ k phải là do data ít mà làm nhì nhằng xong sau này nó lớn lên lại gặp vấn đề đc

# review implement 10
- nội dung notification đang là tiếng anh, hãy sửa thành hỗ trợ 2 thứ tiếng tiếng trung và tiếng việt, FE dựa vào ngôn ngữ của người dùng để hiển thị tương ứng
- đang gặp lỗi khi click vào noti nó không hiển thị ra popup mà phải f5 nó mới hiện ra
- nút xem chuyển thành icon mắt như các table khác nhé bạn

# review implement 11
- cần có 1 trang hiển thị tất cả các thông báo của một người. hiển thị theo paging, khi vào trang thì có nút load more.
- khi ấn vào nút thông báo thì hiển thị danh sách thông báo sorted mới nhất đứng lên đầu và có màu nền khác để đánh dấu là chưa đọc còn lại đã đọc rồi thì màu nền khác
- thêm seed data cho có đa dạng các câu hỏi ở các trạng thái khác nhau. tương ứng có nhiều notification để demo cho người dùng hình dung được

# review implement 12
- bạn đổi path tu-van và thong-bao thành tiếng anh nhé.
- cho menu tư vấn khách hàng lên đầu tiên
- khi view page thông báo click vào thông báo chưa đọc thì đang chưa gửi api read
- gộp thông báo theo từng ngày để cho view thông báo nó xịn xò hơn xíu (ở cả 2 nơi)

# review implement 13
- hãy thêm 1 thông tin vào menu tư vấn khách hàng khi dẫn ta đến landing page. đoạn này có lưu ý nhỏ đó là nếu golive thì landing sẽ ở link kiểu như là product.com/ còn admin sẽ ở admin-product.com kiểu kiểu thế. không biết đúng không. hãy giúp tôi hiểu đoạn này và thêm link đến landing page một cách thông minh (configable)

# review implement 14
- thời gian chờ khi nó đạt quá 24h thì đổi thành đơn vị ngày nhé. chỉ đơn vị ngày thôi không có đơn vị tuần tháng năm
- table tư vấn khách hàng hiển thị tất cả các thông tin ra, nhớ là nhân viên chứng từ không nhìn thấy email của khách
- sửa FE cho phép nhân viên chứng từ nhìn thấy duy nhất menu tư vấn khách hàng.
- thêm filter theo status và tìm kiếm theo id và nội dung câu hỏi kiểu như khi search là abc thì phải xem tất cả các câu hỏi có câu nào có string nào trong đống thông tin có chữ abc đó không

# review implement 15
- bạn chưa update logic liên quan đến filter vào trong rephrase
- search bar có FE chưa đẹp lắm hãy làm giống menu khách hàng, thang search dài và thành filter ở dưới. có nút tìm kiếm và nút xóa lọc. chú ý copy cách css để responsive cho chuẩn
- theo tôi là không cần cho 1 sublink xem trang tư vấn đâu. cho nó đứng bên cạnh title "Tư vấn khác hàng" là xong

# review implement 16
- đối với nhân viên chứng từ thì họ sẽ không thể có option mà chờ xem xét hoặc câu hỏi bị từ chối đc
- một số chỗ key chưa có message bạn hãy scan lại để update nhé
