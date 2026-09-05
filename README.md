# 🇬🇧 Learn English - Chrome Extension Hỗ Trợ Học Tiếng Anh Với Gemini AI

**Learn English** là một tiện ích mở rộng (Chrome Extension) hỗ trợ học tiếng Anh thông minh dành cho người Việt, tích hợp AI (Google Gemini API) để giúp tra cứu phát âm IPA, giải nghĩa cụm từ, so sánh từ đồng nghĩa và hướng dẫn sử dụng từ theo đúng ngữ cảnh.

---

## ✨ Tính Năng Nổi Bật

- 🌐 **Dịch thuật Google Dịch (Chuẩn Google Translate)**: Tích hợp API Google Dịch trực tiếp (không cần cấu hình AI key), chọn ngôn ngữ nguồn/đích, tự động phát hiện ngôn ngữ, cung cấp phiên âm, phát âm âm thanh và tra cứu toàn bộ các nghĩa khác theo từ loại (danh từ, động từ, tính từ,... kèm các từ liên quan).
- 🗣️ **Tra cứu phát âm IPA chuẩn Anh - Mỹ**: Cung cấp phiên âm IPA, mô tả chi tiết vị trí lưỡi/môi/hơi để đọc đúng và cảnh báo các từ dễ gây nhầm lẫn.
- 📖 **Giải nghĩa cụm từ (Phrasal Verbs & Idioms)**: Phân tích nghĩa đen từng từ, nghĩa thực tế và cung cấp cách liên tưởng hình ảnh/logic giúp ghi nhớ lâu.
- 💡 **Cách dùng từ theo ngữ cảnh**: Giải thích ngữ cảnh nên sử dụng kèm ví dụ minh họa và các ghi chú về sắc thái (trang trọng/thân mật/chuyên ngành).
- ⚖️ **So sánh từ gần nghĩa**: Phân biệt điểm khác biệt giữa 2 từ gần nghĩa (ví dụ: `search` vs `seek`), hướng dẫn khi nào nên dùng từ A thay vì từ B.
- 🌿 **Word Family (Họ từ & Collocations)**: Mở rộng toàn bộ các biến thể từ loại xung quanh một từ (Danh từ, Động từ, Tính từ, Trạng từ) kèm phiên âm IPA, nghĩa tiếng Việt, phát âm mẫu và gợi ý các cụm từ/giới từ thường đi kèm (Collocations).
- ⌨️ **Hệ thống phím tắt tiện lợi**:
  - `Ctrl + Shift + E`: Mở nhanh tiện ích Learn English từ bất kỳ trang web nào trên trình duyệt.
  - `Alt + 1` đến `Alt + 7`: Chuyển đổi nhanh giữa 7 tab tính năng.
  - `Enter` / `Ctrl + Enter`: Tra cứu / Dịch tức thì không cần dùng chuột.
  - `Alt + S`: Nghe phát âm kết quả hiện tại ngay lập tức.
  - `Escape`: Xóa nhanh nội dung ô tìm kiếm.

---

## 🚀 Hướng Dẫn Cài Đặt Tiện Ích Vào Trình Duyệt

Tiện ích hỗ trợ tất cả các trình duyệt chạy nhân Chromium như **Google Chrome**, **Microsoft Edge**, **Brave**, **Cốc Cốc**,...

### Bước 1: Tải mã nguồn tiện ích

Bạn có thể chọn 1 trong 2 cách sau:

- **Cách A (Dùng Git):** Mở Terminal/Command Prompt và chạy lệnh:
  ```bash
  git clone https://github.com/tientho201/Learn-English.git
  ```
- **Cách B (Tải file ZIP):**
  1. Truy cập trang GitHub repository: [https://github.com/tientho201/Learn-English](https://github.com/tientho201/Learn-English)
  2. Bấm vào nút **Code** ➔ Chọn **Download ZIP**.
  3. Giải nén file ZIP vừa tải về vào một thư mục trên máy tính.

### Bước 2: Thêm tiện ích vào trình duyệt

1. Mở trình duyệt Chrome (hoặc Edge, Brave, Cốc Cốc,...).
2. Truy cập vào trang quản lý tiện ích bằng cách nhập đường dẫn sau lên thanh địa chỉ:
   - Đối với **Chrome / Brave / Cốc Cốc**: `chrome://extensions/`
   - Đối với **Microsoft Edge**: `edge://extensions/`
3. Bật **Chế độ dành cho nhà phát triển (Developer mode)** ở góc trên bên phải màn hình.
4. Nhấn nút **Tải tiện ích đã giải nén (Load unpacked)** ở góc trên bên trái.
5. Chọn thư mục `Learn-English` mà bạn đã tải/giải nén ở Bước 1.

🎉 _Chúc mừng! Tiện ích **Learn English** đã được thêm vào trình duyệt thành công._

---

## ⚙️ Cấu Hình API Key (Google Gemini hoặc OpenAI)

Bạn có thể sử dụng **Google Gemini** (miễn phí) hoặc **OpenAI** (ChatGPT) tùy nhu cầu:

### Cách 1: Sử dụng Google Gemini (Khuyên dùng - Miễn phí)

1. Truy cập vào [Google AI Studio (aistudio.google.com)](https://aistudio.google.com/).
2. Đăng nhập tài khoản Google và nhấn nút **Get API key** ➔ **Create API key**.
3. Sao chép (Copy) đoạn mã API Key (dạng `AIzaSy...`).
4. Mở **Cài đặt** của tiện ích ➔ Dán vào ô **Gemini API Key** ➔ Nhấn **Kiểm tra kết nối Gemini** để xác nhận ➔ Bấm **Lưu cài đặt**.
5. Model mặc định: `gemini-3.1-flash-lite`.

### Cách 2: Sử dụng OpenAI (ChatGPT)

1. Truy cập vào [OpenAI Platform API Keys](https://platform.openai.com/api-keys).
2. Tạo Secret Key (dạng `sk-proj-...`).
3. Mở **Cài đặt** của tiện ích ➔ Dán vào ô **OpenAI API Key** ➔ Tích chọn **Sử dụng OpenAI làm AI xử lý chính** ➔ Nhấn **Kiểm tra kết nối OpenAI** ➔ Bấm **Lưu cài đặt**.
4. Model mặc định: `gpt-4o-mini`.

---

## 🛠️ Công Nghệ Sử Dụng

- **Manifest V3** - Tiêu chuẩn Chrome Extension mới nhất.
- **HTML5 / Vanilla CSS / JavaScript (ES6+)** - Giao diện hiện đại, tối ưu và siêu nhẹ, không phụ thuộc thư viện ngoài.
- **Google Gemini REST API & OpenAI Chat Completions API** - Hỗ trợ song song 2 nhà cung cấp AI hàng đầu thế giới với định dạng phản hồi JSON chuẩn hóa.

---

## 📄 Giấy Phép (License)

Dự án phát triển mã nguồn mở phục vụ mục đích học tập và chia sẻ cộng đồng.
