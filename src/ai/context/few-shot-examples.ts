/**
 * @fileoverview Provides few-shot learning examples to the AI model.
 * These examples guide the model to produce the correct JSON output format,
 * especially for complex entity extraction tasks like distinguishing between
 * a task name and a client name within the same user prompt.
 */

export const fewShotExamples = {
  en: `
Here are EXACT examples of the correct JSON response format you MUST follow:

<example>
  <user_prompt>Create a new task named "Develop backend API for e-commerce" for client "Wayne Enterprises", deadline 2025-08-15. #Task</user_prompt>
  <assistant_response>
{
  "text": "✅ **Task Created Successfully!** \\n\\nI've created the task '**Develop backend API for e-commerce**' for client **Wayne Enterprises** with a deadline of **August 15, 2025**. The task has been set to start today and will be categorized appropriately.",
  "action": {
    "type": "createTask",
    "payload": {
      "name": "Develop backend API for e-commerce",
      "clientName": "Wayne Enterprises",
      "deadline": "2025-08-15",
      "startDate": "2025-08-06",
      "description": "Backend API development for e-commerce platform",
      "status": "todo"
    }
  }
}
  </assistant_response>
</example>

<example>
  <user_prompt>can you make a new 3d task for stark industries called 'render iron man suit'. deadline is next friday</user_prompt>
  <assistant_response>
{
  "text": "🚀 **3D Task Scheduled!** \\n\\nDone! I've scheduled the '**render iron man suit**' task for **Stark Industries**, due next Friday (August 9, 2025). This task is ready to go!",
  "action": {
    "type": "createTask",
    "payload": {
      "name": "render iron man suit",
      "clientName": "Stark Industries",
      "deadline": "2025-08-09",
      "startDate": "2025-08-06",
      "description": "3D rendering of Iron Man suit",
      "status": "todo"
    }
  }
}
  </assistant_response>
</example>

REMEMBER: The "payload" field must ALWAYS be a JSON object with curly braces {}, never an array with square brackets [].
`,
  vi: `
Đây là các ví dụ CHÍNH XÁC về định dạng JSON response đúng mà bạn PHẢI tuân theo:

<example>
  <user_prompt>Tạo công việc mới tên là "Phát triển API backend cho e-commerce" cho khách hàng "Wayne Enterprises", hạn chót 15-08-2025. #Task</user_prompt>
  <assistant_response>
{
  "text": "✅ **Tạo công việc thành công!** \\n\\nTôi đã tạo công việc '**Phát triển API backend cho e-commerce**' cho khách hàng **Wayne Enterprises** với hạn chót **15 tháng 8, 2025**. Công việc được đặt bắt đầu từ hôm nay.",
  "action": {
    "type": "createTask",
    "payload": {
      "name": "Phát triển API backend cho e-commerce",
      "clientName": "Wayne Enterprises",
      "deadline": "2025-08-15",
      "startDate": "2025-08-06",
      "description": "Phát triển API backend cho nền tảng thương mại điện tử",
      "status": "todo"
    }
  }
}
  </assistant_response>
</example>

<example>
  <user_prompt>bạn có thể tạo một công việc 3d mới cho stark industries tên là 'render bộ giáp iron man'. hạn chót là thứ sáu tới</user_prompt>
  <assistant_response>
{
  "text": "🚀 **Đã lên lịch công việc 3D!** \\n\\nXong! Tôi đã lên lịch công việc '**render bộ giáp iron man**' cho **Stark Industries**, hạn vào thứ Sáu tới (9 tháng 8, 2025). Công việc đã sẵn sàng!",
  "action": {
    "type": "createTask",
    "payload": {
      "name": "render bộ giáp iron man",
      "clientName": "Stark Industries",
      "deadline": "2025-08-09",
      "startDate": "2025-08-06",
      "description": "Render 3D bộ giáp Iron Man",
      "status": "todo"
    }
  }
}
  </assistant_response>
</example>

NHỚ: Trường "payload" phải LUÔN là một đối tượng JSON với dấu ngoặc nhọn {}, không bao giờ là mảng với dấu ngoặc vuông [].
`,
};