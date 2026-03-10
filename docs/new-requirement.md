# Tôi muốn thêm 1 menu tên là "Xuất kho"
- vị trí nằm bên dưới menu hàng tồn
- Chức năng xuất kho này có nhiều điểm tương đồng với chức năng xếp xe (hãy tham khảo document của xếp xe để hiểu thêm nhé):
    - vào menu mã hàng -> tất cả -> chọn nhiều mã hàng -> hiển thị 1 thanh thông tin trong đó có nút xếp xe -> chúng ta sẽ thêm 1 nút nữa là "tạo lệnh xuất kho"
    - click nút xuất kho
	    - validate tất cả các mã hàng đều ở trạng thái xe là "Đã nhập kho việt nam"
	    - hiển thị popup điền thông tin của việc xuất kho này bao gồm:
		    - ngày giờ khách nhận hàng: date time picker
            - chi phí giao hàng; integer, đơn vị VND
            - ghi chú: string text area
            - trạng thái xuất kho: selection box có các option là:
                - đã lệnh xuất kho
                - đang xác nhận số cân đo lại
                - đã xác nhận số cân
                - đã xuất kho

- liên quan đến trạng thái xuất kho này tôi cũng không giỏi trình bày sao cho mạch lạc nên tôi cứ đưa ra các gạch đầu dòng rồi bạn viết lại cho mạch lạc và BRD nhé
    - khi mã hàng được vận chuyển về kho việt nam -> trạng thái xe của mã hàng sẽ thành "Đã nhập kho việt nam"
    - admin hoặc sale sẽ vào chọn các mã hàng đó và ấn nút "tạo lệnh xuất kho" -> sẽ có 1 bản ghi trong menu xuất kho được tạo ra với các thông tin ngày giờ khách nhận hàng, chi phí giao hàng, ghi chú được tạo ra và trạng thái lúc tạo này sẽ là "đã tạo lệnh xuất kho"
    - nhân viên kho sẽ vào menu hàng tồn -> tồn kho việt nam để nhìn những mã hàng đã về kho việt nam. đoạn này chưa được implement. logic của menu này là hiển thị các mã hàng có trạng thái xe là "Đã nhập kho việt nam". 
        - có sorted by như sau:
            - ưu tiên cái mã hàng nào mà có ngày giờ khách nhận hàng gần nhất(đoạn này ta phải thiết kế db làm sao để biết đc mã hàng nào có thông tin ngày giờ khách nhận hàng nào. chọn 1 trong 2 solution là join vào xuất kho để lấy rồi sort hay là clone thông tin sang mã hàng để sort)
            - sau đó là sorted by id ý là cái nào tạo trước thì hiển thị trước cái nào tạo sau thì hiển thị sau
    - nhân viên kho sẽ biết là những mã hàng nào đã tạo lệnh xuất kho và tiến hàng cân đo lại. đoạn này cần thêm trường thông tin cho các mặt hàng của mã hàng. thông tin đó bao gồm:
        - Trọng lượng sau khi cân lại(tham khảo type và đơn vị, cách hiển thị như trường thông tin trọng lượng đang có)
        - khối lượng sau khi cân lại(tham khảo type và đơn vị, cách hiển thị như trường thông tin khối lượng đang có)
        - tổng cước TQ_HN sau khi cân lại: đoạn này được hiểu là do trọng lượng và khối lượng sau khi cân lại có thể có thay đổi dẫn đến giá cước sẽ bị thay đổi theo. cần hiển thị ra để admin hoặc sale biết và duyệt lại
        - chi phí NK hàng hóa đến tay KH sau khi cân lại cũng sẽ bị thay đổi. công thức thì vẫn vậy nhưng căn bản là số liệu sẽ được tính trên khối lượng và trọng lượng có được khi cân lại. bạn tham khảo công thức cũ để hiểu thêm nhé
        - todo: cách hiển thị sao cho hợp lý ở cả mặt hàng và mã hàng thì tôi vẫn chưa biết -> bạn hãy suggest tôi 1 cách nhé. hiện tại tôi chấp nhận là có thêm 1 đống trường thông tin mà k được UI UX tốt
    - nhân viên kho sau khi cân đo lại sẽ có 1 nút là gửi thông tin cân lại. -> đối tượng xuất kho này sẽ có trạng thái là "đang xác nhận số cân đo lại"
    - ta cần tạo thêm 1 sub menu mới trong menu xuất kho này có tên là "đang xác nhận số cân đo lại" chỉ hiển thị những xuất kho mà có trạng thái "đang xác nhận số cân đo lại"
    - admin vào menu xuất kho -> "đang xác nhận số cân đo lại" và quyết định xem là họ sẽ để mã hàng với thông tin cũ hay replace bằng thông tin sau khi đã cân lại. UI UX đoạn này tôi cũng chưa có ý tưởng gì. Sau đó admin ấn nút xác nhận số cân -> đối tượng xuất kho này chuyển sang trạng thái "đã xác nhận số cân"
    - nhân viên kho vào menu tồn kho vn thấy có xuất kho là đã xác nhận số cân -> gọi shipper đến để trở hàng đi -> nhập thông tin số tiền đã nhận(cần thêm 1 trường thông tin mới để lưu cái này), phí ship(cần thêm 1 trường thông tin mới để lưu cái này)
    -> ấn nút đã giao hàng -> trạng thái của xuất kho là đã giao hàng

- khi hiển thị mã hàng thì hiển thị thêm thông tin trạng thái xuất kho này nữa. nó giống như việc hiển thị thông tin trạng thái xếp xe


# sau khi đọc hiểu bạn hãy đưa ra cho tôi 1 bản viết chuẩn chỉnh về ý hiểu của bạn từ ý tưởng lộn xộn của tôi và ghi vào file new_requirment_rephrase.md
