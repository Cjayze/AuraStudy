# AuraStudy

AuraStudy là ứng dụng hỗ trợ học tập với AI. Người dùng có thể quản lý tài liệu, trao đổi với trợ lý AI, tạo bài quiz và theo dõi tiến độ học tập.

## Tính năng

- Đăng ký, đăng nhập và quản lý tài khoản.
- Tải lên và quản lý tài liệu học tập.
- Hỏi đáp với AI dựa trên nội dung tài liệu.
- Tạo quiz, làm bài và xem kết quả.
- Dashboard theo dõi hoạt động học tập.

## Công nghệ

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **AI:** Gemini API
- **Dữ liệu:** JSON cục bộ; có tích hợp PostgreSQL/Supabase
- **Authentication:** Supabase Auth (Google OAuth) and JWT
- **Authentication:** Supabase Auth (Google OAuth) and JWT
## Yêu cầu

- Node.js 20 LTS trở lên và npm.
- Gemini API key để sử dụng các tính năng AI. Một số chức năng tạo quiz có thể dùng chế độ dự phòng khi chưa cấu hình key.
- A Supabase project with Google provider enabled and Google OAuth Client ID/Secret configured.
- A Supabase project with Google provider enabled and Google OAuth Client ID/Secret configured.

## Cài đặt và chạy ở chế độ phát triển

### 1. Clone repository

```bash
git clone https://github.com/Cjayze/AuraStudy.git
cd AuraStudy
```

### 2. Cài dependencies

```bash
npm ci
```

### 3. Cấu hình biến môi trường

Tạo file `.env` ở thư mục gốc dự án bằng cách sao chép `.env.example`, sau đó cập nhật các giá trị phù hợp:

**Windows PowerShell**

```powershell
Copy-Item .env.example .env
```

**macOS/Linux**

```bash
cp .env.example .env
```

Mở `.env` và cấu hình:

| Biến | Mô tả |
| --- | --- |
| `GEMINI_API_KEY` | API key từ Google AI Studio. Cần thiết cho các tính năng Gemini. |
| `JWT_SECRET` | Chuỗi ngẫu nhiên dài, riêng cho môi trường của bạn; không dùng giá trị mẫu. |
| `SUPABASE_PASSWORD` | Mật khẩu PostgreSQL/Supabase nếu môi trường của bạn sử dụng kết nối này. |
| `APP_URL` | URL triển khai ứng dụng; thường không cần cho chạy local. |

Server tự đọc file `.env` bằng `dotenv`. Không dùng `.env.local` trừ khi tự cấu hình cách nạp file đó. Không commit `.env` hoặc chia sẻ API key, mật khẩu cơ sở dữ liệu và JWT secret.

Configure `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env`, plus their `VITE_` counterparts. Enable Google under Supabase Authentication > Providers, add the Google OAuth Client ID and Secret, set the Google redirect URI to `https://<project-ref>.supabase.co/auth/v1/callback`, and allow `http://localhost:3000/**` in Supabase Auth URL Configuration.
### 4. Khởi chạy

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000). API kiểm tra trạng thái có tại [http://localhost:3000/api/health](http://localhost:3000/api/health).

## Kiểm tra và build

Kiểm tra TypeScript:

```bash
npm run lint
```

Tạo bản build production:

```bash
npm run build
```

Chạy server từ bản build:

**Windows PowerShell**

```powershell
$env:NODE_ENV = "production"
npm start
```

**macOS/Linux**

```bash
NODE_ENV=production npm start
```

Server mặc định chạy ở cổng `3000`.

## Dữ liệu cục bộ và cộng tác

- Khi khởi chạy lần đầu, ứng dụng tự tạo `data/db.json` với dữ liệu khởi tạo nếu file chưa tồn tại.
- Tệp dữ liệu này và nội dung trong `uploads/` không được lưu trong Git. Mỗi thành viên clone repo sẽ có dữ liệu riêng trên máy.
- Muốn chia sẻ dữ liệu giữa các môi trường, cần cấu hình PostgreSQL/Supabase và triển khai cơ chế đồng bộ/migration phù hợp. Không đưa dữ liệu người dùng hoặc tài liệu riêng tư vào repository.

## Cấu trúc chính

```text
.
├── server.ts                  # Điểm khởi chạy Express và Vite
├── server/                    # API routes, xử lý dữ liệu và nghiệp vụ
├── src/                       # Giao diện React, Supabase Auth và tiện ích phía client
??? src/                       # React interface, Supabase Auth, and client utilities
├── data/                      # Dữ liệu JSON cục bộ (không commit)
└── uploads/                   # Tệp tải lên cục bộ (không commit)
```

Các lệnh `npm run dev`, `npm run build` và `npm start` sử dụng server Node.js ở thư mục gốc. Thư mục `backend/` là backend FastAPI riêng, không được các lệnh npm trên tự khởi chạy.

### Chạy backend FastAPI riêng (tùy chọn)

Backend này cần Python 3.10 trở lên và một máy chủ MySQL đã tạo sẵn database. Các bước sau chạy backend độc lập với ứng dụng Node.js:

```bash
cd backend
python -m venv .venv
```

Kích hoạt môi trường ảo:

**Windows PowerShell**

```powershell
.\.venv\Scripts\Activate.ps1
```

**macOS/Linux**

```bash
source .venv/bin/activate
```

Cài thư viện, tạo file cấu hình và chạy API:

```bash
python -m pip install -r requirements.txt
```

**Windows PowerShell**

```powershell
Copy-Item .env.example .env
```

**macOS/Linux**

```bash
cp .env.example .env
```

Chỉnh `.env` với thông tin MySQL thực tế; thay `DB_PASSWORD`, `SECRET_KEY` và `GEMINI_API_KEY` bằng giá trị riêng. Sau đó chạy:

```bash
uvicorn app.main:app --reload
```

API docs có tại [http://localhost:8000/docs](http://localhost:8000/docs), health check tại [http://localhost:8000/api/health](http://localhost:8000/api/health). Backend sẽ tạo các bảng trong database khi khởi động, nhưng database MySQL phải được tạo trước.

## Xử lý sự cố

- **Không mở được ứng dụng:** kiểm tra Node.js/npm đã cài và cổng `3000` chưa bị chương trình khác sử dụng.
- **Tính năng Gemini không hoạt động:** kiểm tra `GEMINI_API_KEY` trong `.env`, rồi khởi động lại server.
- **Google sign-in errors:** check the Google provider and redirect URLs in Supabase Auth.
- **Google sign-in errors:** check the Google provider and redirect URLs in Supabase Auth.
