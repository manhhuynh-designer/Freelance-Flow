# Kế hoạch Nâng cấp AI - Freelance Flow (Phiên bản Genkit)

## Tổng Quan Kế Hoạch

Kế hoạch này phác thảo các bước nâng cấp toàn diện khả năng phản hồi, hỗ trợ và thao tác của AI chat trong ứng dụng Freelance Flow. Mục tiêu chính là cung cấp một trợ lý AI thông minh, hiệu quả và bảo mật. Chúng ta sẽ **tận dụng framework Genkit làm nền tảng**, kết hợp với kiến trúc module hóa để tối ưu hóa hiệu suất, khả năng mở rộng và khả năng giám sát (observability). Kế hoạch tuân thủ chặt chẽ các nguyên tắc thiết kế cốt lõi của ứng dụng: tối giản, tập trung vào tính năng cốt lõi, bảo mật dữ liệu người dùng và hỗ trợ đa ngôn ngữ.

## 1. Mục Tiêu Nâng Cấp

### 1.1 Mục Tiêu Chính (KPIs)
*   **Cải thiện độ chính xác:** AI hiểu rõ hơn ngữ cảnh dự án freelance và phản hồi chính xác các yêu cầu của người dùng, đạt độ chính xác >85% trong việc hiểu ngữ cảnh và cung cấp phản hồi phù hợp.
*   **Tăng khả năng thao tác:** AI có thể thực hiện nhiều hành động hơn với tasks, clients, quotes, đạt tỷ lệ thành công hành động >90% khi tương tác với dữ liệu người dùng.
*   **Tối ưu trải nghiệm:** Giảm thời gian phản hồi và tăng tính hữu ích của câu trả lời, mục tiêu thời gian phản hồi trung bình <3 giây và điểm hài lòng người dùng >4.0/5.0.
*   **Bảo mật dữ liệu:** Toàn bộ dữ liệu xử lý cục bộ, không lưu trữ trên server, đảm bảo quyền sở hữu dữ liệu của người dùng.

### 1.2 Nguyên Tắc Tuân Thủ
Kế hoạch này tuân thủ nghiêm ngặt các nguyên tắc thiết kế được định nghĩa trong tài liệu "App Design Principles & Philosophy":

*   ✅ **User Data Ownership:** Tất cả dữ liệu AI training/context lưu trữ cục bộ trên thiết bị người dùng. Không gửi hoặc lưu trữ bất kỳ dữ liệu nhạy cảm nào lên server. (Tham khảo Nguyên tắc 1)
*   ✅ **Minimalism:** Giao diện người dùng (UI) đơn giản, không thêm phức tạp không cần thiết. (Tham khảo Nguyên tắc 2)
*   ✅ **Essential Features Only:** Chỉ thêm tính năng AI thực sự hữu ích và giải quyết các vấn đề cốt lõi của người dùng. (Tham khảo Nguyên tắc 2)
*   ✅ **Internationalization:** Hỗ trợ đầy đủ cả tiếng Anh và tiếng Việt cho tất cả các tính năng và phản hồi của AI. (Tham khảo Nguyên tắc 3)
*   ✅ **Card-based UI:** Duy trì thiết kế dựa trên thẻ (card) cho các tính năng mới và hiển thị phản hồi của AI. (Tham khảo Nguyên tắc 2.1)
*   ✅ **Consistent UI/UX:** Đảm bảo tính nhất quán về spacing, padding, rounded corners, shadows, và button design. (Tham khảo Nguyên tắc 2.1)
*   ✅ **Feedback & Loading:** Luôn cung cấp phản hồi rõ ràng cho người dùng về trạng thái của AI (đang xử lý, hoàn thành, lỗi). (Tham khảo Nguyên tắc 2.1)

## 2. Phân Tích Hiện Trạng

### 2.1 Điểm Mạnh Hiện Tại
*   Chức năng chat cơ bản với AI đã hoạt động **trên nền tảng Genkit**.
*   Có khả năng tích hợp với dữ liệu ngữ cảnh (tasks, clients, collaborators, quotes) cục bộ.
*   Hỗ trợ nhiều nhà cung cấp mô hình AI (OpenAI, Google) thông qua Genkit.
*   Lưu trữ lịch sử hội thoại cục bộ.

### 2.2 Điểm Cần Cải Thiện
*   Chưa có few-shot learning examples để định hướng phản hồi của AI.
*   Prompt engineering chưa được module hóa, khó quản lý và mở rộng.
*   Thiếu nhận thức ngữ cảnh nâng cao (advanced context awareness) được quản lý một cách có hệ thống.
*   Chưa có các luồng AI chuyên biệt (specialized flows) cho từng trường hợp sử dụng.
*   Quản lý lịch sử hội thoại chưa hiệu quả với giới hạn token.
*   Thiếu cơ chế phản hồi từ người dùng để cải thiện AI.

## 3. Kế Hoạch Chi Tiết

### Phase 1: Foundation Enhancement (1-2 tuần)

#### 3.1 Prompt Engineering & Context Optimization
**Mục tiêu:** Cải thiện độ chính xác và tính nhất quán của phản hồi AI bằng cách module hóa logic prompt và tích hợp vào Genkit.

**File cần tạo/sửa:**
*   `src/ai/context/prompt-templates.ts` - **(Mới)** Quản lý tập trung các prompt.
*   `src/ai/context/few-shot-examples.ts` - **(Mới)** Các ví dụ đào tạo cho AI.
*   `src/ai/utils/context-manager.ts` - **(Mới)** Module xây dựng prompt động.
*   `src/ai/flows/ask-about-tasks.ts` - **(Tái cấu trúc)** Tích hợp các module mới vào Genkit flow.

**Chi tiết Implementation (Prompt cho AI Agent):**

**Tạo Prompt Templates System:**
*   **Nhiệm vụ:** Tạo file `src/ai/context/prompt-templates.ts` để quản lý tập trung các system prompts và context prompts.
*   **Yêu cầu:**
    *   Định nghĩa `systemPrompts` cho `freelanceAssistant` bằng cả tiếng Anh (en) và tiếng Việt (vi).
    *   Định nghĩa `contextPrompts` cho `taskManagement` và `clientManagement` bằng cả hai ngôn ngữ.
    *   Sử dụng các biến động như `{userId}`, `{tasks}`, `{clients}` để inject dữ liệu.

**Few-Shot Learning Examples:**
*   **Nhiệm vụ:** Tạo file `src/ai/context/few-shot-examples.ts` để định nghĩa các ví dụ few-shot learning.
*   **Yêu cầu:**
    *   Định nghĩa ít nhất hai loại ví dụ: `taskCreation` và `statusUpdates`.
    *   Mỗi loại phải có ít nhất hai ví dụ, bao gồm `user` input, `assistant` response, và một `action` object.

#### 3.2 Smart Context Management
**Mục tiêu:** Tối ưu hóa việc sử dụng token và cải thiện độ chính xác của ngữ cảnh.

**Chi tiết Implementation (Prompt cho AI Agent):**

*   **Nhiệm vụ:** Tạo file `src/ai/utils/context-manager.ts` để triển khai logic quản lý ngữ cảnh thông minh.
*   **Yêu cầu:**
    *   Triển khai phương thức `optimizeHistory(messages: Message[], maxTokens: number): Message[]`.
    *   Triển khai phương thức `buildContextualPrompt(userInput: string, data: ProjectData, userPreferences: UserPreferences): string`. Logic này sẽ sử dụng các template từ `prompt-templates.ts` để xây dựng prompt cuối cùng.

#### 3.3 Tái cấu trúc Genkit Flow
**Mục tiêu:** Tích hợp các module mới vào luồng Genkit hiện có để làm cho nó gọn gàng và dễ bảo trì hơn.

*   **Nhiệm vụ:** Cập nhật file `src/ai/flows/ask-about-tasks.ts`.
*   **Yêu cầu:**
    *   **Giữ nguyên** cấu trúc `ai.defineFlow` và các schema Zod.
    *   **Loại bỏ** khối system prompt lớn, nguyên khối.
    *   **Thay thế** nó bằng một lệnh gọi đến `ContextManager` để tự động xây dựng prompt dựa trên ngữ cảnh.
    *   Luồng Genkit sẽ nhận `systemPrompt` đã được xử lý và truyền nó vào hàm `localAi.generate()`.

---
*(Các Phase 2, 3, 4, 5 sẽ được xây dựng trên nền tảng Genkit đã được củng cố này, với mỗi tính năng mới là một Genkit flow riêng biệt nếu cần thiết)*
---

## 4. Technical Implementation

### 4.1 File Structure Plan
Cấu trúc thư mục sẽ được tổ chức rõ ràng để dễ dàng quản lý và mở rộng, với Genkit làm trung tâm:
```
src/ai/
├── context/
│   ├── prompt-templates.ts      # Quản lý prompt tập trung
│   ├── few-shot-examples.ts     # Các ví dụ đào tạo cho AI
│   └── context-manager.ts       # Xử lý ngữ cảnh thông minh
├── flows/
│   ├── ask-about-tasks.ts       # Luồng chính, được tái cấu trúc
│   ├── analyze-project.ts       # (Phase 2) Luồng phân tích dự án mới
│   └── ...                      # Các luồng khác
├── learning/
│   └── pattern-recognition.ts   # (Phase 4) Hệ thống học tập cục bộ
├── utils/
│   ├── model-selector.ts        # (Phase 4) Lựa chọn mô hình thông minh
│   └── ...
└── genkit.ts                    # File cấu hình Genkit trung tâm
```

### 4.2 Data Storage Strategy (Tuân thủ User Data Ownership)
Tất cả dữ liệu liên quan đến AI sẽ được lưu trữ cục bộ trên thiết bị của người dùng, sử dụng `localStorage` hoặc `IndexedDB`.

### 4.3 Performance Optimization
*   **Prompt caching:** Lưu trữ các prompt đã được tạo và các phản hồi phổ biến.
*   **Response streaming:** Hiển thị phản hồi của AI từng phần (Genkit hỗ trợ tính năng này).
*   **Background context preparation:** Chuẩn bị dữ liệu ngữ cảnh ở chế độ nền.

### 4.4 Kiến trúc Triển khai (Genkit, Node.js & Vercel)
Ứng dụng sẽ **tiếp tục được xây dựng trên nền tảng Genkit**, triển khai trên Vercel, tận dụng mô hình Serverless Functions để tối ưu hóa hiệu suất, khả năng mở rộng và quản lý chi phí.

**Vai trò của Genkit & Vercel:**
*   **Frontend Serving:** Vercel phục vụ ứng dụng frontend React/TypeScript.
*   **AI Flow Execution:** Các luồng AI được định nghĩa bằng Genkit (`ai.defineFlow`) sẽ được triển khai dưới dạng Vercel Serverless Functions. Genkit sẽ quản lý:
    *   **Proxy API an toàn:** Các khóa API do người dùng cung cấp sẽ được chuyển tiếp an toàn đến các nhà cung cấp AI (OpenAI, Google) thông qua backend của Genkit, không bao giờ lộ ra ở phía client.
    *   **Quản lý Rate Limit & Fallback:** Genkit giúp quản lý các yêu cầu đến API AI và có thể hỗ trợ cơ chế fallback giữa các mô hình.
    *   **Giám sát & Tracing:** Tận dụng Genkit UI để theo dõi, gỡ lỗi và phân tích hiệu suất của từng luồng AI, một lợi thế lớn so với việc xây dựng hệ thống giám sát tùy chỉnh.
    *   **Lựa chọn mô hình:** Logic `Multi-Model Intelligence` (Mục 3.8) sẽ được tích hợp vào các Genkit flow, cho phép lựa chọn mô hình phù hợp nhất cho từng yêu cầu.
*   **Không có Database Backend:** Phù hợp với nguyên tắc **User Data Ownership**, ứng dụng sẽ không lưu trữ dữ liệu người dùng trên bất kỳ database backend nào.

**Tránh Over-Engineering:**
Bằng cách kết hợp kiến trúc module hóa của chúng ta với sức mạnh của framework Genkit, chúng ta đạt được sự cân bằng hoàn hảo. Các module tùy chỉnh (`ContextManager`, `PatternRecognition`) giúp logic nghiệp vụ của chúng ta linh hoạt và dễ bảo trì, trong khi Genkit xử lý các tác vụ hạ tầng phức tạp (thực thi flow, giám sát, kết nối API). Điều này giúp chúng ta tập trung vào việc xây dựng các tính năng AI có giá trị, tuân thủ nguyên tắc **Minimalism** và **Essential Features Only**.

## 5. Testing & Quality Assurance
*(Không thay đổi)*

## 6. Implementation Timeline (13 tuần)

**Tuần 1-2: Phase 1 - Foundation Enhancement (Genkit-based)**
*   [ ] Tạo `prompt-templates.ts` và `few-shot-examples.ts`.
*   [ ] Tạo `context-manager.ts`.
*   [ ] **Tái cấu trúc** `ask-about-tasks.ts` để tích hợp các module mới vào Genkit flow.
*   [ ] Xóa file `dev.ts` không còn cần thiết.

*(Các timeline cho Phase 2-5 không thay đổi, nhưng việc triển khai sẽ được thực hiện trên nền tảng Genkit)*

## 7. Risk Management

### 7.1 Technical Risks
*   **Rủi ro:** Giới hạn tốc độ API (Rate Limits).
    *   **Giảm thiểu:** Genkit có thể hỗ trợ quản lý, kết hợp với caching và batching yêu cầu.
*   **Rủi ro:** Vượt quá giới hạn token.
    *   **Giảm thiểu:** Sử dụng `ContextManager` để tối ưu hóa prompt.
*   **Rủi ro:** Vấn đề khả dụng của mô hình AI.
    *   **Giảm thiểu:** Tận dụng khả năng hỗ trợ đa nhà cung cấp của Genkit để triển khai cơ chế fallback linh hoạt.

### 7.2 User Experience Risks
*(Không thay đổi)*

## 8. Success Measurement
*(Không thay đổi)*

## 9. Maintenance & Updates
*(Không thay đổi)*

## 10. Conclusion
Kế hoạch này đảm bảo việc nâng cấp AI chat trong Freelance Flow một cách có hệ thống. Bằng cách **xây dựng trên nền tảng Genkit**, chúng ta tận dụng được một framework mạnh mẽ, đồng thời áp dụng kiến trúc module hóa để đảm bảo tính linh hoạt và dễ bảo trì. Kế hoạch này tuân thủ chặt chẽ các nguyên tắc thiết kế của ứng dụng và tập trung vào việc mang lại giá trị thực tế cho người dùng.

**Các Bước Tiếp Theo:**
*   Xem xét và phê duyệt kế hoạch đã cập nhật này.
*   Bắt đầu với **Phase 1 - Foundation Enhancement (Genkit-based)**.
*   Thiết lập môi trường phát triển và kiểm thử cho các Genkit flow.