# Kế hoạch Nâng cấp Trải nghiệm Chat AI

Tài liệu này phác thảo một kế hoạch tập trung vào việc nâng cấp sâu khả năng phản hồi, nhận thức ngữ cảnh và tính hữu dụng của AI, biến nó thành một trợ lý chat thông minh và đắc lực hơn trong việc quản lý công việc.

---

## Phase 1: Nền tảng Tương tác & Ngữ cảnh (Core Interaction & Context)

**Mục tiêu:** Giải quyết các vấn đề cốt lõi về giao tiếp, an toàn dữ liệu và khả năng truy cập dữ liệu của AI.

### 1.1. Cải thiện Nhận diện & Phản hồi Ngôn ngữ
*   **Vấn đề:** AI thường xuyên trả lời bằng tiếng Anh dù người dùng nhập tiếng Việt.
*   **Giải pháp:**
    *   Nâng cấp `pattern-recognition.ts` để phân tích ngôn ngữ của **từng tin nhắn** người dùng gửi lên.
    *   Bổ sung chỉ thị mạnh mẽ vào `prompt-templates.ts`: "BẮT BUỘC phải trả lời bằng ngôn ngữ sau đây: {detected_language}".
    *   **File ảnh hưởng:** `pattern-recognition.ts`, `prompt-templates.ts`, `ask-about-tasks.ts`.

### 1.2. Nhận diện Ý định bằng Từ khóa
*   **Vấn đề:** AI đôi khi không hiểu các yêu cầu tạo/sửa task.
*   **Giải pháp:**
    *   Triển khai cơ chế nhận diện từ khóa đặc biệt: `#Task` (tạo mới), `#Edit` (chỉnh sửa), `#Change` (thay đổi).
    *   Khi `ContextManager` phát hiện các từ khóa này, nó sẽ chèn một hướng dẫn đặc biệt vào prompt để hướng AI sử dụng đúng `action`.
    *   **File ảnh hưởng:** `context-manager.ts`, `prompt-templates.ts`.

### 1.3. Mở rộng Dữ liệu & Hành động
*   **Vấn đề:** AI chỉ có thể thao tác với `Tasks`.
*   **Giải pháp:**
    *   Mở rộng ngữ cảnh đầu vào cho AI, cho phép nó truy cập dữ liệu về `Clients`, `Collaborators`, và `Categories`.
    *   Thêm các `action` mới vào `types/actions.ts` và `ask-about-tasks.ts` để AI có thể **tạo mới** và **chỉnh sửa** các mục này.
    *   **File ảnh hưởng:** `ask-about-tasks.ts`, `types/actions.ts`, `prompt-templates.ts`.

### 1.4. Hành động An toàn: Xác nhận & Hoàn tác (Bổ sung)
*   **Vấn đề:** Các thay đổi do AI thực hiện là vĩnh viễn và có thể gây mất dữ liệu nếu AI hiểu sai.
*   **Giải pháp:**
    *   **Xác nhận:** Trong `types/actions.ts`, thêm trường `confirmationRequired: boolean`. Đối với các hành động quan trọng (xóa, sửa đổi lớn), AI sẽ đặt trường này thành `true`. Frontend sẽ hiển thị một hộp thoại xác nhận ("Bạn có chắc muốn xóa task X không?").
    *   **Hoàn tác (Undo):** Triển khai một "bộ đệm hành động" (action buffer) ở phía client. Trước khi thực hiện một hành động từ AI, trạng thái của đối tượng sắp bị thay đổi sẽ được lưu vào bộ đệm. Sau khi hành động được thực hiện, một nút "Hoàn tác" sẽ xuất hiện trong vài giây, cho phép người dùng khôi phục lại trạng thái trước đó.
    *   **File ảnh hưởng:** `types/actions.ts`, `ask-about-tasks.ts` (logic quyết định khi nào cần xác nhận), và logic quản lý state ở client-side.

---

## Phase 2: Phản hồi Đa dạng & Hữu ích (Rich & Actionable Responses)

**Mục tiêu:** Làm cho các phản hồi của AI không chỉ là văn bản mà còn chứa các yếu tố tương tác và sinh động.

### 2.1. Triển khai Trình biên dịch Markdown (Ưu tiên)
*   **Vấn đề:** Giao diện người dùng không thể hiển thị đúng định dạng Markdown.
*   **Giải pháp:**
    *   Cài đặt thư viện `react-markdown` và `remark-gfm`.
    *   Tạo một component `MarkdownRenderer.tsx` để bao bọc các phản hồi văn bản từ AI. Component này sẽ chịu trách nhiệm biên dịch chuỗi Markdown thành HTML để hiển thị chính xác.
    *   **File ảnh hưởng:** `package.json`, component UI hiển thị tin nhắn chat, tạo mới `components/ui/MarkdownRenderer.tsx`.

### 2.2. Định dạng Phản hồi Sinh động
*   **Vấn đề:** Phản hồi của AI là văn bản thô, nhàm chán.
*   **Giải pháp:**
    *   Huấn luyện AI bằng cách thêm chỉ thị vào `prompt-templates.ts`: "Hãy sử dụng định dạng Markdown (in đậm, in nghiêng, danh sách) và các biểu tượng cảm xúc (emoji) phù hợp để làm cho câu trả lời của bạn rõ ràng, sinh động và dễ đọc hơn."
    *   Ví dụ: Thay vì "Task created", AI sẽ trả lời "✅ Đã tạo thành công task **Thiết kế logo**!".
    *   **File ảnh hưởng:** `prompt-templates.ts`.

### 2.3. Phản hồi chứa Thành phần Tương tác
*   **Vấn đề:** Phản hồi của AI chỉ là text đơn thuần.
*   **Giải pháp:**
    *   Mở rộng `AskAboutTasksOutputSchema` để trả về một mảng `interactiveElements` (ví dụ: `{ type: 'openTaskDialog', taskId: '...' }`, `{ type: 'copyableText', content: '...' }`).
    *   Frontend sẽ dựa vào mảng này để render ra các nút bấm hoặc các khối code có nút copy.
    *   **Lưu ý quan trọng:** Khi triển khai `openTaskDialog`, cần **tái sử dụng các component dialog đã có** trong dashboard (ví dụ: `TaskDetailsDialog`, `TaskEditDialog`) để đảm bảo tính nhất quán và tránh viết lại code không cần thiết.
    *   **File ảnh hưởng:** `ask-about-tasks.ts`, component UI hiển thị tin nhắn chat, các component dialog hiện có.

### 2.4. Nâng cao Tạo Bảng/Báo giá & Cho phép Xuất
*   **Vấn đề:** Khả năng tạo bảng/báo giá còn hạn chế và không thể tái sử dụng.
*   **Giải pháp:**
    *   Bổ sung thêm các ví dụ `few-shot-examples.ts` chuyên về tạo bảng Markdown và báo giá.
    *   Thêm một `action` mới: `exportContentToTask`. Khi AI tạo ra bảng/báo giá, nó sẽ đi kèm một nút "Gửi tới Task" để người dùng có thể lưu nội dung này vào một task.
    *   **File ảnh hưởng:** `few-shot-examples.ts`, `ask-about-tasks.ts`, `types/actions.ts`.

---

## Phase 3: Nâng cao Khả năng Hiểu & Hiệu suất (Advanced Understanding & Performance)

**Mục tiêu:** Giải quyết các vấn đề phức tạp hơn về trí nhớ dài hạn và sức mạnh xử lý của AI.

### 3.1. Tối ưu hóa Lịch sử Chat (Hiểu ngữ cảnh dài)
*   **Vấn đề:** AI chỉ hiểu được vài dòng chat gần nhất.
*   **Giải pháp:**
    *   Triển khai phương thức `optimizeHistory` trong `context-manager.ts`. Logic: Tự động tóm tắt các tin nhắn cũ khi lịch sử chat quá dài, giúp tiết kiệm token mà vẫn giữ được ngữ cảnh.
    *   **File ảnh hưởng:** `context-manager.ts`.

### 3.2. Nâng cấp & Tối ưu Lựa chọn Model
*   **Vấn đề:** Các mô hình miễn phí hiện tại có thể chưa đủ mạnh.
*   **Giải pháp:**
    *   Cập nhật `model-selector.ts` để bao gồm các mô hình mạnh mẽ hơn của Gemini (ví dụ: Gemini 1.5 Flash/Pro).
    *   Tinh chỉnh logic `selectModel` để ưu tiên các mô hình cao cấp hơn cho các cuộc hội thoại dài hoặc các yêu cầu phức tạp.
    *   **File ảnh hưởng:** `model-selector.ts`.