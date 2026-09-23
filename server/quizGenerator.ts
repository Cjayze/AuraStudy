import { GoogleGenAI } from '@google/genai';
import { getDb, Document, Question, Quiz, ensureDocumentCleanText } from './db';

// Initialize Gemini Client
let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: apiKey.trim()
    });
  }
  return geminiClient;
}

export interface GeneratedQuestionItem {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_ans: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

export interface GenerateQuizResult {
  quiz: Quiz;
  questions: Question[];
}

/**
 * Filter and sanitize document content:
 * Strictly eliminates cover page metadata, administrative titles, lecturer names,
 * emails, course codes, credit counts, slide counters, and textbook lists.
 */
export function sanitizeContentForQuiz(rawText: string): string {
  if (!rawText) return '';
  const lines = rawText.split('\n');
  const cleanedLines: string[] = [];

  const metaPrefixRegex = /^(trường|đại học|khoa|viện|bộ môn|học viện|giảng viên|gvhd|gv|tiến sĩ|thạc sĩ|ts\.|ths\.|pgs\.|gs\.|email|sđt|điện thoại|biên soạn|tác giả|sinh viên|mã học phần|học phần|mã môn|tín chỉ|tiết|buổi \d+|slide \d+|-- \d+ of \d+ --|cse\d+|học liệu|giáo trình tham khảo|tài liệu tham khảo|mục tiêu bài học|chuẩn đầu ra|nội dung chính của buổi)/i;

  const metadataKeywordsRegex = /(nguyễn văn tánh|tanh\.nguyenvan|phenikaa|bách khoa|duckett|lockhart|hoffman|cse702|@phenikaa|gmail\.com|edu\.vn)/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.length < 4) continue;
    if (metaPrefixRegex.test(trimmed)) continue;
    if (metadataKeywordsRegex.test(trimmed)) continue;
    if (/^(http:\/\/|https:\/\/|www\.)/i.test(trimmed)) continue;
    if (/^[•\-*]?\s*(buổi|slide|trang|page)\s*\d+/i.test(trimmed)) continue;
    cleanedLines.push(trimmed);
  }

  return cleanedLines.join('\n');
}

/**
 * Check if a text snippet is genuine human-readable content
 */
function isHumanReadable(str: string): boolean {
  if (!str || str.trim().length < 3) return false;
  if (str.includes('\uFFFD') || str.includes('%PDF-') || str.includes('obj<<')) return false;
  const cleanMatches = str.match(/[\p{L}\p{N}\s.,:;!?'"()\-–—/%_+=<>*&[\]{}]/gu) || [];
  return cleanMatches.length / str.length >= 0.85;
}

// Stop words and pronouns that should never be selected as a question topic
const STOP_WORDS = new Set([
  'đây', 'đó', 'kia', 'chúng', 'nó', 'họ', 'tôi', 'bạn', 'mình', 'ai',
  'bài', 'tài liệu', 'nội dung', 'phần', 'chương', 'mục', 'buổi', 'slide',
  'trang', 'hình', 'bảng', 'ví dụ', 'chú ý', 'lưu ý', 'tổng quan',
  'hiện nay', 'theo đó', 'tuy nhiên', 'ngoài ra', 'do đó', 'vì vậy',
  'bởi vì', 'mặc dù', 'như vậy', 'khi đó', 'nếu như', 'sau đó',
  'các', 'những', 'một', 'mọi', 'tất cả', 'mỗi', 'từng', 'vài',
  'thứ', 'ngày', 'năm', 'tháng', 'thời gian', 'kết quả', 'thực hành',
  'giới thiệu', 'kết luận', 'mục tiêu', 'yêu cầu', 'đề mục', 'tiêu đề'
]);

/**
 * Check if a concept is an authentic academic/technical concept,
 * strictly rejecting personal names, university names, pronouns and administrative markers.
 */
function isAcademicConcept(concept: string): boolean {
  if (!concept) return false;
  const clean = concept.trim().toLowerCase();
  if (clean.length < 3 || clean.length > 50) return false;

  if (STOP_WORDS.has(clean)) return false;

  // Check if starts with a stop word followed by a space
  for (const sw of Array.from(STOP_WORDS)) {
    if (clean === sw || clean.startsWith(sw + ' ')) {
      return false;
    }
  }

  const bannedTerms = [
    'giảng viên', 'gv', 'thầy', 'cô', 'ts.', 'tiến sĩ', 'thạc sĩ', 'pgs', 'gs.',
    'tác giả', 'biên soạn', 'email', 'sđt', 'điện thoại', 'phenikaa', 'bách khoa',
    'đại học', 'trường', 'khoa', 'viện', 'học phần', 'tín chỉ', 'tiết', 'buổi',
    'slide', 'cse', 'học liệu', 'giáo trình', 'duckett', 'lockhart', 'hoffman',
    'tham khảo', 'http', 'sinh viên', 'năm học', 'mục tiêu', 'nội dung buổi',
    'kỳ học', 'thực hành lab', 'mã môn', 'giới thiệu', 'lớp', 'nguyễn văn', 'tanh'
  ];

  for (const term of bannedTerms) {
    if (clean.includes(term)) {
      return false;
    }
  }

  return /[a-zA-Z\p{L}]/u.test(clean);
}

/**
 * Generate Multiple-Choice Quiz questions using Gemini Models
 * with smart heuristic fallback for offline/timeout resilience.
 */
export async function generateQuizFromDocument(options: {
  documentId: string;
  userId: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  questionCount?: number;
  customTopic?: string;
}): Promise<GenerateQuizResult> {
  const {
    documentId,
    userId,
    difficulty = 'medium',
    questionCount = 5,
    customTopic
  } = options;

  const db = getDb();
  const doc = db.documents.find(d => d.id === documentId);
  if (!doc) {
    throw new Error('Tài liệu học tập không tồn tại trong hệ thống.');
  }

  // Ensure document text is clean and not corrupted by binary raw bytecode
  const fullContent = await ensureDocumentCleanText(doc);

  // Filter out headers, lecturer names, emails, and course meta
  const sanitizedContent = sanitizeContentForQuiz(fullContent) || fullContent;

  const ai = getGeminiClient();
  let generatedTitle = `Đề trắc nghiệm: ${doc.title} (${questionCount} câu - ${difficulty.toUpperCase()})`;
  let questionItems: GeneratedQuestionItem[] = [];

  const difficultyDesc = {
    easy: 'Mức độ Cơ bản: Nhận biết, định nghĩa khái niệm cốt lõi, cú pháp cơ bản và tính chất nền tảng.',
    medium: 'Mức độ Trung bình: Thông hiểu, so sánh các cơ chế, phân tích đoạn mã và ứng dụng quy tắc chuẩn.',
    hard: 'Mức độ Nâng cao: Vận dụng cao, phát hiện bẫy trắc nghiệm, tình huống tối ưu hóa và bảo mật chuyên sâu.'
  }[difficulty];

  if (ai && sanitizedContent.trim().length > 0) {
    const prompt = `
Dưới đây là tài liệu chuyên môn bài học:
---
TIÊU ĐỀ BÀI HỌC: ${doc.title}
MÔN HỌC: ${doc.subject || 'Công nghệ thông tin'}
NỘI DUNG TÀI LIỆU:
${sanitizedContent.slice(0, 12000)}
---

YÊU CẦU BIÊN SOẠN ĐỀ THI TRẮC NGHIỆM CHUYÊN NGHIỆP:
- Số lượng câu hỏi: CHÍNH XÁC ${questionCount} câu hỏi trắc nghiệm (mỗi câu gồm 4 phương án lựa chọn A, B, C, D).
- Độ khó: ${difficulty.toUpperCase()} (${difficultyDesc})
${customTopic ? `- Trọng tâm chủ đề cần tập trung: ${customTopic}` : ''}

QUY TẮC ĐẶC BIỆT QUAN TRỌNG (TUÂN THỦ TUYỆT ĐỐI):
1. AI TỰ BIÊN SOẠN 100% CÂU HỎI VÀ CẢ 4 PHƯƠNG ÁN ĐÁP ÁN:
   - TUYỆT ĐỐI KHÔNG cắt vụn, chắp vá hay copy nguyên si các câu gạch đầu dòng trong tài liệu (làm như vậy trông rất nghiệp dư và thô sơ).
   - Hãy đóng vai trò Giảng viên Đại học / Chuyên gia Khảo thí: Đọc hiểu bản chất kiến thức trong bài giảng, sau đó TỰ HÀNH VĂN, TỰ ĐẶT CÂU HỎI và TỰ VIẾT các phương án trả lời bằng câu văn hoàn chỉnh, gãy gọn, chuẩn sư phạm.
   - Cả 4 phương án A, B, C, D phải là các câu diễn đạt hoàn chỉnh, ngữ pháp chuẩn mực, cùng độ dài và phong cách biểu đạt.
   - Phương án gây nhiễu (distractors) phải do AI tự sáng tác một cách thông minh, logic, có tính phân loại cao (nghe rất hợp lý nhưng sai về nguyên tắc kỹ thuật hoặc phạm vi áp dụng), tránh các phương án ngô nghê.
2. LOẠI BỎ TRIỆT ĐỂ THÔNG TIN BÌA VÀ THỦ TỤC HÀNH CHÍNH:
   - Tuyệt đối KHÔNG hỏi về: Tên trường, tên khoa, tên giảng viên, tác giả, email, số điện thoại, mã môn học, số tín chỉ, số tiết, số thứ tự slide hay danh mục giáo trình.
   - Tập trung 100% vào kiến thức chuyên môn: Cơ chế hoạt động, cú pháp, thuật toán, phân tích đoạn mã, so sánh giải pháp, xử lý ngoại lệ và best practices.
3. ĐA DẠNG HÓA HÌNH THỨC CÂU HỎI:
   - Câu hỏi tình huống / Đoạn mã: "Xem xét đoạn mã / cú pháp sau, kết quả thực thi hoặc hành vi của hệ thống là gì?"
   - Câu hỏi so sánh / Phân biệt: "Điểm khác biệt cốt lõi giữa cơ chế X và cơ chế Y là gì?"
   - Câu hỏi nhận diện khẳng định SAI / Bẫy tư duy: "Phát biểu nào sau đây là KHÔNG CHÍNH XÁC khi nói về...?"
   - Câu hỏi thực hành chuẩn mực (Best Practice): "Để tối ưu hóa bảo mật / hiệu năng trong trường hợp này, giải pháp khuyến nghị là gì?"
4. PHÂN PHỐI ĐÁP ÁN VÀ GIẢI THÍCH CHI TIẾT:
   - Phân bố đồng đều và ngẫu nhiên vị trí đáp án đúng ('A', 'B', 'C', 'D'), không dồn vào một phương án duy nhất.
   - 'explanation': Phân tích chi tiết tại sao đáp án đúng lại chính xác, giải thích ngắn gọn nguyên nhân các phương án còn lại chưa đúng.

TRẢ VỀ DUY NHẤT ĐỊNH DẠNG JSON (không thêm markdown ngoài JSON) theo cấu trúc:
{
  "title": "Tiêu đề đề thi trắc nghiệm học thuật và súc tích",
  "questions": [
    {
      "question_text": "Nội dung câu hỏi được AI tự biên soạn hoàn chỉnh...",
      "option_a": "Phương án A hoàn chỉnh, trau chuốt",
      "option_b": "Phương án B hoàn chỉnh, trau chuốt",
      "option_c": "Phương án C hoàn chỉnh, trau chuốt",
      "option_d": "Phương án D hoàn chỉnh, trau chuốt",
      "correct_ans": "A",
      "explanation": "Giải thích sư phạm cặn kẽ về bản chất kiến thức..."
    }
  ]
}
`;

    // gemini-3.1-flash-lite is prioritized for ultra-fast generation and active free-tier quota
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];

    for (const modelName of candidateModels) {
      if (questionItems.length >= questionCount) break;

      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout quá 20 giây khi gọi model ${modelName}`)), 20000)
        );

        const geminiPromise = ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction: 'Bạn là chuyên gia khảo thí và sư phạm đại học cao cấp. Bạn tự biên soạn 100% câu hỏi và cả 4 đáp án theo phong cách đề thi quốc tế, tuyệt đối không cắt ghép câu chữ thô sơ từ tài liệu.',
            responseMimeType: 'application/json',
            temperature: 0.35
          }
        });

        const response = await Promise.race([geminiPromise, timeoutPromise]);
        const responseText = response.text?.trim() || '';

        if (responseText) {
          const parsed = JSON.parse(responseText);
          if (parsed.title) {
            generatedTitle = parsed.title;
          }
          if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
            // Filter out any accidental metadata questions
            const validQuestions = parsed.questions.filter((q: any) => {
              const text = (q.question_text || '').toLowerCase();
              return !text.includes('giảng viên') &&
                     !text.includes('email') &&
                     !text.includes('mã môn') &&
                     !text.includes('tín chỉ') &&
                     !text.includes('số tiết');
            });

            if (validQuestions.length > 0) {
              questionItems = validQuestions.map((q: any) => ({
                question_text: String(q.question_text || 'Câu hỏi kiến thức chuyên môn'),
                option_a: String(q.option_a || 'Phương án A'),
                option_b: String(q.option_b || 'Phương án B'),
                option_c: String(q.option_c || 'Phương án C'),
                option_d: String(q.option_d || 'Phương án D'),
                correct_ans: ['A', 'B', 'C', 'D'].includes(q.correct_ans?.toUpperCase())
                  ? (q.correct_ans.toUpperCase() as 'A' | 'B' | 'C' | 'D')
                  : 'A',
                explanation: String(q.explanation || 'Đáp án chính xác theo nguyên lý bài học.')
              }));
              break; // Successfully obtained questions from AI!
            }
          }
        }
      } catch (err: any) {
        console.warn(`[QuizGenerator] Model ${modelName} encountered error or timeout:`, err?.message || err);
      }
    }
  }

  // Fallback: If AI didn't return questions, use enhanced diversified heuristic generator
  if (questionItems.length === 0) {
    console.log('[QuizGenerator] Utilizing enhanced diversified heuristic generator...');
    questionItems = generateHeuristicQuestions(sanitizedContent, doc.title, questionCount);
  }

  // Ensure count matches questionCount
  if (questionItems.length > questionCount) {
    questionItems = questionItems.slice(0, questionCount);
  }

  // Create Quiz in DB
  const quizId = `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newQuiz: Quiz = {
    id: quizId,
    document_id: documentId,
    user_id: userId,
    title: generatedTitle,
    difficulty,
    total_questions: questionItems.length,
    created_at: new Date().toISOString()
  };

  const newQuestions: Question[] = questionItems.map((q, idx) => ({
    id: `q_${quizId}_${idx + 1}`,
    quiz_id: quizId,
    question_text: q.question_text,
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c,
    option_d: q.option_d,
    correct_ans: q.correct_ans,
    explanation: q.explanation
  }));

  db.quizzes.unshift(newQuiz);
  db.questions.push(...newQuestions);

  return {
    quiz: newQuiz,
    questions: newQuestions
  };
}

/**
 * Enhanced, diversified heuristic generator that:
 * 1. Strictly filters out titles, personal names, university names, emails, and header metadata.
 * 2. Focuses exclusively on core technical and conceptual assertions.
 * 3. Rotates across 6 distinct question templates for high variety.
 * 4. Generates plausible distractors from authentic material.
 * 5. Randomly distributes the correct answer across A, B, C, D.
 */
function generateHeuristicQuestions(
  content: string,
  docTitle: string,
  count: number
): GeneratedQuestionItem[] {
  // Pre-clean content
  const sanitized = sanitizeContentForQuiz(content);
  const lines = sanitized
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 20 && !l.startsWith('#') && isHumanReadable(l));

  // Extract candidate academic statements and definitions
  const candidateConcepts: Array<{ concept: string; definition: string; rawLine: string }> = [];

  for (const line of lines) {
    if (line.includes(':')) {
      const parts = line.split(':');
      const conceptCandidate = parts[0].replace(/^[-*•\d\.\s]+/, '').trim();
      const defCandidate = parts.slice(1).join(':').trim();

      if (
        isAcademicConcept(conceptCandidate) &&
        defCandidate.length > 15 &&
        isHumanReadable(defCandidate)
      ) {
        candidateConcepts.push({
          concept: conceptCandidate,
          definition: defCandidate,
          rawLine: line
        });
      }
    } else if (line.toLowerCase().includes(' là ') || line.toLowerCase().includes(' dùng để ')) {
      const splitWord = line.toLowerCase().includes(' là ') ? ' là ' : ' dùng để ';
      const parts = line.split(new RegExp(splitWord, 'i'));
      let conceptCandidate = parts[0].replace(/^[-*•\d\.\s]+/, '').trim();
      const defCandidate = (splitWord.trim() + ' ' + parts.slice(1).join(splitWord)).trim();

      // If concept candidate starts with demonstrative words like "Đây là tài liệu về X"
      if (conceptCandidate.toLowerCase().startsWith('đây là tài liệu') || conceptCandidate.toLowerCase().startsWith('tài liệu')) {
        const matchTopic = line.match(/(?:về|nghiên cứu|chuyên đề)\s+([^,.:]+)/i);
        if (matchTopic && matchTopic[1]) {
          conceptCandidate = matchTopic[1].trim();
        }
      }

      if (
        isAcademicConcept(conceptCandidate) &&
        defCandidate.length > 15 &&
        isHumanReadable(defCandidate)
      ) {
        candidateConcepts.push({
          concept: conceptCandidate,
          definition: defCandidate,
          rawLine: line
        });
      }
    }
  }

  // Pool of authentic technical definitions to form realistic distractors
  const definitionPool = candidateConcepts.map(c => c.definition);

  const questions: GeneratedQuestionItem[] = [];

  // Question archetypes to diversify phrasing
  const questionTemplates = [
    {
      format: (concept: string) => `Trong chuyên đề kỹ thuật, mục đích hoặc vai trò cốt lõi của "${concept}" là gì?`,
      correctPrefix: 'Mục đích chính là ',
      distractor1: (otherDef: string) => otherDef.slice(0, 140),
      distractor2: () => 'Chỉ có tác dụng chú thích tạm thời và bị trình biên dịch bỏ qua trong runtime.',
      distractor3: () => 'Yêu cầu quyền quản trị root và không thể khởi tạo trong môi trường người dùng thông thường.'
    },
    {
      format: (concept: string) => `Đặc điểm hoặc nguyên lý hoạt động nào sau đây mô tả ĐÚNG về "${concept}"?`,
      correctPrefix: 'Đặc tính quan trọng: ',
      distractor1: (otherDef: string) => otherDef.slice(0, 140),
      distractor2: () => 'Tự động giải phóng bộ nhớ mà không cần tuân thủ bất kỳ phạm vi biến (scope) nào.',
      distractor3: () => 'Luôn làm chậm thời gian xử lý do phải chuyển đổi kiểu ngầm định liên tục.'
    },
    {
      format: (concept: string) => `Khi triển khai mã nguồn liên quan đến "${concept}", khẳng định nào sau đây là CHUẨN XÁC?`,
      correctPrefix: 'Khẳng định chuẩn: ',
      distractor1: (otherDef: string) => otherDef.slice(0, 140),
      distractor2: () => 'Không được hỗ trợ trong các kiến trúc ứng dụng web hiện đại.',
      distractor3: () => 'Không tuân thủ các quy chuẩn lập trình hướng đối tượng và bảo mật dữ liệu.'
    },
    {
      format: (concept: string) => `Đâu là điểm khác biệt hoặc phát biểu KHÔNG CHÍNH XÁC (phát biểu sai) khi nói về "${concept}"?`,
      isNegative: true,
      negativeCorrect: (concept: string) => `Cho rằng "${concept}" không có bất kỳ ràng buộc nào về kiểu dữ liệu hay cú pháp.`,
      distractor1: (def: string) => def.slice(0, 140),
      distractor2: () => 'Là một thành phần được chuẩn hóa trong tài liệu kỹ thuật của bài học.',
      distractor3: () => 'Đóng vai trò quan trọng trong việc xây dựng luồng logic chương trình.'
    },
    {
      format: (concept: string) => `Trong thực tế phát triển phần mềm, giải pháp nào được khuyến nghị (Best Practice) khi áp dụng "${concept}"?`,
      correctPrefix: 'Thực hành khuyến nghị: Áp dụng theo nguyên tắc ',
      distractor1: (otherDef: string) => otherDef.slice(0, 140),
      distractor2: () => 'Bỏ qua việc kiểm tra tính hợp lệ dữ liệu đầu vào để tối đa hóa tốc độ.',
      distractor3: () => 'Thay thế toàn bộ các cấu trúc xử lý ngoại lệ bằng việc bỏ qua cảnh báo lỗi.'
    }
  ];

  // Generate questions from candidate concepts
  let conceptIndex = 0;
  while (questions.length < count && conceptIndex < candidateConcepts.length) {
    const item = candidateConcepts[conceptIndex];
    conceptIndex++;

    const templateIndex = questions.length % questionTemplates.length;
    const template = questionTemplates[templateIndex];

    const questionText = template.format(item.concept);

    // Pick distractors from pool
    const otherDefs = definitionPool.filter(d => d !== item.definition);
    const altDef1 = otherDefs[questions.length % (otherDefs.length || 1)] ||
      'Là cơ chế kiểm soát phiên làm việc người dùng thông qua mã thông báo JWT.';
    const altDef2 = otherDefs[(questions.length + 1) % (otherDefs.length || 1)] ||
      'Quy trình nén dữ liệu nhằm giảm tải băng thông đường truyền mạng.';

    let correctText = '';
    let dist1 = '';
    let dist2 = '';
    let dist3 = '';

    const cleanDef = item.definition.replace(/^[–\-:•\s]+/, '').trim();
    const formattedDef = cleanDef.charAt(0).toUpperCase() + cleanDef.slice(1);

    if (template.isNegative && template.negativeCorrect) {
      correctText = template.negativeCorrect(item.concept);
      dist1 = formattedDef.endsWith('.') ? formattedDef : formattedDef + '.';
      dist2 = template.distractor2();
      dist3 = template.distractor3();
    } else {
      correctText = formattedDef.endsWith('.') ? formattedDef : formattedDef + '.';
      dist1 = template.distractor1(altDef1);
      dist2 = template.distractor2();
      dist3 = altDef2.endsWith('.') ? altDef2 : altDef2 + '.';
    }

    // Distribute correct answer evenly across A, B, C, D
    const shift = questions.length % 4; // 0 -> A, 1 -> B, 2 -> C, 3 -> D
    const optionsRaw = [
      { text: correctText, isCorrect: true },
      { text: dist1, isCorrect: false },
      { text: dist2, isCorrect: false },
      { text: dist3, isCorrect: false }
    ];

    const shifted = [
      optionsRaw[(4 - shift) % 4],
      optionsRaw[(5 - shift) % 4],
      optionsRaw[(6 - shift) % 4],
      optionsRaw[(7 - shift) % 4]
    ];

    const correctLetter = (['A', 'B', 'C', 'D'] as const)[shift];

    questions.push({
      question_text: questionText,
      option_a: shifted[0].text,
      option_b: shifted[1].text,
      option_c: shifted[2].text,
      option_d: shifted[3].text,
      correct_ans: correctLetter,
      explanation: `Khái niệm "${item.concept}" được định nghĩa chuẩn xác: ${correctText}. Các phương án còn lại là các mệnh đề gây nhiễu không phản ánh đúng nguyên lý kỹ thuật này.`
    });
  }

  // Rich secondary questions pool: 6 diverse, distinct pedagogical inquiry formats
  const secondaryQuestionArchetypes = [
    {
      stem: (title: string) => `Trong khuôn khổ chuyên đề "${title}", mục tiêu thiết kế và kiến trúc nào đóng vai trò CỐT LÕI?`,
      correct: 'Bảo đảm tính toàn vẹn thông tin, chuẩn hóa giao thức và tính mô đun hóa cao của hệ thống.',
      d1: 'Chấp nhận rủi ro sai lệch dữ liệu để tối thiểu hóa thời gian tính toán.',
      d2: 'Triệt tiêu mọi ràng buộc toàn vẹn và cho phép ghi đè bộ nhớ tùy ý.',
      d3: 'Chỉ hỗ trợ môi trường phần cứng chuyên dụng không tương thích với các tiêu chuẩn mở.'
    },
    {
      stem: (title: string) => `Khi triển khai các quy tắc kỹ thuật trong "${title}", quy chuẩn nào sau đây là BẮT BUỘC cần tuân thủ?`,
      correct: 'Tuân thủ nghiêm ngặt định dạng cấu trúc, xử lý ngoại lệ và kiểm soát kiểu dữ liệu đầu vào.',
      d1: 'Bỏ qua việc đóng kết nối và giải phóng tài nguyên sau khi hoàn tất phiên làm việc.',
      d2: 'Cho phép truy cập trực tiếp tài nguyên nội bộ mà không cần phân quyền hay xác thực.',
      d3: 'Không ghi nhận nhật ký hoạt động (logs) khi có sự cố phát sinh trong hệ thống.'
    },
    {
      stem: (title: string) => `Đâu là điểm khác biệt căn bản giữa giải pháp được đề cập trong "${title}" so với các mô hình truyền thống?`,
      correct: 'Tối ưu hóa khả năng mở rộng, giảm độ trễ và phân tầng trách nhiệm rõ ràng giữa các thành phần.',
      d1: 'Loại bỏ hoàn toàn khả năng tương thích ngược với các phiên bản trước đó.',
      d2: 'Tăng mức độ phụ thuộc chặt chẽ (tight coupling) giữa các mô đun phần mềm.',
      d3: 'Buộc mọi tác vụ phải xử lý đồng bộ và khóa toàn bộ luồng chính của ứng dụng.'
    },
    {
      stem: (title: string) => `Phát biểu nào sau đây là KHÔNG CHÍNH XÁC (nhận định sai) khi đánh giá về nội dung chuyên môn trong "${title}"?`,
      correct: 'Mọi thao tác dữ liệu đều có thể bỏ qua bước xác thực mà vẫn đảm bảo độ tin cậy tuyệt đối.',
      d1: 'Các thành phần hệ thống cần được kiểm thử đơn vị và tích hợp trước khi đưa vào vận hành.',
      d2: 'Cơ chế xử lý được thiết kế để phát hiện sớm các bất thường và xung đột dữ liệu.',
      d3: 'Hiệu năng và tính bảo mật là hai yếu tố song hành trong toàn bộ quy trình thiết kế.'
    },
    {
      stem: (title: string) => `Về mặt an toàn và bảo mật, tài liệu "${title}" khuyến nghị giải pháp hoặc thực hành chuẩn nào sau đây?`,
      correct: 'Áp dụng nguyên tắc đặc quyền tối thiểu (Least Privilege) và mã hóa an toàn dữ liệu nhạy cảm.',
      d1: 'Lưu trữ thông tin xác thực dưới dạng văn bản thô (plaintext) trong tệp cấu hình công khai.',
      d2: 'Tắt toàn bộ cơ chế lọc dữ liệu (sanitization) để tăng thông lượng mạng.',
      d3: 'Không cập nhật các bản vá bảo mật định kỳ khi hệ thống đang vận hành.'
    },
    {
      stem: (title: string) => `Khi hệ thống xử lý các điều kiện biên hoặc phát sinh ngoại lệ trong "${title}", hành vi chuẩn mực là gì?`,
      correct: 'Bắt và xử lý ngoại lệ an toàn, ghi nhận log chi tiết và thông báo trạng thái lỗi rõ ràng.',
      d1: 'Đột ngột dừng tiến trình và để lộ toàn bộ thông tin ngăn xếp (stack trace) ra người dùng.',
      d2: 'Bỏ qua lỗi ngầm định và tiếp tục xử lý với các giá trị rác không xác định.',
      d3: 'Xóa toàn bộ cơ sở dữ liệu hiện tại để tự động khởi động lại từ đầu.'
    }
  ];

  while (questions.length < count) {
    const qIndex = questions.length;
    const archetype = secondaryQuestionArchetypes[qIndex % secondaryQuestionArchetypes.length];

    const correctAnsLetter = (['A', 'B', 'C', 'D'] as const)[qIndex % 4];
    const options = [archetype.correct, archetype.d1, archetype.d2, archetype.d3];

    // Rotate options so correct is at correctAnsLetter
    const targetIdx = ['A', 'B', 'C', 'D'].indexOf(correctAnsLetter);
    const temp = options[0];
    options[0] = options[targetIdx];
    options[targetIdx] = temp;

    questions.push({
      question_text: archetype.stem(docTitle),
      option_a: options[0],
      option_b: options[1],
      option_c: options[2],
      option_d: options[3],
      correct_ans: correctAnsLetter,
      explanation: `Đối với chuyên đề "${docTitle}": Phương án ${correctAnsLetter} thể hiện đúng nguyên lý kỹ thuật chuẩn mực và được áp dụng trong thực tiễn.`
    });
  }

  return questions;
}

/**
 * Weakness analysis for completed quiz attempt
 */
export function analyzeQuizWeaknesses(
  quiz: Quiz,
  results: Array<{
    question: Question;
    selected_option: string;
    is_correct: boolean;
  }>
): {
  weakness_summary: string;
  recommended_review_topics: string[];
  encouragement: string;
} {
  const incorrectList = results.filter(r => !r.is_correct);
  const correctCount = results.length - incorrectList.length;
  const percentage = Math.round((correctCount / results.length) * 100);

  if (incorrectList.length === 0) {
    return {
      weakness_summary: 'Xuất sắc! Bạn đã nắm vững 100% các kiến thức trong bài học này.',
      recommended_review_topics: [],
      encouragement: 'Bạn đã hoàn thành hoàn hảo bài kiểm tra. Hãy tự tin bước vào bài kiểm tra chính thức hoặc thử sức với các chủ đề nâng cao hơn!'
    };
  }

  const topicsToReview = incorrectList.map(item => {
    // Extract subject/topic keywords from question text
    const cleanText = item.question.question_text
      .replace(/^(Câu \d+:?|Theo tài liệu [^,]+,|Đâu là khẳng định|Trong tính chất|Điều kiện|Khái niệm|Trong chuyên đề kỹ thuật, mục đích hoặc vai trò cốt lõi của|Đặc điểm hoặc nguyên lý hoạt động nào sau đây mô tả ĐÚNG về)\s*/i, '')
      .replace(/["?]/g, '')
      .slice(0, 60);
    return cleanText.trim();
  });

  let encouragement = '';
  if (percentage >= 80) {
    encouragement = 'Kết quả rất tốt! Bạn chỉ sai sót một vài chi tiết nhỏ. Hãy xem lại phần giải thích để đạt điểm tuyệt đối nhé.';
  } else if (percentage >= 50) {
    encouragement = 'Bạn đã nắm được các nguyên lý cơ bản. Đọc lại các đoạn bài giảng được gợi ý bên dưới để củng cố các câu còn nhầm lẫn nhé!';
  } else {
    encouragement = 'Đừng nản lòng! Đây là cơ hội tốt để bạn nhận diện các lỗ hổng kiến thức. Hãy đọc lại tài liệu và làm lại bài kiểm tra nhé.';
  }

  return {
    weakness_summary: `Bạn đã trả lời đúng ${correctCount}/${results.length} câu (${percentage}%). Có ${incorrectList.length} câu cần lưu ý ôn tập lại.`,
    recommended_review_topics: Array.from(new Set(topicsToReview)),
    encouragement
  };
}
