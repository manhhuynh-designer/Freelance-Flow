# AI Setup Guide

## Cách thiết lập API Keys cho AI功能

### 1. Google AI API Key (cho Gemini models)

1. Truy cập [Google AI Studio](https://ai.google.dev/)
2. Đăng nhập với Google account
3. Tạo một API key mới
4. Copy API key

### 2. OpenAI API Key (cho GPT models)

1. Truy cập [OpenAI Platform](https://platform.openai.com/api-keys)
2. Đăng nhập hoặc tạo tài khoản
3. Tạo một API key mới
4. Copy API key

### 3. Cập nhật file .env.local

Mở file `.env.local` trong thư mục root của project và thay thế demo keys:

```bash
# AI API Keys - Add your real API keys here
# Google AI API Key (for Gemini models)
GOOGLE_GENAI_API_KEY=your_real_google_api_key_here

# OpenAI API Key (for GPT models)  
OPENAI_API_KEY=your_real_openai_api_key_here

# Firebase project ID (if using Firebase features)
FIREBASE_PROJECT_ID=your_firebase_project_id_here

# Local development settings
NODE_ENV=development
```

### 4. Restart server

Sau khi cập nhật API keys, restart development server:

```bash
npm run dev
```

### 5. Test AI功能

- Truy cập chat trong dashboard
- Thử các lệnh tạo task như: "Tạo task mới cho dự án website"
- AI sẽ hiểu và thực hiện các yêu cầu

### Troubleshooting

#### Lỗi "API key not valid"
- Kiểm tra API key có đúng format không
- Đảm bảo API key có quyền truy cập
- Restart server sau khi thay đổi

#### Lỗi "Failed to fetch"
- Kiểm tra server có đang chạy không
- Xem console logs để biết chi tiết lỗi

#### Test debugging
- Truy cập `/test-ai` để test AI functionality
- Xem server logs để debug

### Pricing Information

#### Google AI (Gemini)
- Free tier: 15 requests/minute
- Rate limits apply

#### OpenAI 
- Pay-per-use model
- Check current pricing on OpenAI website

### Support

Nếu gặp vấn đề, check:
1. Server logs trong terminal
2. Browser console
3. API key permissions
4. Network connectivity
