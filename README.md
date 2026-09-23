# AuraStudy

## 1. Giới thiệu

AuraStudy là hệ thống trợ lý học tập thông minh ứng dụng AI, hỗ trợ sinh viên học tập thông qua tài liệu cá nhân.

Người dùng có thể tải tài liệu lên hệ thống, đặt câu hỏi, yêu cầu AI tóm tắt nội dung và tự động tạo bài kiểm tra.

## 2. Mục tiêu

- Hỗ trợ sinh viên học tập hiệu quả hơn.
- Giảm thời gian tìm kiếm và tổng hợp kiến thức.
- Ứng dụng AI vào quá trình học tập.
- Xây dựng hệ thống có khả năng trả lời dựa trên tài liệu người dùng cung cấp.
- Theo dõi kết quả và tiến độ học tập.

## 3. Chức năng chính

### Quản lý tài khoản
- Đăng ký
- Đăng nhập
- Đăng xuất
- Quản lý thông tin cá nhân

### Quản lý tài liệu
- Upload PDF, DOCX, TXT
- Xem danh sách tài liệu
- Xem nội dung tài liệu
- Xóa tài liệu
- Tìm kiếm tài liệu

### Aura AI
- Hỏi đáp dựa trên tài liệu
- Tìm kiếm thông tin liên quan
- Giải thích nội dung
- Tóm tắt tài liệu
- Hỗ trợ học tập

### Quiz
- Tạo câu hỏi tự động bằng AI
- Làm bài kiểm tra
- Tự động chấm điểm
- Xem kết quả
- Lưu lịch sử làm bài

### Theo dõi học tập
- Theo dõi số lượng tài liệu
- Theo dõi số bài quiz
- Theo dõi điểm số
- Theo dõi quá trình học tập

## 4. Công nghệ

### Frontend
- React
- Vite
- Tailwind CSS

### Backend
- Python
- FastAPI
- SQLAlchemy
- Pydantic

### Database
- MySQL

### AI
- Gemini API
- RAG
- Embedding
- ChromaDB hoặc FAISS

### Công cụ
- Git
- GitHub
- Docker

## 5. Kiến trúc hệ thống

```text
User
 |
 v
React Frontend
 |
 v
FastAPI Backend
 |
 +-------- MySQL
 |
 +-------- RAG System
              |
              +-- Embedding
              |
              +-- Vector Database
              |
              +-- Gemini API
6. Quy trình RAG
Upload tài liệu
      |
      v
Đọc nội dung
      |
      v
Chia nhỏ tài liệu
      |
      v
Tạo Embedding
      |
      v
Lưu vào Vector Database
      |
      v
Người dùng đặt câu hỏi
      |
      v
Tìm kiếm nội dung liên quan
      |
      v
Gemini API
      |
      v
Aura AI trả lời
7. Giao diện

Thiết kế giao diện theo phong cách đơn giản và hiện đại.

Nền chính: trắng
Màu chính: xanh nước biển
Màu phụ: cam
Giao diện responsive
Dashboard hiển thị thông tin học tập
Chat AI dễ sử dụng
8. Các màn hình
Landing Page
Login
Register
Dashboard
Documents
Document Detail
AI Chat
Summary
Quiz Generator
Quiz
Quiz Result
Learning Progress
Profile
Settings
9. Database

Các bảng chính:

users
documents
document_chunks
chat_sessions
chat_messages
quizzes
questions
quiz_attempts
quiz_answers
learning_progress
10. API chính
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout

GET  /api/documents
POST /api/documents
GET  /api/documents/{id}
DELETE /api/documents/{id}

POST /api/ai/chat
POST /api/ai/summarize

POST /api/quizzes
GET  /api/quizzes
GET  /api/quizzes/{id}
POST /api/quizzes/{id}/submit

GET /api/dashboard
GET /api/progress
11. Cấu trúc Project
AuraStudy/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── services/
│   │   └── utils/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── ai/
│   │   └── core/
│   └── main.py
│
├── database/
│   ├── schema.sql
│   └── seed.sql
│
├── docs/
│   ├── requirements.md
│   ├── architecture.md
│   ├── ERD.md
│   └── API.md
│
├── docker-compose.yml
└── README.md
12. Cài đặt
Backend
cd backend
python -m venv venv

Windows:

venv\Scripts\activate

Cài đặt thư viện:

pip install -r requirements.txt

Tạo file .env:

DATABASE_URL=
JWT_SECRET_KEY=
GEMINI_API_KEY=
VECTOR_DB_PATH=

Chạy server:

uvicorn app.main:app --reload
Frontend
cd frontend
npm install
npm run dev
13. Bảo mật
Mật khẩu được mã hóa.
Sử dụng JWT cho xác thực.
Phân quyền người dùng.
Kiểm tra file upload.
Giới hạn kích thước file.
Kiểm tra dữ liệu đầu vào.
Không lưu API Key trực tiếp trong code.
Sử dụng file .env.
Không đưa Gemini API Key lên Frontend.

14. MVP

Phiên bản đầu tiên tập trung vào:

Đăng ký và đăng nhập.
Upload tài liệu.
Lưu tài liệu.
Hỏi đáp với Aura AI.
Tóm tắt tài liệu.
Tạo Quiz.
Chấm điểm.
Hiển thị tiến độ học tập.
15. Demo
Đăng nhập
   ↓
Dashboard
   ↓
Upload tài liệu
   ↓
Hệ thống xử lý tài liệu
   ↓
Mở Aura AI
   ↓
Đặt câu hỏi
   ↓
RAG tìm kiếm nội dung
   ↓
Gemini tạo câu trả lời
   ↓
Tóm tắt tài liệu
   ↓
Tạo Quiz
   ↓
Làm Quiz
   ↓
Xem điểm
   ↓
Xem tiến độ học tập
16. Roadmap
Giai đoạn 1
Phân tích yêu cầu
Thiết kế Database
Thiết kế giao diện
Giai đoạn 2
Xây dựng Backend
Xây dựng Frontend
Xây dựng Authentication
Giai đoạn 3
Tích hợp Gemini API
Xây dựng RAG
Xây dựng Vector Database
Giai đoạn 4
Quiz
Dashboard
Learning Progress
Giai đoạn 5
Kiểm thử
Sửa lỗi
Hoàn thiện giao diện
Chuẩn bị demo
17. Kết luận

AuraStudy hướng tới việc xây dựng một nền tảng học tập kết hợp giữa quản lý tài liệu và trí tuệ nhân tạo.

Hệ thống không chỉ cung cấp chatbot AI mà còn sử dụng RAG để giúp AI trả lời dựa trên tài liệu học tập của người dùng.

AuraStudy
Learn smarter. Study better.