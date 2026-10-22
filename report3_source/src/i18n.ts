export type Language = 'vi' | 'en';

const messages = {
  vi: {
    subtitle: 'Trợ lý học tập thông minh & Ôn thi',
    dashboard: 'Tổng quan', documents: 'Tài liệu học tập', chat: 'Trợ lý Aura AI',
    quizzes: 'Thi & Trắc nghiệm', flashcards: 'Flashcard', workspace: 'Không gian học tập',
    copilot: 'Aura Copilot', copilotDesc: 'Tải lên tài liệu PDF hoặc TXT để tra cứu và tạo đề trắc nghiệm.', manageDocs: 'Quản lý tài liệu',
    student: 'Sinh viên', account: 'Tài khoản', profile: 'Cài đặt hồ sơ', logout: 'Đăng xuất',
    login: 'Đăng nhập', profileTitle: 'Cài đặt hồ sơ', profileSubtitle: 'Cập nhật thông tin tài khoản của bạn.',
    fullName: 'Họ và tên', email: 'Email', language: 'Ngôn ngữ', avatar: 'Ảnh đại diện',
    changeAvatar: 'Chọn ảnh', avatarHint: 'PNG, JPG, WEBP hoặc GIF · Tối đa 3 MB',
    cancel: 'Hủy', save: 'Lưu thay đổi', saving: 'Đang lưu...', viName: 'Tiếng Việt', enName: 'English',
    saved: 'Đã cập nhật hồ sơ.'
  },
  en: {
    subtitle: 'Your AI study and exam preparation assistant',
    dashboard: 'Dashboard', documents: 'Study documents', chat: 'Aura AI assistant',
    quizzes: 'Quizzes & Exams', flashcards: 'Flashcards', workspace: 'Study workspace',
    copilot: 'Aura Copilot', copilotDesc: 'Upload PDF or TXT files to ask questions and create quizzes.', manageDocs: 'Manage documents',
    student: 'Student', account: 'Account', profile: 'Profile settings', logout: 'Sign out',
    login: 'Sign in', profileTitle: 'Profile settings', profileSubtitle: 'Update your account details.',
    fullName: 'Full name', email: 'Email', language: 'Language', avatar: 'Profile photo',
    changeAvatar: 'Choose photo', avatarHint: 'PNG, JPG, WEBP, or GIF · Up to 3 MB',
    cancel: 'Cancel', save: 'Save changes', saving: 'Saving...', viName: 'Tiếng Việt', enName: 'English',
    saved: 'Profile updated.'
  }
} as const;

export type TranslationKey = keyof typeof messages.vi;

export function translate(language: Language | undefined, key: TranslationKey): string {
  return messages[language === 'en' ? 'en' : 'vi'][key];
}

const vietnameseToEnglish: Record<string, string> = {
  'Đang tải dữ liệu học tập tổng quan...': 'Loading your learning dashboard...',
  'Hệ Thống Trợ Lý Học Tập AuraStudy': 'AuraStudy Learning Assistant',
  'Học thông minh hơn cùng Generative AI & RAG': 'Study smarter with Generative AI & RAG',
  'Tải tài liệu môn học, trò chuyện trực tiếp với trợ lý thông minh để tóm tắt bài giảng và tự động sinh đề trắc nghiệm chuẩn kiến thức.': 'Upload course materials, ask the AI assistant questions, summarize lessons, and generate knowledge-based quizzes.',
  'Tải lên tài liệu mới': 'Upload new document', 'Hỏi đáp Aura AI': 'Ask Aura AI',
  'Tài liệu học tập': 'Study documents', 'Đã số hóa RAG': 'Indexed for RAG',
  'Câu hỏi RAG đã hỏi': 'Questions asked', 'Hỏi đáp AI': 'AI questions',
  'Bài thi đã hoàn thành': 'Quizzes completed', 'Lượt kiểm tra': 'Attempts',
  'Điểm số trung bình': 'Average score', 'Loại Giỏi': 'Excellent', 'Loại Khá': 'Good', 'Đang cải thiện': 'Improving',
  'Tài liệu học tập gần đây': 'Recent study documents', 'Các giáo trình và tài liệu đã được chỉ mục hóa': 'Course materials and documents indexed for study',
  'Xem tất cả': 'View all', 'Chưa có tài liệu nào được tải lên': 'No documents uploaded yet',
  'Tải tài liệu PDF hoặc TXT đầu tiên để bắt đầu học': 'Upload your first PDF or TXT to get started', 'Tải tài liệu ngay': 'Upload a document',
  'Hỏi AI': 'Ask AI', 'Tạo Quiz': 'Create quiz', 'Biểu đồ điểm số ôn luyện': 'Study score history',
  'Tiến trình các bài thi trắc nghiệm theo thời gian': 'Quiz scores over time', 'Tự động đánh giá': 'Automatic tracking',
  'Chưa có bài thi trắc nghiệm nào để vẽ biểu đồ.': 'Complete a quiz to see your score history.',
  'Lịch sử bài thi': 'Quiz history', 'Kết quả làm bài gần nhất': 'Your latest quiz results',
  'Bạn chưa hoàn thành bài thi nào': 'You have not completed a quiz yet', 'Phương pháp Active Recall': 'Active recall method',
  'Sau khi học lý thuyết, hãy dùng tính năng': 'After studying the material, use',
  'để thử thách bản thân. Ôn tập lặp lại ngắt quãng (Spaced Repetition) giúp ghi nhớ dài hạn gấp 3 lần so với chỉ đọc lại tài liệu!': 'to test yourself. Spaced repetition can improve long-term retention compared with rereading.',
  'Thư viện tài liệu học tập': 'Study document library', 'Tải tài liệu mới': 'Upload document',
  'Đang tải danh sách tài liệu...': 'Loading documents...', 'Chưa tìm thấy tài liệu phù hợp': 'No matching documents found',
  'Hỏi Aura AI': 'Ask Aura AI', 'Tóm tắt nội dung': 'Summarize', 'Tạo đề thi trắc nghiệm': 'Create quiz',
  'Tải tài liệu học tập mới': 'Upload a study document', 'Hỗ trợ các định dạng .pdf, .txt, .docx': 'Supported formats: .pdf, .txt, .docx',
  'Tệp tài liệu (PDF, DOCX, TXT, MD)': 'Document file (PDF, DOCX, TXT, MD)',
  'Tiêu đề giáo trình / bài giảng': 'Course material / lesson title', 'Môn học / Chuyên ngành': 'Subject / field of study',
  'Xử lý & Tải lên': 'Process & upload', 'Đang đọc nội dung bài học...': 'Reading document content...',
  'Hỏi đáp AI với tài liệu này': 'Ask AI about this document', 'Tóm tắt thông minh Aura AI': 'Aura AI smart summary',
  'Aura AI đang đọc và phân tích chuyên sâu nội dung bài giảng...': 'Aura AI is reading and analyzing the study material...',
  'Tổng quan nội dung:': 'Overview:', 'Ý chính cần nắm vững:': 'Key points:',
  'Khái niệm và thuật ngữ quan trọng:': 'Important concepts and terms:', 'Kết luận:': 'Conclusion:', 'Từ khóa:': 'Keywords:',
  'Xác nhận xóa tài liệu?': 'Delete this document?', 'Hành động này không thể hoàn tác': 'This action cannot be undone', 'Xác nhận xóa': 'Confirm delete',
  'Tìm theo tên bài giảng, môn học...': 'Search by lesson or subject...', 'Xem nội dung chi tiết': 'View details', 'Xóa tài liệu': 'Delete document', 'Bỏ chọn tệp': 'Remove file',
  'Ví dụ: Hệ Quản Trị CSDL - Chương 5': 'Example: Database Systems - Chapter 5', 'Ví dụ: Cơ sở dữ liệu, Mạng máy tính...': 'Example: Databases, Computer Networks...',
  'Tệp quá lớn. Vui lòng chọn tệp dung lượng dưới 25MB.': 'File is too large. Choose a file under 25 MB.',
  'Bạn cần đăng nhập để tải tài liệu lên hệ thống.': 'Sign in to upload documents.',
  'Vui lòng chọn tệp tài liệu (PDF, TXT, DOCX, PPTX, MD).': 'Choose a document file (PDF, TXT, DOCX, PPTX, or MD).',
  'Lỗi khi tải lên tài liệu.': 'Could not upload the document.',
  '🔍 Tìm kiếm thông minh trên tất cả tài liệu ({documents.length} bài)': '🔍 Search all documents ({documents.length})',
  'Tạo đề thi từ bài này': 'Create a quiz from this document', 'Bạn': 'You',
  'Aura AI đang tra cứu tài liệu & đối chiếu kiến thức...': 'Aura AI is searching your documents and checking the answer...',
  'Làm mới cuộc trò chuyện': 'Reset conversation', 'Trích dẫn nguồn tài liệu đối chiếu': 'Document references',
  'Gợi ý câu hỏi tiếp theo:': 'Suggested follow-up questions:',
  'Chưa có đề thi nào': 'No quizzes yet', 'Đang tải danh sách bài thi...': 'Loading quizzes...', 'Tạo đề thi': 'Create quiz',
  'Danh sách câu hỏi:': 'Questions:', 'Câu trước': 'Previous', 'Câu tiếp theo': 'Next', 'Tiến độ:': 'Progress:',
  'Nộp bài': 'Submit quiz', 'Thang điểm 100': 'Score out of 100', 'Phân tích năng lực & Lỗ hổng kiến thức từ Aura AI': 'Aura AI performance and knowledge gap analysis',
  'Chủ đề bài học cần xem lại kỹ:': 'Topics to review:', 'Chi tiết từng câu hỏi & Lời giải:': 'Question details and explanations:',
  'Làm lại bài này': 'Retake this quiz', 'Số câu hỏi': 'Questions', 'Điểm cao nhất': 'Best score', 'Bắt đầu làm bài': 'Start quiz',
  'Tạo đề từ tài liệu': 'Generate from a document', 'Dùng Aura AI tạo 3, 5, 10 hoặc 15 câu từ tài liệu học tập.': 'Use Aura AI to generate 3, 5, 10, or 15 questions from a study document.',
  'Tài liệu nguồn': 'Source document', '-- Chọn tài liệu trong thư viện --': '-- Select a library document --', 'Độ khó đề thi': 'Quiz difficulty',
  'Cơ bản (Easy)': 'Easy', 'Trung bình (Medium)': 'Medium', 'Nâng cao (Hard)': 'Hard', 'Số lượng câu hỏi': 'Number of questions',
  '3 câu hỏi nhanh': '3 quick questions', '5 câu hỏi tiêu chuẩn': '5 standard questions', '10 câu hỏi tổng quát': '10 comprehensive questions', '15 câu hỏi chuyên sâu': '15 in-depth questions',
  'Bộ tạo câu hỏi trọng tâm & đa dạng': 'Focused, varied question generation', 'Khởi tạo đề thi bằng AI': 'Generate quiz with AI',
  'Đã có trong thư viện': 'In your library', 'PDF, DOCX hoặc TXT · tối đa 25 MB': 'PDF, DOCX, or TXT · up to 25 MB',
  'Lưu ý khi chuẩn bị file': 'File preparation tips',
  'Đánh số từng câu; mỗi lựa chọn để riêng một dòng và bắt đầu bằng A., B., C., D. (có thể tiếp tục đến Z.).': 'Number each question. Put each choice on its own line, labeled A., B., C., D. (through Z. if needed).',
  'Đặt đáp án đúng ngay dưới câu theo dạng “Đáp án: B”, hoặc đánh dấu lựa chọn đúng bằng ✓, [x], “(Đúng)” hay “(Correct)”.': 'Put the answer below each question as “Answer: B”, or mark the correct choice with ✓, [x], “(Correct)”, or a similar label.',
  'Nếu đáp án ở cuối file, ghi rõ “Đáp án” rồi ghép số câu với chữ cái, ví dụ: “1A - 2C - 3B”; có thể để nhiều cặp trên một dòng hoặc mỗi dòng riêng.': 'For an answer key at the end, add an “Answer Key” heading and pair question numbers with letters, e.g. “1A - 2C - 3B”. You can put multiple pairs on one line or use separate lines.',
  'Với bảng, nên có cột riêng cho số câu và đáp án. Mỗi câu cần có một đáp án hợp lệ khớp với nhãn lựa chọn.': 'For tables, use separate columns for question number and answer. Every answer must match one of the choice labels.',
  'Xác nhận xóa bộ đề thi?': 'Delete this quiz?', 'Ví dụ: Cú pháp điều khiển, so sánh match vs switch, kiểu dữ liệu...': 'Example: control flow, match vs. switch, data types...',
  'Ôn tập flashcard': 'Flashcard study', 'Câu hỏi': 'Question', 'Trả lời': 'Answer', 'Nhấn để lật thẻ · Space': 'Click to flip · Space',
  'Nhấn để xem lại câu hỏi': 'Click to see the question again', 'Trước': 'Previous', 'Sau': 'Next', 'Chưa nhớ': 'Still learning', 'Đã nhớ': 'Know it',
  'Không gian ghi nhớ': 'Your study space', 'Tạo bộ thẻ theo cách của bạn hoặc để Aura AI rút ra kiến thức chính từ tài liệu.': 'Create your own flashcards or let Aura AI extract key ideas from your documents.',
  'Tạo bộ flashcard': 'Create a flashcard set', 'Đang tải bộ thẻ...': 'Loading flashcard sets...', 'Học ngay': 'Study now',
  'Chưa có bộ flashcard nào': 'No flashcard sets yet', 'Tạo thẻ thủ công cho những kiến thức cần nhớ hoặc chọn tài liệu để Aura AI tạo bản nháp cho bạn.': 'Create cards manually or choose a document and let Aura AI draft them for you.',
  'Tạo bộ đầu tiên': 'Create your first set', 'Tạo thủ công': 'Create manually', 'Tự viết câu hỏi và câu trả lời cho từng thẻ.': 'Write the prompt and answer for each card.',
  'Tạo bằng Aura AI': 'Create with Aura AI', 'Chọn tài liệu để tạo bản nháp rồi tự chỉnh sửa.': 'Choose a document, review the draft, and edit it.',
  'Chọn tài liệu học tập': 'Choose a study document', 'Chọn tài liệu trong thư viện': 'Choose a document from your library',
  'Bạn cần có tài liệu đã xử lý xong trong thư viện trước.': 'You need a processed document in your library first.',
  'Đang tạo bản nháp...': 'Generating draft...', 'Tạo bản nháp flashcard': 'Generate flashcard draft',
  'Chọn tài liệu khác': 'Choose another document', 'Tên bộ thẻ': 'Set name', 'Môn học': 'Subject', '(không bắt buộc)': '(optional)',
  'Ghi chú ngắn về bộ thẻ': 'A short note about this set', 'Thẻ': 'Cards', 'Thêm thẻ': 'Add card', 'Mặt trước': 'Front', 'Mặt sau': 'Back',
  'Câu hỏi hoặc thuật ngữ': 'Question or term', 'Câu trả lời hoặc giải thích': 'Answer or explanation', 'Đổi cách tạo': 'Change creation method',
  'Đang lưu...': 'Saving...', 'Lưu thay đổi': 'Save changes', 'Xác nhận và lưu bộ thẻ': 'Confirm and save set',
  'Chỉnh sửa bộ thẻ': 'Edit flashcard set',
  'Chọn cách phù hợp để bắt đầu bộ thẻ.': 'Choose how you want to create your set.', 'Xem lại và chỉnh sửa nội dung trước khi lưu.': 'Review and edit the cards before saving.',
  'Aura AI đã tạo': 'Aura AI created', 'thẻ. Hãy xem lại trước khi lưu.': 'cards. Review them before saving.',
  'Bộ thẻ này chưa có flashcard.': 'This set does not contain any cards.', 'Đã hoàn thành lượt ôn tập. Bạn có thể tiếp tục ôn hoặc quay lại bộ thẻ.': 'Review complete. Continue studying or return to your sets.',
  'Đã cập nhật bộ flashcard.': 'Flashcard set updated.', 'Đã lưu bộ flashcard.': 'Flashcard set saved.', 'Đã xóa bộ flashcard.': 'Flashcard set deleted.',
  'Hãy nhập tên cho bộ flashcard.': 'Enter a name for this flashcard set.', 'Mỗi thẻ cần có đủ mặt trước và mặt sau.': 'Each card needs both a front and a back.',
  'Không thể lưu bộ flashcard.': 'Could not save the flashcard set.', 'Không thể mở bộ thẻ để chỉnh sửa.': 'Could not open the set for editing.', 'Không thể tải bộ flashcard.': 'Could not load this flashcard set.',
  'Không lưu được tiến độ ôn tập.': 'Could not save study progress.', 'Không thể xóa bộ flashcard.': 'Could not delete the flashcard set.',
  'Chọn tài liệu trong thư viện để Aura AI tạo thẻ.': 'Choose a library document for Aura AI to create cards from.',
  'Aura AI chưa tạo được flashcard.': 'Aura AI could not create flashcards.', 'Đã xóa bộ flashcard': 'Flashcard set deleted', 'Mô tả': 'Description',
  'Tải lên tài liệu': 'Upload document', 'Đang xử lý': 'Processing', 'Sẵn sàng': 'Ready', 'Lỗi': 'Error',
  '\u0047\u1eedi tin nh\u1eafn': 'Send message',
  '\u0058\u00f3a b\u1ed9 \u0111\u1ec1': 'Delete quiz',
  '\u0046ile nh\u1eadp c\u0169ng \u0111\u01b0\u1ee3c l\u01b0u trong Th\u01b0 vi\u1ec7n t\u00e0i li\u1ec7u \u0111\u1ec3 b\u1ea1n c\u00f3 th\u1ec3 xem l\u1ea1i.': 'The imported file is also saved in your document library for later reference.',
  '\u0058\u00f3a b\u1ed9 th\u1ebb': 'Delete flashcard set',
  '\u0110\u00f3ng': 'Close',
  '\u0056\u00ed d\u1ee5: Kh\u00e1i ni\u1ec7m m\u1ea1ng m\u00e1y t\u00ednh': 'Example: Computer networking concepts',
  '\u0056\u00ed d\u1ee5: M\u1ea1ng m\u00e1y t\u00ednh': 'Example: Computer networks'
,
  '\u004c\u00e0m \u0111\u1ec1 tr\u1eafc nghi\u1ec7m': 'Take a quiz',
  '\u0054\u1ea1o b\u00e0i ki\u1ec3m tra ngay': 'Start a quiz now',
  '\u0054\u1ea1o \u0111\u1ec1 tr\u1eafc nghi\u1ec7m b\u1eb1ng AI': 'Generate an AI quiz'

};

export function translateText(language: Language | string | undefined, text: string): string {
  if (language !== 'en') return text;
  let legacyText = text;
  try {
    const bytes = new TextEncoder().encode(text);
    legacyText = new TextDecoder('windows-1252').decode(bytes);
  } catch {
    // Keep the original text if the browser does not support this decoder.
  }
  const exact = vietnameseToEnglish[text] || vietnameseToEnglish[legacyText];
  if (exact) return exact;
  const patterns: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
    [/^Flashcard - (.+)$/, (m) => `Flashcards - ${m[1]}`],
    [/^Ví dụ: (.+)$/, (m) => `Example: ${m[1]}`],
    [/^Câu (\d+) \/ (\d+)$/, (m) => `Card ${m[1]} / ${m[2]}`],
    [/^Thẻ (\d+) \/ (\d+)$/, (m) => `Card ${m[1]} / ${m[2]}`],
    [/^Thẻ \((\d+)\)$/, (m) => `Cards (${m[1]})`],
    [/^Tài liệu: (.+) • (\d+) câu hỏi$/, (m) => `Document: ${m[1]} • ${m[2]} questions`],
    [/^Môn học: (.+) • Tệp: (.+)$/, (m) => `Subject: ${m[1]} • File: ${m[2]}`],
    [/^Hỏi bất kỳ điều gì về "(.+)"\.\.\. \(Enter để gửi\)$/, (m) => `Ask anything about "${m[1]}"... (Enter to send)`],
    [/^Đặt câu hỏi về kiến thức, bài giảng hoặc yêu cầu giải thích thuật ngữ\.\.\. \(Enter để gửi\)$/, () => 'Ask about a concept or lesson, or request an explanation... (Enter to send)'],
    [/^(.+) \((\d+) bài\)$/, (m) => `${m[1]} (${m[2]} items)`],
    [/^Tiến độ: (\d+)\/(\d+) câu$/, (m) => `Progress: ${m[1]}/${m[2]} questions`],
    [/^Nộp bài \((\d+)\/(\d+)\)$/, (m) => `Submit (${m[1]}/${m[2]})`],
    [/^Câu (\d+)$/, (m) => `Question ${m[1]}`],
    [/^• Câu (\d+)$/, (m) => `• Question ${m[1]}`],
    [/^(\d+) câu$/, (m) => `${m[1]} questions`],
    [/^Tạo quiz từ file đã tải lên$/, () => 'Create quiz from uploaded file'],
    [/^Tạo quiz từ file câu hỏi trắc nghiệm$/, () => 'Create quiz from multiple-choice exam file'],
    [/^File nhập cũng được lưu trong Thư viện tài liệu để bạn có thể xem lại\.$/, () => 'The imported file is also saved in your document library for later reference.'],
    [/^Đã nhập (\d+) câu hỏi\. Bộ đề đã sẵn sàng để làm\.$/, (m) => `Imported ${m[1]} questions. Your quiz is ready.`],
    [/^Xóa bộ flashcard “(.+)” và toàn bộ tiến độ ôn tập\?$/, (m) => `Delete “${m[1]}” and all study progress?`],
    [/^Đã nhớ (\d+) \/ (\d+) thẻ trong bộ$/, (m) => `Known: ${m[1]} / ${m[2]} cards`],
    [/^Ví dụ: (.+)$/, (m) => `Example: ${m[1]}`],
    [/^(.+) · (PDF|DOCX|TXT|PPTX|MD)$/, (m) => `${m[1]} · ${m[2]}`]
  ];
  for (const candidate of [text, legacyText]) {
    for (const [pattern, replace] of patterns) {
      const match = candidate.match(pattern);
      if (match) return replace(match);
    }
  }
  return text;
}
