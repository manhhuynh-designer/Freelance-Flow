Kế hoạch Nâng cấp AI - Freelance Flow (Phiên bản Cải tiến)
Tổng Quan Kế Hoạch
Kế hoạch này phác thảo các bước nâng cấp toàn diện khả năng phản hồi, hỗ trợ và thao tác của AI chat trong ứng dụng Freelance Flow. Mục tiêu chính là cung cấp một trợ lý AI thông minh, hiệu quả và bảo mật, tận dụng kiến trúc Node.js và triển khai trên Vercel để tối ưu hóa hiệu suất và khả năng mở rộng. Kế hoạch tuân thủ chặt chẽ các nguyên tắc thiết kế cốt lõi của ứng dụng: tối giản, tập trung vào tính năng cốt lõi, bảo mật dữ liệu người dùng và hỗ trợ đa ngôn ngữ.

1. Mục Tiêu Nâng Cấp
1.1 Mục Tiêu Chính (KPIs)
Cải thiện độ chính xác: AI hiểu rõ hơn ngữ cảnh dự án freelance và phản hồi chính xác các yêu cầu của người dùng, đạt độ chính xác >85% trong việc hiểu ngữ cảnh và cung cấp phản hồi phù hợp.

Tăng khả năng thao tác: AI có thể thực hiện nhiều hành động hơn với tasks, clients, quotes, đạt tỷ lệ thành công hành động >90% khi tương tác với dữ liệu người dùng.

Tối ưu trải nghiệm: Giảm thời gian phản hồi và tăng tính hữu ích của câu trả lời, mục tiêu thời gian phản hồi trung bình <3 giây và điểm hài lòng người dùng >4.0/5.0.

Bảo mật dữ liệu: Toàn bộ dữ liệu xử lý cục bộ, không lưu trữ trên server, đảm bảo quyền sở hữu dữ liệu của người dùng.

1.2 Nguyên Tắc Tuân Thủ
Kế hoạch này tuân thủ nghiêm ngặt các nguyên tắc thiết kế được định nghĩa trong tài liệu "App Design Principles & Philosophy":

✅ User Data Ownership: Tất cả dữ liệu AI training/context lưu trữ cục bộ trên thiết bị người dùng. Không gửi hoặc lưu trữ bất kỳ dữ liệu nhạy cảm nào lên server. (Tham khảo Nguyên tắc 1)

✅ Minimalism: Giao diện người dùng (UI) đơn giản, không thêm phức tạp không cần thiết. (Tham khảo Nguyên tắc 2)

✅ Essential Features Only: Chỉ thêm tính năng AI thực sự hữu ích và giải quyết các vấn đề cốt lõi của người dùng. (Tham khảo Nguyên tắc 2)

✅ Internationalization: Hỗ trợ đầy đủ cả tiếng Anh và tiếng Việt cho tất cả các tính năng và phản hồi của AI. (Tham khảo Nguyên tắc 3)

✅ Card-based UI: Duy trì thiết kế dựa trên thẻ (card) cho các tính năng mới và hiển thị phản hồi của AI. (Tham khảo Nguyên tắc 2.1)

✅ Consistent UI/UX: Đảm bảo tính nhất quán về spacing, padding, rounded corners, shadows, và button design. (Tham khảo Nguyên tắc 2.1)

✅ Feedback & Loading: Luôn cung cấp phản hồi rõ ràng cho người dùng về trạng thái của AI (đang xử lý, hoàn thành, lỗi). (Tham khảo Nguyên tắc 2.1)

2. Phân Tích Hiện Trạng
2.1 Điểm Mạnh Hiện Tại
Chức năng chat cơ bản với AI đã hoạt động.

Có khả năng tích hợp với dữ liệu ngữ cảnh (tasks, clients, collaborators, quotes) cục bộ.

Hỗ trợ nhiều nhà cung cấp mô hình AI (OpenAI, Google).

Lưu trữ lịch sử hội thoại cục bộ.

2.2 Điểm Cần Cải Thiện
Chưa có few-shot learning examples để định hướng phản hồi của AI.

Prompt engineering chưa tối ưu để đạt hiệu quả cao nhất.

Thiếu nhận thức ngữ cảnh nâng cao (advanced context awareness).

Chưa có các luồng AI chuyên biệt (specialized flows) cho từng trường hợp sử dụng.

Quản lý lịch sử hội thoại chưa hiệu quả với giới hạn token.

Thiếu cơ chế phản hồi từ người dùng để cải thiện AI.

3. Kế Hoạch Chi Tiết
Phase 1: Foundation Enhancement (1-2 tuần)
3.1 Prompt Engineering & Context Optimization
Mục tiêu: Cải thiện độ chính xác và tính nhất quán của phản hồi AI.

File cần tạo/sửa:

src/ai/context/prompt-templates.ts - Quản lý tập trung các prompt.

src/ai/context/few-shot-examples.ts - Các ví dụ đào tạo cho AI.

src/ai/flows/ask-about-tasks.ts - Nâng cấp luồng hiện có.

Chi tiết Implementation (Prompt cho AI Agent):

Tạo Prompt Templates System:

Nhiệm vụ: Tạo file src/ai/context/prompt-templates.ts để quản lý tập trung các system prompts và context prompts cho AI.

Yêu cầu:

Định nghĩa systemPrompts với ít nhất một prompt cho freelanceAssistant bằng cả tiếng Anh (en) và tiếng Việt (vi). Prompt này phải mô tả rõ vai trò của AI là trợ lý quản lý dự án freelance chuyên nghiệp, nhấn mạnh sự ngắn gọn, hữu ích và bảo mật dữ liệu cục bộ.

Định nghĩa contextPrompts với ít nhất các prompt cho taskManagement và clientManagement, cũng bằng cả tiếng Anh (en) và tiếng Việt (vi).

Các contextPrompts phải sử dụng các biến động như {userId}, {tasks}, {clients} để inject dữ liệu ngữ cảnh. Đảm bảo rằng các placeholder này sẽ được thay thế bằng dữ liệu JSON stringified khi được sử dụng.

Đảm bảo cấu trúc file tuân thủ TypeScript export như ví dụ.

// src/ai/context/prompt-templates.ts
export const systemPrompts = {
  freelanceAssistant: {
    en: `You are a professional freelance project management assistant. Your primary goal is to help users efficiently manage their projects, tasks, clients, and quotes. Always be concise, helpful, and prioritize user data privacy by processing all information locally.`,
    vi: `Bạn là trợ lý quản lý dự án freelance chuyên nghiệp. Mục tiêu chính của bạn là giúp người dùng quản lý dự án, công việc, khách hàng và báo giá một cách hiệu quả. Luôn phản hồi ngắn gọn, hữu ích và ưu tiên quyền riêng tư dữ liệu người dùng bằng cách xử lý tất cả thông tin cục bộ.`
  }
};

export const contextPrompts = {
  taskManagement: {
    en: `Current active tasks for user {userId}: {tasks}. Help user manage these efficiently. Focus on actions like creating, updating, completing, or analyzing tasks.`,
    vi: `Các task đang hoạt động của người dùng {userId}: {tasks}. Hãy giúp người dùng quản lý hiệu quả các task này. Tập trung vào các hành động như tạo, cập nhật, hoàn thành hoặc phân tích task.`
  },
  clientManagement: {
    en: `Current clients for user {userId}: {clients}. Assist with client-related queries or actions.`,
    vi: `Các khách hàng hiện tại của người dùng {userId}: {clients}. Hỗ trợ các truy vấn hoặc hành động liên quan đến khách hàng.`
  }
};

Few-Shot Learning Examples:

Nhiệm vụ: Tạo file src/ai/context/few-shot-examples.ts để định nghĩa các ví dụ few-shot learning.

Yêu cầu:

Định nghĩa ít nhất hai loại ví dụ: taskCreation và statusUpdates.

Mỗi loại phải có ít nhất hai ví dụ, bao gồm user input, assistant response, và một action object.

action object phải có type (ví dụ: prepareTaskCreation, updateTaskStatus), fields liên quan, và suggestedValues nếu có thể trích xuất từ user input.

Đảm bảo các ví dụ thể hiện rõ cách AI nên phản hồi và đề xuất hành động.

Sử dụng cả tiếng Anh và tiếng Việt cho các ví dụ.

// src/ai/context/few-shot-examples.ts
export const trainingExamples = {
  taskCreation: [
    {
      user: "Tôi cần tạo một task mới: thiết kế logo cho công ty ABC, deadline cuối tuần này.",
      assistant: "Tuyệt vời! Tôi sẽ giúp bạn tạo task 'Thiết kế logo cho công ty ABC'. Deadline là cuối tuần này, đúng không? Bạn có muốn thêm mô tả nào không?",
      action: { type: "prepareTaskCreation", fields: ["title", "client", "deadline"], suggestedValues: { title: "Thiết kế logo cho công ty ABC", deadline: "cuối tuần này" } }
    },
    {
      user: "Create a task: 'Review website content' for client 'XYZ Corp' due next Monday.",
      assistant: "Got it! Creating task 'Review website content' for XYZ Corp, due next Monday. Is that correct?",
      action: { type: "prepareTaskCreation", fields: ["title", "client", "deadline"], suggestedValues: { title: "Review website content", client: "XYZ Corp", deadline: "next Monday" } }
    }
  ],
  statusUpdates: [
    {
      user: "Đánh dấu dự án website là đã hoàn thành.",
      assistant: "Task đã hoàn thành! Tôi đã cập nhật trạng thái dự án website. Bạn có muốn xem báo cáo tổng kết không?",
      action: { type: "updateTaskStatus", taskId: "dynamic_task_id", status: "completed" }
    },
    {
      user: "Mark 'Mobile App Design' as in progress.",
      assistant: "Understood. 'Mobile App Design' is now in progress. Anything else I can help with?",
      action: { type: "updateTaskStatus", taskId: "dynamic_task_id", status: "in_progress" }
    }
  ]
};

3.2 Smart Context Management
Mục tiêu: Tối ưu hóa việc sử dụng token và cải thiện độ chính xác của ngữ cảnh.

Chi tiết Implementation (Prompt cho AI Agent):

Nhiệm vụ: Tạo hoặc cập nhật file src/ai/utils/context-manager.ts để triển khai logic quản lý ngữ cảnh thông minh.

Yêu cầu:

Triển khai phương thức optimizeHistory(messages: Message[], maxTokens: number): Message[].

Logic: Phương thức này phải ưu tiên giữ lại các tin nhắn hệ thống (role === 'system'), sau đó là các tin nhắn gần đây nhất. Nếu vẫn vượt quá maxTokens, nó sẽ loại bỏ các tin nhắn cũ hơn và ít quan trọng hơn (ví dụ: tin nhắn không chứa hành động hoặc từ khóa quan trọng).

Giả định có một hàm getTokenCount(text: string) để ước tính số token của một chuỗi.

Triển khai phương thức buildContextualPrompt(userInput: string, data: ProjectData, userPreferences: UserPreferences): string.

Logic: Phương thức này phải phân tích userInput để xác định các ngữ cảnh liên quan (ví dụ: nếu userInput chứa "task" hoặc "công việc", hãy thêm contextPrompts.taskManagement).

Nó phải inject dữ liệu từ data (tasks, clients, v.v.) vào các placeholder trong prompt template. Đảm bảo dữ liệu object được JSON.stringify() trước khi inject.

Sử dụng userPreferences.language để chọn prompt template phù hợp.

Đảm bảo các import cần thiết (Message, ProjectData, UserPreferences) từ ../types/index được định nghĩa hoặc giả định.

// src/ai/utils/context-manager.ts
import { Message, ProjectData, UserPreferences } from '../types/index'; // Giả định các types này đã được định nghĩa

export class ContextManager {
  /**
   * Tối ưu hóa lịch sử tin nhắn để phù hợp với giới hạn token, ưu tiên các tin nhắn quan trọng.
   * @param messages Mảng các tin nhắn trong lịch sử hội thoại.
   * @param maxTokens Giới hạn token tối đa cho lịch sử.
   * @returns Mảng tin nhắn đã được tối ưu.
   */
  static optimizeHistory(messages: Message[], maxTokens: number): Message[] {
    // Thuật toán:
    // 1. Giữ lại tất cả system messages.
    // 2. Giữ lại các tin nhắn gần đây nhất cho đến khi đạt giới hạn token.
    // 3. Ưu tiên các tin nhắn chứa "actions" hoặc các từ khóa quan trọng.
    // 4. Nếu vẫn vượt quá, loại bỏ các tin nhắn cũ hơn, ít quan trọng hơn.
    let optimizedMessages: Message[] = [];
    let currentTokens = 0; // Giả định có hàm tính token

    // Bước 1: Giữ lại system messages
    const systemMessages = messages.filter(msg => msg.role === 'system');
    optimizedMessages.push(...systemMessages);
    // Cập nhật currentTokens sau khi thêm system messages

    // Bước 2: Thêm các tin nhắn gần đây nhất
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role !== 'system') { // Đã xử lý system messages
        // Giả định `getTokenCount(msg.text)` để tính số token
        if (currentTokens + getTokenCount(msg.text) <= maxTokens) {
          optimizedMessages.unshift(msg); // Thêm vào đầu để giữ thứ tự thời gian
          currentTokens += getTokenCount(msg.text);
        } else {
          break; // Đã đạt giới hạn token
        }
      }
    }
    return optimizedMessages;
  }

  /**
   * Xây dựng prompt ngữ cảnh dựa trên input của người dùng và dữ liệu dự án.
   * @param userInput Input hiện tại của người dùng.
   * @param data Dữ liệu dự án (tasks, clients, quotes, v.v.).
   * @param userPreferences Sở thích của người dùng để cá nhân hóa prompt.
   * @returns Prompt ngữ cảnh đã được xây dựng.
   */
  static buildContextualPrompt(userInput: string, data: ProjectData, userPreferences: UserPreferences): string {
    let contextualPrompt = '';
    // Phân tích userInput để quyết định ngữ cảnh nào cần thiết
    // Ví dụ: nếu userInput chứa "task", "công việc", thêm context taskManagement
    if (userInput.toLowerCase().includes('task') || userInput.toLowerCase().includes('công việc')) {
      contextualPrompt += contextPrompts.taskManagement[userPreferences.language]
        .replace('{tasks}', JSON.stringify(data.tasks)); // Chuyển đổi object thành string JSON
    }
    if (userInput.toLowerCase().includes('client') || userInput.toLowerCase().includes('khách hàng')) {
      contextualPrompt += contextPrompts.clientManagement[userPreferences.language]
        .replace('{clients}', JSON.stringify(data.clients));
    }
    // Thêm các logic khác cho quotes, collaborators, v.v.
    return contextualPrompt;
  }
}

// Hàm giả định để tính số token (cần triển khai thực tế dựa trên thư viện tokenizer)
function getTokenCount(text: string): number {
  return Math.ceil(text.length / 4); // Ước tính đơn giản: 1 token ~ 4 ký tự
}

Phase 2: Advanced AI Capabilities (2-3 tuần)
3.3 Specialized AI Flows
Mục tiêu: Mở rộng khả năng của AI để xử lý các yêu cầu phức tạp hơn.

Chi tiết Implementation (Prompt cho AI Agent):

Project Analysis Flow (src/ai/flows/analyze-project.ts):

Nhiệm vụ: Tạo file src/ai/flows/analyze-project.ts để triển khai luồng phân tích dự án.

Yêu cầu:

Định nghĩa một hàm hoặc class có phương thức analyze(projectData: ProjectData): Promise<AnalysisResult>.

AnalysisResult nên bao gồm các insights về timeline (ví dụ: estimatedCompletionDate, overdueTasks), workload (totalHours, assignedHoursPerUser), rủi ro tiềm ẩn (ví dụ: bottlenecks, resourceConflicts), và đề xuất tối ưu hóa (ví dụ: suggestedTaskReassignments, deadlineAdjustments).

Logic phân tích phải dựa trên dữ liệu cục bộ trong projectData.

Kết quả phân tích phải được định dạng để dễ dàng hiển thị dưới dạng "Card" trong UI chat.

Quote Generation Flow (src/ai/flows/generate-quote.ts):

Nhiệm vụ: Tạo file src/ai/flows/generate-quote.ts để triển khai luồng tạo báo giá.

Yêu cầu:

Định nghĩa một hàm hoặc class có phương thức generate(tasks: Task[], client: Client, pricingPreferences: PricingPreferences): Promise<QuoteData>.

QuoteData nên bao gồm các trường như quoteTitle, items (danh sách task với giá ước tính), totalPrice, currency, notes.

Logic tính toán giá phải dựa trên pricingPreferences và các thuộc tính của tasks (ví dụ: estimatedHours, complexity).

Báo giá phải được định dạng chuyên nghiệp, sẵn sàng để hiển thị dưới dạng "Quote Card" có thể chỉnh sửa trong UI.

Time Management Flow (src/ai/flows/time-management.ts):

Nhiệm vụ: Tạo file src/ai/flows/time-management.ts để triển khai luồng quản lý thời gian.

Yêu cầu:

Định nghĩa một hàm hoặc class có phương thức manage(tasks: Task[], deadlines: Deadline[], timeLogs: TimeLog[]): Promise<TimeManagementInsights>.

TimeManagementInsights nên bao gồm phân tích thời gian đã dành cho các task, so sánh với thời gian ước tính, đề xuất tối ưu hóa lịch trình (ví dụ: suggestedBreaks, focusBlocks), và cảnh báo quản lý deadline (ví dụ: upcomingOverdueTasks).

Các insights phải được định dạng để hiển thị dưới dạng "Time Insight Cards" và gợi ý các hành động như "Reschedule Task", "Add Reminder".

3.4 Enhanced Actions System
Mục tiêu: Cho phép AI thực hiện các hành động có tác động cao một cách an toàn và có kiểm soát.

Chi tiết Implementation (Prompt cho AI Agent):

Nhiệm vụ: Cập nhật file src/ai/types/actions.ts và triển khai UI cho các hành động AI.

Yêu cầu:

Cập nhật EnhancedAIAction interface:

Đảm bảo interface bao gồm các trường type (với các loại hành động mở rộng như createTask, updateTask, deleteTask, generateQuote, scheduleReminder, analyzeProject, suggestPricing, exportReport, updateClient, createClient), payload (chứa dữ liệu cụ thể cho hành động), confidence (điểm tin cậy từ 0-1), và confirmationRequired (boolean, true nếu hành động cần xác nhận).

Triển khai UI cho AI Actions:

Confirmation cards: Khi confirmationRequired là true hoặc confidence thấp, AI phải hiển thị một "Confirmation Card" trong luồng chat. Card này phải tuân thủ "Card-based UI" và "Rounded Corners", bao gồm mô tả rõ ràng về hành động được đề xuất và hai nút rõ ràng: "Confirm" và "Cancel". Logic xử lý sự kiện click cho các nút này phải được triển khai.

Quick action buttons: Triển khai các nút hành động nhanh trong phản hồi chat của AI. Các nút này phải tuân thủ "Button Design" và "Rounded Corners", có thể là các nút như "Mark as Done", "Edit Task", "Generate Report". Logic xử lý sự kiện click phải được triển khai để gọi các hành động AI tương ứng.

Undo functionality: Đối với các hành động có tác động cao (ví dụ: xóa task), triển khai cơ chế hoàn tác. Điều này có thể bao gồm việc lưu trữ trạng thái trước đó của dữ liệu cục bộ và cung cấp một nút "Undo" trong UI chat sau khi hành động được thực hiện.

// src/ai/types/actions.ts
export interface EnhancedAIAction {
  type: 'createTask' | 'updateTask' | 'deleteTask' | 'generateQuote' | 'scheduleReminder' |
        'analyzeProject' | 'suggestPricing' | 'exportReport' | 'updateClient' | 'createClient';
  payload: any; // Dữ liệu cụ thể cho từng hành động (ví dụ: { taskId: 'abc', status: 'completed' })
  confidence: number; // Điểm tin cậy của AI (0-1). Nếu thấp, cần xác nhận từ người dùng.
  confirmationRequired: boolean; // True nếu hành động yêu cầu xác nhận từ người dùng
}

Phase 3: User Experience Enhancement (1-2 tuần)
3.5 Smart Suggestions & Quick Actions
Mục tiêu: Cải thiện khả năng khám phá và tương tác của người dùng với AI.

Chi tiết Implementation (Prompt cho AI Agent):

Nhiệm vụ: Triển khai component SuggestionChips và logic để tạo ra các gợi ý thông minh.

Yêu cầu:

Triển khai SuggestionChips component: Sử dụng React/TypeScript, component này phải nhận vào một mảng suggestions (mỗi suggestion có text và tùy chọn action) và một hàm onSelect. Component phải hiển thị các gợi ý dưới dạng các "chip" hoặc "card" nhỏ, tuân thủ "Card-based UI", "Minimalism", và "Consistent Spacing & Padding".

Logic tạo gợi ý:

AI phải phân tích ngữ cảnh hiện tại của cuộc hội thoại và dữ liệu dự án cục bộ để tạo ra các gợi ý câu hỏi phổ biến hoặc hành động nhanh.

Ví dụ: Nếu người dùng vừa hỏi về một task, AI có thể gợi ý "Mark as Done", "Edit Task", "Add Deadline".

Nếu không có ngữ cảnh cụ thể, AI có thể gợi ý các câu hỏi chung như "Show active tasks", "Create a new project".

Các gợi ý phải được cập nhật động khi ngữ cảnh thay đổi.

// src/components/ai/suggestion-chips.tsx
import React from 'react';
import { Card } from '../ui/card'; // Giả định component Card có sẵn

interface SuggestionChipsProps {
  suggestions: { text: string; action?: any }[];
  onSelect: (suggestion: { text: string; action?: any }) => void;
}

export function SuggestionChips({ suggestions, onSelect }: SuggestionChipsProps) {
  return (
    <div className="flex flex-wrap gap-2 p-2">
      {suggestions.map((suggestion, index) => (
        <Card
          key={index}
          className="cursor-pointer hover:bg-accent p-2 rounded-md shadow-sm transition-colors duration-200"
          onClick={() => onSelect(suggestion)}
        >
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{suggestion.text}</span>
        </Card>
      ))}
    </div>
  );
}

3.6 Enhanced Chat UI
Mục tiêu: Nâng cao trải nghiệm đọc và tương tác trong giao diện chat.

Chi tiết Implementation (Prompt cho AI Agent):

Nhiệm vụ: Cải tiến giao diện chat hiện có để hỗ trợ các tính năng hiển thị phong phú và tương tác.

Yêu cầu:

Rich message rendering:

Triển khai khả năng hiển thị các loại nội dung phong phú trong tin nhắn AI. Điều này bao gồm:

Bảng (Tables): Khi AI trả về dữ liệu dạng bảng (ví dụ: danh sách task, chi tiết báo giá), hiển thị nó dưới dạng bảng HTML/React table có cấu trúc rõ ràng.

Danh sách (Lists): Hiển thị danh sách (ordered/unordered) một cách rõ ràng.

Cards: Tích hợp hiển thị các "Card" dữ liệu (ví dụ: Project Analysis Card, Quote Card) trực tiếp trong luồng chat, tuân thủ "Card-based UI".

Typing indicators với context:

Khi AI đang xử lý yêu cầu, hiển thị một chỉ báo gõ phím thông minh. Thay vì chỉ "AI đang gõ...", nó phải hiển thị các thông báo ngữ cảnh như "AI đang phân tích dự án của bạn...", "AI đang tạo báo giá...", hoặc "AI đang tìm kiếm task...".

Message reactions/feedback:

Thêm các nút phản hồi nhanh (ví dụ: biểu tượng ngón tay cái lên/xuống, hoặc một nút "Phản hồi") bên cạnh mỗi tin nhắn AI. Khi người dùng click, thu thập phản hồi (ví dụ: "hữu ích", "không hữu ích") và lưu trữ cục bộ.

Export conversation functionality:

Thêm một tùy chọn trong UI chat (ví dụ: nút trên thanh tiêu đề hoặc trong menu) cho phép người dùng xuất toàn bộ lịch sử hội thoại của họ. Người dùng có thể chọn định dạng xuất (ví dụ: văn bản thuần túy, JSON). Đảm bảo quá trình xuất hoàn toàn cục bộ và không gửi dữ liệu ra server.

Phase 4: Intelligence & Learning (2-3 tuần)
3.7 Adaptive Learning System
Mục tiêu: Cải thiện AI theo thời gian dựa trên tương tác cục bộ của người dùng, đảm bảo quyền riêng tư.

Chi tiết Implementation (Prompt cho AI Agent):

Nhiệm vụ: Triển khai hệ thống học tập thích ứng cục bộ trong src/ai/learning/pattern-recognition.ts.

Yêu cầu:

Phương thức analyzeUserPreferences(conversations: Conversation[]): UserPreferences:

Logic: Phương thức này phải phân tích lịch sử hội thoại cục bộ (conversations) để nhận diện các mẫu tương tác của người dùng.

Các mẫu cần nhận diện:

preferredResponseStyle: Xác định xem người dùng ưa thích phản hồi ngắn gọn (concise) hay chi tiết (detailed) dựa trên độ dài phản hồi của AI mà người dùng tương tác tích cực.

frequentActions: Liệt kê các loại hành động AI mà người dùng thường xuyên yêu cầu hoặc xác nhận.

language: Ngôn ngữ chính mà người dùng tương tác.

Lưu trữ: Các sở thích này phải được lưu trữ cục bộ trong localStorage (sử dụng AI_PREFERENCES_KEY) hoặc IndexedDB. Đảm bảo dữ liệu được JSON.stringify() trước khi lưu.

Phương thức adaptPrompts(basePrompt: string, userPreferences: UserPreferences): string:

Logic: Phương thức này phải tùy chỉnh basePrompt dựa trên userPreferences đã học.

Ví dụ: Nếu preferredResponseStyle là concise, thêm hướng dẫn "Please be concise in your response." vào prompt.

Các tùy chỉnh khác có thể dựa trên frequentActions để AI ưu tiên các loại phản hồi hoặc hành động đó.

Đảm bảo không có dữ liệu nào được gửi ra ngoài thiết bị của người dùng trong quá trình học tập này.

// src/ai/learning/pattern-recognition.ts
import { Conversation, UserPreferences } from '../types/index'; // Giả định các types này đã được định nghĩa

export class PatternRecognition {
  /**
   * Phân tích các mẫu từ lịch sử hội thoại cục bộ để nhận diện sở thích người dùng.
   * @param conversations Mảng các cuộc hội thoại của người dùng.
   * @returns Đối tượng UserPreferences đã được cập nhật.
   */
  static analyzeUserPreferences(conversations: Conversation[]): UserPreferences {
    const preferences: UserPreferences = {
      preferredResponseStyle: 'concise', // Mặc định
      frequentActions: [],
      modelPreferences: {},
      language: 'en' // Mặc định
    };

    // Ví dụ phân tích:
    const actionCounts: { [key: string]: number } = {};
    let detailedResponseCount = 0;
    let conciseResponseCount = 0;

    conversations.forEach(conv => {
      conv.messages.forEach(msg => {
        if (msg.role === 'assistant' && msg.action) {
          actionCounts[msg.action.type] = (actionCounts[msg.action.type] || 0) + 1;
        }
        // Giả định cách nhận diện phong cách phản hồi
        if (msg.role === 'assistant' && msg.text.length > 200) { // Ví dụ: phản hồi dài là detailed
          detailedResponseCount++;
        } else if (msg.role === 'assistant' && msg.text.length < 50) { // Ví dụ: phản hồi ngắn là concise
          conciseResponseCount++;
        }
      });
    });

    // Cập nhật frequentActions
    preferences.frequentActions = Object.entries(actionCounts)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 5) // Top 5 hành động thường xuyên
      .map(([actionType]) => actionType);

    // Cập nhật preferredResponseStyle
    if (detailedResponseCount > conciseResponseCount) {
      preferences.preferredResponseStyle = 'detailed';
    } else {
      preferences.preferredResponseStyle = 'concise';
    }

    // Lưu preferences vào localStorage (đảm bảo tuân thủ User Data Ownership)
    localStorage.setItem('freelance-flow-ai-preferences', JSON.stringify(preferences));
    return preferences;
  }

  /**
   * Tùy chỉnh prompt dựa trên sở thích đã học của người dùng.
   * @param basePrompt Prompt cơ bản.
   * @param userPreferences Sở thích của người dùng.
   * @returns Prompt đã được tùy chỉnh.
   */
  static adaptPrompts(basePrompt: string, userPreferences: UserPreferences): string {
    let adaptedPrompt = basePrompt;
    if (userPreferences.preferredResponseStyle === 'concise') {
      adaptedPrompt += " Please be concise in your response.";
    } else if (userPreferences.preferredResponseStyle === 'detailed') {
      adaptedPrompt += " Please provide a detailed response.";
    }
    // Thêm các tùy chỉnh khác dựa trên frequentActions, v.v.
    return adaptedPrompt;
  }
}

3.8 Multi-Model Intelligence
Mục tiêu: Tối ưu hóa hiệu suất và chi phí bằng cách sử dụng các mô hình AI khác nhau.

Chi tiết Implementation (Prompt cho AI Agent):

Nhiệm vụ: Tạo hoặc cập nhật file src/ai/utils/model-selector.ts để triển khai logic lựa chọn mô hình thông minh.

Yêu cầu:

Phương thức selectModel(request: AIRequest, availableModels: ModelConfig[]): ModelConfig:

Logic: Phương thức này phải phân tích request (bao gồm userInput, context, requestedAction) để xác định độ phức tạp của yêu cầu.

Tiêu chí lựa chọn:

Độ phức tạp của tác vụ: Sử dụng các tiêu chí như độ dài của prompt, số lượng thực thể được đề cập, loại hành động được yêu cầu (ví dụ: phân tích dự án phức tạp cần mô hình mạnh hơn, tạo task đơn giản có thể dùng mô hình nhẹ hơn).

Ưu tiên chi phí: Ưu tiên các mô hình hiệu quả về chi phí nếu chúng đáp ứng được yêu cầu về độ chính xác và tốc độ.

Khả dụng: Kiểm tra trạng thái khả dụng của mô hình (nếu có thông tin).

Auto-switch: Tự động trả về cấu hình của mô hình được chọn.

Triển khai Fallback Mechanisms:

Trong quá trình gọi API AI (thường sẽ thông qua Serverless Function), nếu một mô hình không khả dụng hoặc trả về lỗi, hệ thống phải tự động thử một mô hình khác trong danh sách availableModels (ví dụ: chuyển từ OpenAI sang Google Gemini).

Nếu tất cả các mô hình đều thất bại, cung cấp một phản hồi lỗi thân thiện với người dùng và gợi ý các bước khắc phục.

Quản lý API Key: Đảm bảo rằng API Key do người dùng nhập vào được chuyển tiếp an toàn đến Serverless Function và không bao giờ được hiển thị ở phía client hoặc lưu trữ cố định trên server.

Phase 5: Advanced Features (2-3 tuần)
3.9 AI Workflows
Mục tiêu: Tự động hóa các chuỗi hành động phức tạp.

Chi tiết Implementation (Prompt cho AI Agent):

Nhiệm vụ: Tạo file src/ai/workflows/project-setup.ts để triển khai luồng công việc thiết lập dự án.

Yêu cầu:

Phương thức execute(projectDetails: ProjectInput): Promise<string>:

Logic: Phương thức này phải điều phối một chuỗi các hành động để thiết lập một dự án mới.

Các bước cụ thể (giả định các hàm này đã tồn tại hoặc cần được tạo):

createProjectStructure(projectDetails.name): Tạo cấu trúc cơ bản cho dự án.

generateInitialTasks(projectDetails.type): Tạo một tập hợp các task ban đầu dựa trên loại dự án (ví dụ: "website design", "mobile app development").

createClientProfile(projectDetails.client): Thiết lập hồ sơ khách hàng liên quan.

createQuoteTemplate(projectDetails.pricingModel): Tạo một mẫu báo giá dựa trên mô hình giá được cung cấp.

scheduleMilestones(projectDetails.deadline): Lên lịch các mốc quan trọng của dự án.

Tương tác UI: Sau mỗi bước, AI có thể gửi một tin nhắn xác nhận hoặc một "Card" tóm tắt trạng thái hiện tại của workflow.

Xử lý lỗi: Triển khai try/catch để xử lý lỗi trong quá trình thực thi workflow và cung cấp phản hồi rõ ràng cho người dùng.

// src/ai/workflows/project-setup.ts
import { ProjectInput } from '../types/index'; // Giả định ProjectInput type

export class ProjectSetupWorkflow {
  /**
   * Thực thi quy trình thiết lập dự án tự động.
   * @param projectDetails Thông tin chi tiết dự án từ người dùng.
   */
  static async execute(projectDetails: ProjectInput): Promise<string> {
    try {
      // 1. Tạo cấu trúc dự án
      // await createProjectStructure(projectDetails.name);
      // 2. Tạo các task ban đầu dựa trên loại dự án
      // await generateInitialTasks(projectDetails.type);
      // 3. Thiết lập hồ sơ khách hàng
      // await createClientProfile(projectDetails.client);
      // 4. Tạo mẫu báo giá
      // await createQuoteTemplate(projectDetails.pricingModel);
      // 5. Lên lịch các mốc quan trọng
      // await scheduleMilestones(projectDetails.deadline);

      return `Dự án '${projectDetails.name}' đã được thiết lập thành công! Tôi đã tạo các task ban đầu và hồ sơ khách hàng.`;
    } catch (error) {
      console.error("Lỗi khi thiết lập dự án:", error);
      return "Có lỗi xảy ra khi thiết lập dự án. Vui lòng thử lại hoặc cung cấp thêm chi tiết.";
    }
  }
}

4. Technical Implementation
4.1 File Structure Plan
Cấu trúc thư mục sẽ được tổ chức rõ ràng để dễ dàng quản lý và mở rộng:

src/ai/
├── context/
│   ├── prompt-templates.ts      # Quản lý prompt tập trung
│   ├── few-shot-examples.ts     # Các ví dụ đào tạo cho AI
│   └── context-manager.ts       # Xử lý ngữ cảnh thông minh
├── flows/
│   ├── ask-about-tasks.ts       # Luồng hiện có được nâng cấp
│   ├── analyze-project.ts       # Luồng phân tích dự án mới
│   ├── generate-quote.ts        # Luồng tạo báo giá mới
│   └── time-management.ts       # Luồng quản lý thời gian mới
├── learning/
│   ├── pattern-recognition.ts   # Hệ thống học tập cục bộ
│   └── preference-manager.ts    # Quản lý sở thích người dùng
├── workflows/
│   ├── project-setup.ts         # Các quy trình làm việc phức tạp
│   └── workflow-engine.ts       # Công cụ thực thi quy trình làm việc
└── utils/
    ├── token-counter.ts         # Quản lý token
    ├── model-selector.ts         # Lựa chọn mô hình thông minh
    └── response-parser.ts       # Xử lý phản hồi của AI

4.2 Data Storage Strategy (Tuân thủ User Data Ownership)
Tất cả dữ liệu liên quan đến AI (sở thích người dùng, mẫu học tập, cache prompt) sẽ được lưu trữ cục bộ trên thiết bị của người dùng, sử dụng các cơ chế như localStorage hoặc IndexedDB.

// Định nghĩa các key cho localStorage (đảm bảo duy nhất và dễ nhận biết)
const AI_PREFERENCES_KEY = 'freelance-flow-ai-preferences';
const AI_PATTERNS_KEY = 'freelance-flow-ai-patterns';
const PROMPT_CACHE_KEY = 'freelance-flow-prompt-cache';

// Interface cho sở thích người dùng
interface AIPreferences {
  preferredResponseStyle: 'concise' | 'detailed'; // Phong cách phản hồi ưa thích
  frequentActions: string[]; // Các hành động AI thường xuyên được sử dụng/xác nhận
  modelPreferences: { [modelName: string]: number }; // Ưu tiên sử dụng mô hình (nếu có)
  language: 'en' | 'vi'; // Ngôn ngữ ưa thích
}

// Ví dụ về cách lưu/tải dữ liệu
// Lưu: localStorage.setItem(AI_PREFERENCES_KEY, JSON.stringify(userPreferences));
// Tải: const preferences = JSON.parse(localStorage.getItem(AI_PREFERENCES_KEY) || '{}');

4.3 Performance Optimization
Chiến lược:

Prompt caching: Lưu trữ các prompt đã được tạo và các phản hồi phổ biến để giảm độ trễ và chi phí API cho các yêu cầu lặp lại.

Response streaming: Hiển thị phản hồi của AI từng phần khi nó được tạo ra, cải thiện cảm nhận về tốc độ.

Background context preparation: Chuẩn bị dữ liệu ngữ cảnh cần thiết ở chế độ nền trước khi người dùng gửi yêu cầu, giảm thời gian chờ đợi.

Token usage optimization: Liên tục theo dõi và tối ưu hóa số lượng token được gửi đến và nhận từ mô hình AI.

4.4 Kiến trúc Triển khai (Node.js & Vercel)
Ứng dụng sẽ được xây dựng trên nền tảng Node.js và triển khai trên Vercel, tận dụng mô hình Serverless Functions để tối ưu hóa hiệu suất, khả năng mở rộng và quản lý chi phí.

Vai trò của Node.js & Vercel:

Phục vụ ứng dụng Frontend: Vercel sẽ chịu trách nhiệm phục vụ các tệp tĩnh của ứng dụng frontend (được xây dựng bằng React/TypeScript), đảm bảo thời gian tải nhanh và phân phối nội dung toàn cầu thông qua CDN.

Proxy API cho Mô hình AI: Các cuộc gọi đến API của các mô hình AI (OpenAI, Google Gemini, v.v.) sẽ được định tuyến thông qua các Serverless Functions của Vercel. Điều này mang lại các lợi ích sau:

Bảo mật: Ẩn khóa API của các mô hình AI khỏi phía client. Lưu ý: Các khóa API này sẽ do người dùng nhập vào ứng dụng và được chuyển tiếp an toàn qua Serverless Functions, không lưu trữ cố định trên server.

Quản lý Rate Limit: Các hàm serverless có thể quản lý và điều tiết các yêu cầu đến API AI, tránh vượt quá giới hạn tốc độ.

Chọn mô hình thông minh: Logic Multi-Model Intelligence (Mục 3.8) sẽ được triển khai trong các hàm serverless, cho phép backend tự động chọn mô hình AI phù hợp nhất dựa trên độ phức tạp của yêu cầu và chi phí, mà không cần client phải biết chi tiết.

Khả năng mở rộng: Serverless Functions tự động mở rộng quy mô để xử lý lưu lượng truy cập tăng đột biến mà không cần quản lý hạ tầng thủ công.

Không có Database Backend: Phù hợp với nguyên tắc User Data Ownership, ứng dụng sẽ không lưu trữ dữ liệu người dùng trên bất kỳ database backend nào. Tất cả dữ liệu liên quan đến dự án, task, client, và lịch sử hội thoại AI đều được xử lý và lưu trữ cục bộ trên thiết bị của người dùng.

Tránh Over-Engineering:

Với kiến trúc này, chúng tôi sẽ tập trung vào việc tận dụng tối đa khả năng xử lý cục bộ và các hàm serverless gọn nhẹ. Các tính năng AI sẽ được thiết kế để hoạt động hiệu quả với dữ liệu cục bộ, và chỉ sử dụng serverless functions cho các tác vụ cần thiết như proxy API. Điều này giúp tránh việc xây dựng các hệ thống backend phức tạp không cần thiết, giữ cho ứng dụng tinh gọn và dễ bảo trì, đồng thời tuân thủ nguyên tắc Minimalism và Essential Features Only.

5. Testing & Quality Assurance
5.1 Testing Plan
Unit Tests:

Kiểm tra các hàm tạo prompt và quản lý ngữ cảnh.

Kiểm tra logic phân tích và thực thi hành động của AI.

Kiểm tra quản lý sở thích và học tập cục bộ.

Kiểm tra các hàm tiện ích (token counter, model selector).

Integration Tests:

Kiểm tra các luồng hội thoại đầy đủ từ đầu đến cuối, bao gồm các hành động của AI.

Kiểm tra hỗ trợ đa ngôn ngữ trong các phản hồi và hành động.

Kiểm tra xử lý lỗi và các cơ chế fallback.

Đánh giá hiệu suất và độ trễ của AI.

User Testing:

Thực hiện A/B testing với các phong cách prompt và tính năng AI khác nhau.

Đo lường chất lượng phản hồi và tỷ lệ thành công của hành động thông qua phản hồi trong ứng dụng.

Thu thập điểm hài lòng người dùng thông qua các khảo sát nhỏ, cục bộ.

5.2 Quality Metrics (KPIs)
Technical Metrics:

API response time average: Thời gian phản hồi trung bình của các cuộc gọi API AI.

Token usage efficiency: Hiệu quả sử dụng token (ví dụ: số token trung bình mỗi cuộc hội thoại, tỷ lệ token được cắt bỏ).

Error rate percentage: Tỷ lệ lỗi trong các cuộc gọi API và quá trình xử lý của AI.

Cache hit rate: Tỷ lệ các yêu cầu được phục vụ từ cache prompt.

User Metrics (Thu thập cục bộ):

AI feature adoption rate: Tỷ lệ người dùng sử dụng các tính năng AI mới.

User session duration with AI: Thời lượng phiên trung bình mà người dùng tương tác với AI.

Task completion rate via AI: Tỷ lệ các task được hoàn thành thông qua sự hỗ trợ của AI.

User satisfaction scores: Điểm đánh giá sự hài lòng của người dùng với AI.

6. Implementation Timeline (13 tuần)
Tuần 1-2: Phase 1 - Foundation Enhancement
[ ] Tạo prompt templates system (src/ai/context/prompt-templates.ts).

[ ] Implement few-shot examples (src/ai/context/few-shot-examples.ts).

[ ] Nâng cấp ask-about-tasks flow.

[ ] Smart context management (src/ai/utils/context-manager.ts).

Tuần 3-5: Phase 2 - Advanced AI Capabilities
[ ] Tạo Project Analysis Flow (src/ai/flows/analyze-project.ts).

[ ] Tạo Quote Generation Flow (src/ai/flows/generate-quote.ts).

[ ] Tạo Time Management Flow (src/ai/flows/time-management.ts).

[ ] Enhanced actions system và UI xác nhận hành động.

[ ] Testing & debugging cho các flows mới.

Tuần 6-7: Phase 3 - User Experience Enhancement
[ ] Smart suggestions UI (src/components/ai/suggestion-chips.tsx).

[ ] Enhanced chat interface (rich rendering, typing indicators).

[ ] Quick actions implementation.

[ ] User experience polish và kiểm tra tuân thủ Design Principles.

Tuần 8-10: Phase 4 - Intelligence & Learning
[ ] Adaptive learning system (src/ai/learning/pattern-recognition.ts).

[ ] Multi-model intelligence và logic model-selector.ts.

[ ] Hoàn thiện cơ chế học tập cục bộ và quản lý sở thích.

[ ] Tối ưu hóa hiệu suất tổng thể.

Tuần 11-13: Phase 5 - Advanced Features
[ ] AI workflows (ví dụ: project-setup.ts).

[ ] Kiểm tra cuối cùng và đảm bảo chất lượng.

[ ] Viết tài liệu kỹ thuật chi tiết.

7. Risk Management
7.1 Technical Risks
Rủi ro: Giới hạn tốc độ API (Rate Limits).

Giảm thiểu: Thực hiện batching yêu cầu thông minh, caching phản hồi, và hỗ trợ nhiều nhà cung cấp mô hình AI để chuyển đổi khi cần.

Rủi ro: Vượt quá giới hạn token.

Giảm thiểu: Sử dụng thuật toán cắt bớt ngữ cảnh thông minh, tối ưu hóa prompt để ngắn gọn hơn.

Rủi ro: Vấn đề khả dụng của mô hình AI.

Giảm thiểu: Hỗ trợ nhiều nhà cung cấp, triển khai cơ chế fallback linh hoạt để chuyển sang mô hình khác hoặc cung cấp phản hồi mặc định.

7.2 User Experience Risks
Rủi ro: Phản hồi của AI không liên quan hoặc không chính xác.

Giảm thiểu: Kiểm tra rộng rãi với các trường hợp sử dụng đa dạng, triển khai vòng lặp phản hồi người dùng liên tục, và cung cấp các lựa chọn hoàn tác hoặc sửa đổi thủ công.

Rủi ro: Giao diện người dùng phức tạp gây khó khăn cho người dùng.

Giảm thiểu: Tuân thủ nguyên tắc "Minimalism" và "Essential Features Only", sử dụng "Progressive Disclosure" (chỉ hiển thị thông tin khi cần), và cung cấp tài liệu hướng dẫn rõ ràng.

8. Success Measurement
8.1 KPIs (Đã đề cập trong Mục 1.1)
8.2 Feedback Collection
Phương pháp (Thu thập cục bộ):

In-app feedback forms: Các biểu mẫu phản hồi ngắn gọn ngay trong ứng dụng, cho phép người dùng đánh giá chất lượng phản hồi của AI.

Usage analytics (local only): Phân tích hành vi sử dụng AI cục bộ trên thiết bị người dùng (ví dụ: tần suất sử dụng, các tính năng được sử dụng nhiều nhất) mà không gửi dữ liệu ra ngoài.

A/B testing results: So sánh hiệu quả của các phiên bản AI khác nhau.

User interviews: Thực hiện các cuộc phỏng vấn trực tiếp với một nhóm nhỏ người dùng để thu thập phản hồi định tính sâu hơn.

9. Maintenance & Updates
9.1 Regular Maintenance
Hàng tháng:

Xem xét các chỉ số hiệu suất của AI.

Cập nhật các few-shot examples dựa trên dữ liệu sử dụng cục bộ và phản hồi.

Tối ưu hóa prompt dựa trên các mẫu và phản hồi của người dùng.

Hàng quý:

Đánh giá các mô hình AI mới trên thị trường.

Cập nhật các ví dụ đào tạo và dữ liệu ngữ cảnh.

Xem xét các mẫu phản hồi của người dùng để xác định các cơ hội cải tiến lớn.

9.2 Continuous Improvement
Quy trình:

Thu thập phản hồi người dùng: Từ các biểu mẫu trong ứng dụng và phân tích sử dụng cục bộ.

Phân tích mẫu hội thoại: Xác định các điểm yếu hoặc cơ hội cải thiện.

Xác định cơ hội cải tiến: Đề xuất các thay đổi cụ thể cho prompt, few-shot examples, hoặc logic của AI.

Thực hiện cập nhật tăng cường: Triển khai các thay đổi nhỏ, liên tục.

Kiểm tra và đo lường tác động: Đánh giá hiệu quả của các thay đổi thông qua KPIs và phản hồi người dùng.

10. Conclusion
Kế hoạch này đảm bảo việc nâng cấp AI chat trong Freelance Flow một cách có hệ thống, tuân thủ chặt chẽ các nguyên tắc thiết kế của ứng dụng, và tập trung vào việc mang lại giá trị thực tế và nâng cao năng suất cho người dùng freelancer. Với timeline 13 tuần, kế hoạch này có thể được điều chỉnh linh hoạt tùy theo mức độ ưu tiên và nguồn lực sẵn có.

Các Bước Tiếp Theo:

Xem xét và phê duyệt kế hoạch này.

Bắt đầu với Phase 1 - Foundation Enhancement.

Thiết lập môi trường phát triển cho các tính năng AI.

Tạo framework kiểm thử cho chức năng AI.

Kế hoạch này được thiết kế để có thể implement từng phase độc lập, cho phép phát triển linh hoạt và kiểm thử sớm.