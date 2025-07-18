# Kế hoạch Kiểm thử Thủ công cho AI Nâng cao

Tài liệu này cung cấp các kịch bản và câu hỏi mẫu để bạn có thể kiểm thử các tính năng AI mới được triển khai trong ứng dụng Freelance Flow.

---

## Phần 1: Quản lý Tác vụ Cơ bản (Kiểm tra Phase 1)

**Mục tiêu:** Đảm bảo AI có thể xử lý các yêu cầu tạo, sửa, cập nhật và truy vấn thông tin về công việc một cách chính xác.

### Kịch bản 1.1: Tạo Task Mới (Tiếng Việt)
*   **Ngữ cảnh:** Chưa có task nào tên là "Dựng model 3D cho nhân vật".
*   **Câu hỏi/Lệnh:** `Tạo giúp tôi một công việc mới tên là "Dựng model 3D cho nhân vật" cho khách hàng "Game Studio X", deadline là cuối tháng sau.`
*   **Kết quả mong đợi:**
    *   AI phản hồi xác nhận đã hiểu yêu cầu.
    *   AI có thể hỏi thêm về danh mục (2D hay 3D) nếu chưa rõ.
    *   AI đề xuất một hành động `createTask` với `payload` chứa đầy đủ các thông tin: `name`, `clientName`, `deadline`, và có thể cả `quoteItems` được tự động tạo ra.

### Kịch bản 1.2: Cập nhật Trạng thái Task (Tiếng Anh)
*   **Ngữ cảnh:** Có một task đang tồn tại với tên "Design website layout".
*   **Câu hỏi/Lệnh:** `Mark the "Design website layout" task as done.`
*   **Kết quả mong đợi:**
    *   AI phản hồi xác nhận đã cập nhật.
    *   AI đề xuất một hành động `updateTaskStatus` với `payload` chứa `taskId` của task tương ứng và `status: 'done'`.

### Kịch bản 1.3: Chỉnh sửa Task
*   **Ngữ cảnh:** Có một task "Vẽ concept art" với deadline là tuần này.
*   **Câu hỏi/Lệnh:** `Dời deadline của task "Vẽ concept art" sang cuối tháng.`
*   **Kết quả mong đợi:**
    *   AI phản hồi xác nhận thay đổi.
    *   AI đề xuất một hành động `editTask` với `payload` chứa `taskId` và `updates: { deadline: "..." }`.

### Kịch bản 1.4: Truy vấn Thông tin
*   **Câu hỏi/Lệnh:** `Những task nào của khách hàng "Game Studio X" sắp đến hạn?`
*   **Kết quả mong đợi:**
    *   AI trả về một câu trả lời bằng ngôn ngữ tự nhiên, liệt kê các task phù hợp từ dữ liệu ngữ cảnh.
    *   Hành động (`action`) phải là `null`.

---

## Phần 2: Các Luồng Chuyên biệt (Kiểm tra Phase 2)

**Mục tiêu:** Xác minh các luồng AI phức tạp hoạt động chính xác và trả về dữ liệu có cấu trúc.

### Kịch bản 2.1: Phân tích Dự án
*   **Ngữ cảnh:** Có nhiều task đang hoạt động với các deadline và cộng tác viên khác nhau.
*   **Câu hỏi/Lệnh:** `Phân tích tình hình dự án hiện tại của tôi.`
*   **Kết quả mong đợi:**
    *   AI trả về một cấu trúc dữ liệu chứa các mục: `timeline`, `workload`, `risks`, và `suggestions`.
    *   Giao diện người dùng sẽ hiển thị kết quả này dưới dạng một "Thẻ Phân tích" trực quan.

### Kịch bản 2.2: Tạo Báo giá
*   **Ngữ cảnh:** Bạn muốn tạo báo giá cho một dự án mới.
*   **Câu hỏi/Lệnh:** `Tạo giúp tôi một báo giá cho dự án thiết kế app di động, bao gồm các hạng mục: thiết kế UI/UX, phát triển frontend, và tích hợp API.`
*   **Kết quả mong đợi:**
    *   AI kích hoạt luồng `generateQuote`.
    *   AI trả về một đối tượng báo giá có cấu trúc, bao gồm `quoteTitle`, `items` (với giá được tính toán), `totalPrice`, v.v.

### Kịch bản 2.3: Phân tích Thời gian
*   **Ngữ cảnh:** Bạn đã ghi lại thời gian làm việc (time logs) cho một vài task.
*   **Câu hỏi/Lệnh:** `Phân tích việc quản lý thời gian của tôi trong tuần này.`
*   **Kết quả mong đợi:**
    *   AI kích hoạt luồng `timeManagement`.
    *   AI trả về một cấu trúc dữ liệu chứa `timeAnalysis` (so sánh thời gian ước tính và thực tế), `scheduleSuggestions`, và `deadlineWarnings`.

---

## Phần 3: Tương tác Nâng cao (Kiểm tra Phase 3 & 5)

**Mục tiêu:** Kiểm tra các tính năng giúp tự động hóa và cải thiện trải nghiệm người dùng.

### Kịch bản 3.1: Luồng công việc Thiết lập Dự án
*   **Câu hỏi/Lệnh:** `Bắt đầu một dự án mới. Tên là "Thiết kế Website Thương mại điện tử", khách hàng là "Shop Online ABC", loại dự án là "website design".`
*   **Kết quả mong đợi:**
    *   AI nhận diện đây là một yêu cầu thiết lập dự án phức tạp.
    *   AI kích hoạt luồng `ProjectSetupWorkflow`.
    *   AI có thể trả về các thông báo cập nhật sau mỗi bước (ví dụ: "Đã tạo cấu trúc dự án...", "Đã tạo các task ban đầu...").

---

## Phần 4: Kiểm tra Trí tuệ & Học hỏi (Kiểm tra Phase 4)

**Mục tiêu:** Quan sát (một cách tương đối) khả năng thích ứng của AI.

### Kịch bản 4.1: Lựa chọn Mô hình
*   **Thử câu hỏi đơn giản:** `Hôm nay là thứ mấy?` (Dự kiến dùng mô hình nhỏ, nhanh).
*   **Thử câu hỏi phức tạp:** `Dựa trên các task đã hoàn thành trong 3 tháng qua, hãy phân tích xem khách hàng nào mang lại nhiều doanh thu nhất và đề xuất cách để tăng cường hợp tác với họ.` (Dự kiến dùng mô hình lớn, mạnh mẽ hơn).
*   **Kết quả mong đợi:** Thời gian phản hồi cho câu hỏi đơn giản nên nhanh hơn đáng kể so với câu hỏi phức tạp.

### Kịch bản 4.2: Học tập Thích ứng
*   **Chuỗi tương tác:**
    1.  Thực hiện nhiều yêu cầu ngắn gọn.
    2.  Sau đó, hỏi một câu hỏi mở.
*   **Kết quả mong đợi (khó đo lường ngay):** Theo thời gian, nếu bạn thường xuyên tương tác với các câu trả lời ngắn, AI sẽ có xu hướng đưa ra các phản hồi ngắn gọn hơn. Ngược lại, nếu bạn thường yêu cầu chi tiết, AI sẽ học cách cung cấp các câu trả lời dài và chi tiết hơn.

---

## Phần 5: Kiểm tra Khả năng Mới (Nâng cấp AI)

**Mục tiêu:** Kiểm tra các tính năng mới được triển khai trong Phase 1, 2, 3.

### Kịch bản 5.1: Nhận diện & Phản hồi Ngôn ngữ (Phase 1.1)
*   **Ngữ cảnh:** Dữ liệu mẫu từ `freelance-flow-backup-2025-07-05.json`.
*   **Câu hỏi/Lệnh:** `Tạo một task mới tên là "Thiết kế giao diện người dùng cho ứng dụng di động" cho khách hàng "Stark Industries", deadline là 2025-08-01. #Task`
*   **Kết quả mong đợi:**
    *   AI phản hồi bằng tiếng Việt.
    *   AI đề xuất hành động `createTask` với các thông tin chính xác.

*   **Câu hỏi/Lệnh:** `Create a new task named "Develop backend API for e-commerce" for client "Wayne Enterprises", deadline 2025-08-15. #Task`
*   **Kết quả mong đợi:**
    *   AI phản hồi bằng tiếng Anh.
    *   AI đề xuất hành động `createTask` với các thông tin chính xác.

### Kịch bản 5.2: Nhận diện Ý định bằng Từ khóa (Phase 1.2)
*   **Ngữ cảnh:** Dữ liệu mẫu từ `freelance-flow-backup-2025-07-05.json`. Task `task-1` ("Iron Man Suit HUD Animation") đang `inprogress`.
*   **Câu hỏi/Lệnh:** `Tôi muốn #Edit task "Iron Man Suit HUD Animation", thay đổi mô tả thành "Animate the Heads-Up Display for the new Mark V suit, focusing on holographic effects."`
*   **Kết quả mong đợi:**
    *   AI phản hồi xác nhận chỉnh sửa.
    *   AI đề xuất hành động `editTask` với `taskId` và `updates` chứa mô tả mới.

### Kịch bản 5.3: Mở rộng Dữ liệu & Hành động (Phase 1.3)
*   **Ngữ cảnh:** Dữ liệu mẫu từ `freelance-flow-backup-2025-07-05.json`.
*   **Câu hỏi/Lệnh:** `Tạo một khách hàng mới: "Cyberdyne Systems", email là "contact@cyberdyne.com".`
*   **Kết quả mong đợi:**
    *   AI phản hồi xác nhận tạo khách hàng.
    *   AI đề xuất hành động `createClient` với `payload` chứa `name` và `email`.

*   **Câu hỏi/Lệnh:** `Chỉnh sửa thông tin của cộng tác viên "Peter Parker", thay đổi chuyên môn thành "Web Developer".`
*   **Kết quả mong đợi:**
    *   AI phản hồi xác nhận chỉnh sửa.
    *   AI đề xuất hành động `editCollaborator` với `collaboratorId` và `updates` chứa chuyên môn mới.

*   **Câu hỏi/Lệnh:** `Xóa danh mục "3D".`
*   **Kết quả mong đợi:**
    *   AI phản hồi xác nhận xóa.
    *   AI đề xuất hành động `deleteCategory` với `categoryId` và `confirmationRequired: true`.

### Kịch bản 5.4: Hành động An toàn: Xác nhận (Phase 1.4)
*   **Ngữ cảnh:** Dữ liệu mẫu từ `freelance-flow-backup-2025-07-05.json`.
*   **Câu hỏi/Lệnh:** `Xóa task "Batmobile 3D Model".`
*   **Kết quả mong đợi:**
    *   AI phản hồi xác nhận xóa.
    *   AI đề xuất hành động `deleteTask` với `taskId` và `confirmationRequired: true`.

### Kịch bản 5.5: Trình biên dịch Markdown & Định dạng Phản hồi Sinh động (Phase 2.1 & 2.2)
*   **Ngữ cảnh:** Dữ liệu mẫu từ `freelance-flow-backup-2025-07-05.json`.
*   **Câu hỏi/Lệnh:** `Liệt kê tất cả các task đang "inprogress" của tôi dưới dạng bảng, và làm cho câu trả lời sinh động hơn.`
*   **Kết quả mong đợi:**
    *   AI trả về một bảng các task đang `inprogress` được định dạng Markdown.
    *   Phản hồi của AI sử dụng in đậm, in nghiêng, danh sách (nếu có) và emoji phù hợp.

### Kịch bản 5.6: Phản hồi chứa Thành phần Tương tác & Nâng cao Tạo Bảng/Báo giá (Phase 2.3 & 2.4)
*   **Ngữ cảnh:** Dữ liệu mẫu từ `freelance-flow-backup-2025-07-05.json`.
*   **Câu hỏi/Lệnh:** `Tạo báo giá cho việc thiết kế 2 logo và 3 banner quảng cáo.`
*   **Kết quả mong đợi:**
    *   AI trả về một báo giá được định dạng Markdown.
    *   Phản hồi chứa các `interactiveElements`: một nút "Sao chép Báo giá" và một nút "Gửi tới Task" (hoặc tương tự).
    *   Khi nhấp vào "Gửi tới Task", nội dung báo giá sẽ được điền vào mô tả của một task mới.

### Kịch bản 5.7: Tối ưu hóa Lịch sử Chat (Phase 3.1)
*   **Chuỗi tương tác:**
    1.  `Chào AI, bạn khỏe không?` (ngắn)
    2.  `Kể cho tôi nghe về dự án "Iron Man Suit HUD Animation".` (ngắn)
    3.  `Liệt kê tất cả các task đã hoàn thành của tôi.` (ngắn)
    4.  `Bây giờ, hãy tóm tắt lại toàn bộ cuộc trò chuyện của chúng ta từ đầu.`
*   **Kết quả mong đợi:**
    *   AI tóm tắt được nội dung của các tin nhắn trước đó, cho thấy khả năng giữ ngữ cảnh dài.
    *   (Kiểm tra log hoặc debug để xác nhận `optimizeHistory` đã được gọi và hoạt động).

### Kịch bản 5.8: Nâng cấp & Tối ưu Lựa chọn Model (Phase 3.2)
*   **Ngữ cảnh:** Dữ liệu mẫu từ `freelance-flow-backup-2025-07-05.json`.
*   **Thử câu hỏi đơn giản:** `Hôm nay là ngày bao nhiêu?`
*   **Kết quả mong đợi:** Phản hồi nhanh chóng, cho thấy việc sử dụng mô hình nhỏ hơn.
*   **Thử câu hỏi phức tạp:** `Dựa trên tất cả các task và báo giá, hãy phân tích xu hướng doanh thu của tôi trong quý vừa qua và đề xuất 3 chiến lược để tăng doanh thu trong quý tới.`
*   **Kết quả mong đợi:** Phản hồi có thể mất nhiều thời gian hơn, cho thấy việc sử dụng mô hình mạnh mẽ hơn (ví dụ: `gemini-1.5-pro` hoặc `gpt-4o`).
    *   (Kiểm tra log hoặc debug để xác nhận mô hình được chọn là mô hình cao cấp hơn).