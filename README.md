# Freelance Flow - Trợ lý quản lý công việc thế hệ mới

[![Trạng thái Deploy](https://img.shields.io/website?url=https%3A%2F%2Fapp.manhhuynh.work&label=app.manhhuynh.work)](https://app.manhhuynh.work)
[![Ngôn ngữ](https://img.shields.io/badge/Ngôn%20ngữ-Tiếng%20Việt%20%26%20English-blue)]()

**Freelance Flow** là một ứng dụng quản lý công việc mạnh mẽ, được thiết kế đặc biệt cho các freelancer và đội nhóm nhỏ. Với triết lý đặt người dùng làm trung tâm, ứng dụng giúp bạn theo dõi dự án, khách hàng, báo giá… và vẫn tôn trọng tuyệt đối quyền sở hữu dữ liệu của bạn (local‑first).

**Live Demo:** [**app.manhhuynh.work**](https://app.manhhuynh.work)

---

## Triết lý cốt lõi

*   ✅ **Quyền sở hữu dữ liệu người dùng:** Tất cả dữ liệu của bạn được lưu trữ hoàn toàn cục bộ trên trình duyệt. Không có dữ liệu nào được gửi hoặc lưu trữ trên máy chủ của chúng tôi.
*   ✅ **Thiết kế tối giản & tập trung:** Giao diện sạch sẽ, trực quan, loại bỏ những yếu tố không cần thiết để bạn tập trung vào điều quan trọng nhất: công việc.
*   ✅ **Tính năng thiết yếu:** Chúng tôi chỉ xây dựng những tính năng thực sự giải quyết các vấn đề cốt lõi của freelancer, tránh sự phức tạp không cần thiết.
*   ✅ **Hỗ trợ đa ngôn ngữ:** Toàn bộ ứng dụng hỗ trợ đầy đủ Tiếng Việt và Tiếng Anh.

### Yêu cầu hệ thống

- Node.js 18.17+ (khuyến nghị 18 LTS hoặc 20 LTS)
- Trình duyệt hiện đại hỗ trợ IndexedDB (PouchDB)

## Các tính năng nổi bật

### Các chế độ xem công việc linh hoạt

Quản lý công việc của bạn theo cách phù hợp nhất với quy trình làm việc của bạn.

| View Mode | Mô tả |
| :--- | :--- |
| 📅 **Lịch (Calendar View)** | Lên kế hoạch và theo dõi công việc cũng như các sự kiện quan trọng theo tuần hoặc tháng. Dễ dàng xem các deadline sắp tới và sắp xếp lịch trình. |
| 📋 **Kanban** | Tổ chức công việc một cách trực quan bằng cách kéo-thả các thẻ công việc qua các cột trạng thái (ví dụ: To Do, In Progress, Done). Tùy chỉnh cột và quy trình làm việc của riêng bạn. |
| 🎯 **Ma trận Eisenhower** | Phân loại và ưu tiên công việc dựa trên mức độ quan trọng và khẩn cấp. Giúp bạn tập trung vào những việc cần làm ngay, lên kế hoạch cho những việc quan trọng, giao phó những việc khẩn cấp và loại bỏ những việc không cần thiết. |
| 📊 **Biểu đồ Gantt** | Lập kế hoạch và theo dõi tiến độ dự án theo dòng thời gian. Dễ dàng kéo-thả để điều chỉnh ngày bắt đầu, ngày kết thúc và xem mối quan hệ phụ thuộc giữa các công việc. |

### Quản lý toàn diện

*   **Quản lý Khách hàng & Cộng tác viên:** Lưu trữ thông tin liên hệ, lịch sử dự án và các ghi chú quan trọng.
*   **Tạo & Quản lý Báo giá:** Tạo các báo giá chuyên nghiệp từ các mẫu có sẵn, dán dữ liệu từ bảng tính và liên kết chúng trực tiếp với các công việc.
*   **Widgets & Tiện ích:** Sử dụng các widget hữu ích như **Ghi chú nhanh (Sticky Notes)**, **Máy tính** và **Đồng hồ Pomodoro** ngay trên dashboard để tăng năng suất.
*   **Backup & Restore an toàn:**
    *   **Local Backup:** Dễ dàng sao lưu toàn bộ dữ liệu ứng dụng ra file JSON và khôi phục lại bất cứ lúc nào.
    *   **Cloud Backup (Mới):** Hỗ trợ sao lưu lên đám mây (Vercel Blob) với mã hóa an toàn (client-side encryption) để bảo vệ dữ liệu riêng tư của bạn.
*   **Tìm kiếm ngữ nghĩa (Semantic Search):** Lập chỉ mục (index) công việc và tìm kiếm theo ngữ nghĩa khi bạn cung cấp API key AI. Vectors được lưu cục bộ để dùng offline.

### Trợ lý AI thông minh (Gemini)

Tích hợp Google Gemini (ưu tiên) và hỗ trợ OpenAI (tùy chọn) với cơ chế **Model Fallback** thông minh để đảm bảo độ ổn định. Trợ lý AI có thể:

*   **Tạo và cập nhật công việc:** Chỉ cần ra lệnh bằng ngôn ngữ tự nhiên (ví dụ: `Tạo task "Thiết kế logo" cho khách hàng A, deadline cuối tuần`).
*   **Tạo báo giá tự động:** `Tạo báo giá gồm 5 banner và 1 landing page.`
*   **Phân tích dự án:** `Phân tích tình hình công việc của tôi.`
*   **Trả lời câu hỏi dựa trên ngữ cảnh:** `Công việc nào của khách hàng B sắp đến hạn?`

Ghi chú kỹ thuật AI:
- Ứng dụng không dùng biến môi trường server cho khóa API. Bạn phải dán khóa trong phần Settings của ứng dụng.
- API embeddings chạy tại `/api/embeddings` và yêu cầu gửi `apiKey` trong body (provider: `google` hoặc `openai`).
- Vector DB mặc định là In‑Memory + lưu vectors vào PouchDB để dùng offline.

## Hướng dẫn sử dụng nhanh

### Tương tác với AI

Mở khung chat và thử các lệnh sau:
- `Tạo một công việc mới tên là "Vẽ nhân vật 3D" cho khách hàng "Game Studio X", deadline là cuối tháng sau.`
- `Đánh dấu task "Thiết kế website" là hoàn thành.`
- `Liệt kê các công việc của Stark Industries.`
- `#Task Tôi cần thiết kế lại giao diện cho app di động, khách hàng Wayne Enterprises.`

### Cài đặt API cho AI (Tùy chọn)

Để sử dụng AI, bạn cần cung cấp API key của riêng mình.
1. Truy cập [Google AI Studio](https://ai.google.dev/) để lấy `GOOGLE_GENAI_API_KEY`.
2. Truy cập [OpenAI Platform](https://platform.openai.com/api-keys) để lấy `OPENAI_API_KEY`.
3. Trong ứng dụng, vào phần **Settings** -> **AI**, và dán các key của bạn vào.

Sau khi dán khóa:
- Bạn có thể chat với AI, gợi ý báo giá, và bật tính năng tìm kiếm ngữ nghĩa.
- Việc lập chỉ mục và truy vấn ngữ nghĩa sẽ gọi `/api/embeddings` với khóa bạn đã cung cấp.

## Công nghệ sử dụng

*   **Framework:** Next.js, React, TypeScript
*   **Styling:** TailwindCSS, shadcn/ui
*   **AI:** Google Gemini (ưu tiên), OpenAI (tùy chọn)
*   **Embeddings API:** `/api/embeddings` (yêu cầu `apiKey` trong request body; không dùng ENV server)
*   **Vector DB:** In‑Memory + PouchDB persistence (có thể thay thế bằng adapter sản xuất)
*   **Kéo-thả:** dnd-kit
*   **Kiến trúc:** Progressive Web App (PWA)

## Cài đặt & Chạy ứng dụng

1.  **Cài đặt dependencies:**
    ```bash
    npm install
    ```
2.  **Chạy server phát triển:**
    ```bash
    npm run dev
    ```
    Ứng dụng sẽ chạy tại [http://localhost:3000](http://localhost:3000).

3.  **(Tùy chọn) Chạy dev server kiểu Vercel:**
    ```bash
    npx vercel dev
    ```
    Lệnh này chạy Next.js cùng môi trường serverless tương tự Vercel (hữu ích khi thử nghiệm API AI).

4.  **Kiểm tra & Test (khuyến nghị):**
    ```bash
    npm run typecheck
    npm run test
    ```

## Đóng góp
Mọi ý kiến đóng góp về chức năng mới, cải tiến UI/UX, hoặc báo lỗi đều được hoan nghênh. Vui lòng tạo một issue hoặc gửi pull request.

---

### Bảo mật & Quyền riêng tư

- Ứng dụng là local‑first. Dữ liệu của bạn ở trên trình duyệt và có thể sao lưu/khôi phục bằng JSON.
- Chỉ khi bạn cung cấp API key trong Settings và sử dụng tính năng AI, dữ liệu liên quan mới được gửi đến nhà cung cấp AI tương ứng.

> © 2025 Freelance-Flow. Designed and developed by Manh Huynh.
