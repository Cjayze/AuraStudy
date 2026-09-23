import { GoogleGenAI } from '@google/genai';
import { getDb, DocumentChunk, ensureDocumentCleanText } from './db';

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

export interface RetrievedChunk {
  chunk_id: string;
  document_id: string;
  document_title: string;
  chunk_index: number;
  content: string;
  score: number;
}

/**
 * Tokenize Vietnamese and English text into word tokens
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1);
}

/**
 * Compute term frequency vector for a given text
 */
function computeTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  const total = tokens.length || 1;
  for (const [key, val] of tf.entries()) {
    tf.set(key, val / total);
  }
  return tf;
}

/**
 * Calculate Cosine Similarity between Query TF-IDF and Chunk TF-IDF
 */
function calculateCosineSimilarity(
  queryTf: Map<string, number>,
  chunkTf: Map<string, number>,
  idf: Map<string, number>
): number {
  let dotProduct = 0;
  let queryMagnitudeSq = 0;
  let chunkMagnitudeSq = 0;

  for (const [term, qTf] of queryTf.entries()) {
    const termIdf = idf.get(term) || 1.0;
    const qWeight = qTf * termIdf;
    queryMagnitudeSq += qWeight * qWeight;

    const cTf = chunkTf.get(term) || 0;
    const cWeight = cTf * termIdf;
    dotProduct += qWeight * cWeight;
  }

  for (const [term, cTf] of chunkTf.entries()) {
    const termIdf = idf.get(term) || 1.0;
    const cWeight = cTf * termIdf;
    chunkMagnitudeSq += cWeight * cWeight;
  }

  const denominator = Math.sqrt(queryMagnitudeSq) * Math.sqrt(chunkMagnitudeSq);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

/**
 * Search the top-K relevant chunks across selected document or all user documents
 */
export function searchRelevantChunks(
  query: string,
  documentId?: string,
  userId?: string,
  topK: number = 4
): RetrievedChunk[] {
  const db = getDb();

  // Filter chunks based on document or user ownership
  let targetChunks: DocumentChunk[] = [];
  if (documentId) {
    targetChunks = db.document_chunks.filter(c => c.document_id === documentId);
  } else if (userId) {
    const userDocIds = new Set(db.documents.filter(d => d.user_id === userId).map(d => d.id));
    targetChunks = db.document_chunks.filter(c => userDocIds.has(c.document_id));
  } else {
    targetChunks = db.document_chunks;
  }

  if (targetChunks.length === 0) {
    return [];
  }

  // Pre-tokenize and calculate IDF
  const chunkTokensList: Array<{ chunk: DocumentChunk; tokens: string[]; tf: Map<string, number> }> = [];
  const docFrequency = new Map<string, number>();

  for (const chunk of targetChunks) {
    const tokens = tokenize(chunk.content);
    const tf = computeTF(tokens);
    const uniqueTokens = new Set(tokens);
    for (const t of uniqueTokens) {
      docFrequency.set(t, (docFrequency.get(t) || 0) + 1);
    }
    chunkTokensList.push({ chunk, tokens, tf });
  }

  const numChunks = targetChunks.length;
  const idf = new Map<string, number>();
  for (const [term, df] of docFrequency.entries()) {
    idf.set(term, Math.log((numChunks + 1) / (df + 0.5)) + 1.0);
  }

  const queryTokens = tokenize(query);
  const queryTf = computeTF(queryTokens);

  // Score each chunk
  const scoredChunks: RetrievedChunk[] = [];

  for (const item of chunkTokensList) {
    let similarity = calculateCosineSimilarity(queryTf, item.tf, idf);

    // Boost score if exact phrase matches
    const lowerQuery = query.toLowerCase().trim();
    if (item.chunk.content.toLowerCase().includes(lowerQuery)) {
      similarity += 0.35;
    }

    // Check individual token presence
    let matchedTokenCount = 0;
    for (const qToken of queryTokens) {
      if (item.tokens.includes(qToken)) {
        matchedTokenCount++;
      }
    }
    const tokenMatchRatio = queryTokens.length > 0 ? matchedTokenCount / queryTokens.length : 0;
    similarity = similarity * 0.7 + tokenMatchRatio * 0.3;

    if (similarity > 0.05) {
      const doc = db.documents.find(d => d.id === item.chunk.document_id);
      scoredChunks.push({
        chunk_id: item.chunk.id,
        document_id: item.chunk.document_id,
        document_title: doc ? doc.title : 'Tài liệu không xác định',
        chunk_index: item.chunk.chunk_index,
        content: item.chunk.content,
        score: Math.min(Math.round(similarity * 100) / 100, 1.0)
      });
    }
  }

  // Sort descending by score and pick topK
  scoredChunks.sort((a, b) => b.score - a.score);
  return scoredChunks.slice(0, topK);
}

const AURA_SYSTEM_INSTRUCTION = `Bạn là Aura AI – Trợ lý học tập thông minh thuộc hệ sinh thái giáo dục AuraStudy.
Nhiệm vụ của bạn là hỗ trợ sinh viên học tập, ôn thi, giải thích khái niệm và trả lời câu hỏi dựa trên tài liệu học tập được cung cấp.

QUY TẮC CỐT LÕI (NGHIÊM NGẶT - CHỐNG ẢO GIÁC):
1. TRỰC TIẾP & CHÍNH XÁC: Chỉ trả lời dựa vào nội dung các đoạn văn bản (Context) được trích dẫn bên dưới. KHÔNG tự ý suy diễn hoặc bịa đặt các sự thật ngoài tài liệu.
2. NẾU THÔNG TIN KHÔNG CÓ TRONG TÀI LIỆU: Nếu nội dung tài liệu được trích xuất không chứa câu trả lời, hãy thông báo lịch sự: "Xin lỗi bạn, tài liệu hiện tại không đề cập đến thông tin này. Bạn có thể tải lên tài liệu bổ sung để Aura AI hỗ trợ giải đáp nhé."
3. TRÍCH DẪN NGUỒN CHÍNH XÁC: Trong câu trả lời, hãy chỉ rõ bạn dựa vào [Đoạn X] hoặc [Tài liệu: ...] để sinh viên tiện tra cứu đối chiếu.
4. TƯ DUY SƯ PHẠM: Trình bày súc tích, mạch lạc, dễ hiểu, sử dụng cấu trúc gạch đầu dòng Markdown, bôi đậm từ khóa quan trọng để kích thích trí nhớ sinh viên.`;

/**
 * Ask question using RAG pipeline: Retrieve relevant chunks -> Assemble prompt -> Call Gemini 3.8 Flash
 */
export async function askAuraAI(params: {
  question: string;
  documentId?: string;
  userId: string;
  conversationHistory?: Array<{ sender_type: 'user' | 'ai'; content: string }>;
}): Promise<{
  answer: string;
  sources: Array<{
    document_id: string;
    document_title: string;
    chunk_index: number;
    similarity_score: number;
    content: string;
  }>;
}> {
  const { question, documentId, userId, conversationHistory } = params;

  // Self-heal document text if single document is chosen
  if (documentId) {
    const db = getDb();
    const doc = db.documents.find(d => d.id === documentId);
    if (doc) {
      await ensureDocumentCleanText(doc);
    }
  }

  // 1. Retrieve Top-K relevant chunks
  const relevantChunks = searchRelevantChunks(question, documentId, userId, 4);

  // 2. Prepare Context block
  let contextBlock = '';
  if (relevantChunks.length > 0) {
    contextBlock = relevantChunks
      .map(
        (c, idx) =>
          `--- [NGUỒN TRÍCH XUẤT #${idx + 1} | Tài liệu: ${c.document_title} | Đoạn ${c.chunk_index + 1}] ---\n${c.content}`
      )
      .join('\n\n');
  } else {
    contextBlock = 'Không tìm thấy đoạn trích xuất nào liên quan trực tiếp đến câu hỏi trong các tài liệu đã chọn.';
  }

  // 3. Assemble User Prompt with Grounded Context
  let promptText = `CÂU HỎI CỦA SINH VIÊN:
"${question}"

DỮ LIỆU TÀI LIỆU HỌC TẬP (CONTEXT):
${contextBlock}

Hãy trả lời câu hỏi trên theo đúng hướng dẫn của Aura AI, tuân thủ nguyên tắc chống ảo giác và trích dẫn nguồn rõ ràng.`;

  // Add conversation history if available
  if (conversationHistory && conversationHistory.length > 0) {
    const historyText = conversationHistory
      .slice(-4)
      .map(m => `${m.sender_type === 'user' ? 'Sinh viên' : 'Aura AI'}: ${m.content}`)
      .join('\n');
    promptText = `LỊCH SỬ HỘI THOẠI TRƯỚC ĐÓ:\n${historyText}\n\n` + promptText;
  }

  // 4. Call Gemini 3.8 Flash
  const ai = getGeminiClient();
  let answer = '';

  if (ai) {
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
    for (const modelName of candidateModels) {
      if (answer) break;
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout gọi Gemini API (${modelName}) quá 15 giây`)), 15000)
        );

        const geminiPromise = ai.models.generateContent({
          model: modelName,
          contents: promptText,
          config: {
            systemInstruction: AURA_SYSTEM_INSTRUCTION,
            temperature: 0.3 // Low temperature for high factual accuracy and anti-hallucination
          }
        });

        const response = await Promise.race([geminiPromise, timeoutPromise]);
        answer = response.text?.trim() || '';
      } catch (apiError: any) {
        console.warn(`Gemini API call failed for ${modelName}:`, apiError?.message);
      }
    }
  }

  // Graceful Fallback if API key not configured or API call failed
  if (!answer) {
    if (relevantChunks.length > 0 && relevantChunks[0].score >= 0.2) {
      const best = relevantChunks[0];
      answer = `Dựa trên tài liệu **${best.document_title}** (Đoạn ${best.chunk_index + 1}):\n\n${best.content}\n\n*(Lưu ý: Bạn có thể tiếp tục đặt thêm câu hỏi về các phần kiến thức liên quan)*`;
    } else {
      answer = `Xin lỗi bạn, nội dung tài liệu học tập hiện tại không đề cập đến thông tin liên quan đến câu hỏi: "${question}". Bạn vui lòng kiểm tra lại tài liệu đã tải lên hoặc đặt câu hỏi khác trong phạm vi bài học nhé.`;
    }
  }

  return {
    answer,
    sources: relevantChunks.map(c => ({
      document_id: c.document_id,
      document_title: c.document_title,
      chunk_index: c.chunk_index,
      similarity_score: c.score,
      content: c.content
    }))
  };
}

/**
 * Summarize Document with structured educational format
 */
export async function summarizeDocument(
  documentId: string,
  userId: string
): Promise<{
  title: string;
  summary: string;
  key_concepts: string[];
  exam_tips: string[];
}> {
  const db = getDb();
  const doc = db.documents.find(d => d.id === documentId && (d.user_id === userId || userId === 'all'));

  if (!doc) {
    throw new Error('Không tìm thấy tài liệu để tóm tắt.');
  }

  // Ensure clean text
  const cleanRawText = await ensureDocumentCleanText(doc);

  const chunks = db.document_chunks
    .filter(c => c.document_id === doc.id)
    .sort((a, b) => a.chunk_index - b.chunk_index);

  const fullText = cleanRawText || chunks.map(c => c.content).join('\n\n') || doc.title;
  const truncatedText = fullText.slice(0, 8000); // Fit safely in prompt

  const summarizePrompt = `Bạn là Aura AI. Hãy tóm tắt tài liệu học tập sau đây một cách chuyên sâu, khoa học và có cấu trúc rõ ràng dành cho sinh viên CNTT:
TÀI LIỆU: "${doc.title}" (Môn: ${doc.subject})

NỘI DUNG TÀI LIỆU:
${truncatedText}

HÃY TRẢ LỜI BẰNG TIẾNG VIỆT THEO CẤU TRÚC MARKDOWN:
# 📌 TỔNG QUAN TÀI LIỆU
(Nêu mục tiêu và bức tranh toàn cảnh ngắn gọn trong 2-3 câu)

# 🔑 CÁC KHÁI NIỆM & KIẾN THỨC CỐT LÕI
(Liệt kê các định nghĩa, nguyên lý hoặc công thức chính dạng bullet points)

# 💡 ĐIỂM MẤU CHỐT ÔN THI (EXAM TIPS)
(Các dạng câu hỏi dễ bị nhầm lẫn, lưu ý quan trọng khi làm bài thi)

# ❓ 3 CÂU HỎI ÔN TẬP TỰ ĐÁNH GIÁ
(3 câu hỏi trắc nghiệm hoặc tự luận ngắn để sinh viên tự kiểm tra)`;

  const ai = getGeminiClient();
  let summary = '';

  if (ai) {
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-3.1-pro-preview', 'gemini-flash-latest'];
    for (const modelName of candidateModels) {
      if (summary) break;
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout tóm tắt qua model ${modelName}`)), 25000)
        );

        const geminiPromise = ai.models.generateContent({
          model: modelName,
          contents: summarizePrompt,
          config: {
            systemInstruction: AURA_SYSTEM_INSTRUCTION,
            temperature: 0.4
          }
        });

        const response = await Promise.race([geminiPromise, timeoutPromise]);
        summary = response.text?.trim() || '';
      } catch (e: any) {
        console.warn(`Gemini summarization failed for ${modelName}:`, e?.message);
      }
    }
  }

  if (!summary) {
    // Fallback heuristic summary
    summary = `# 📌 TỔNG QUAN TÀI LIỆU: ${doc.title}
Tài liệu cung cấp kiến thức nền tảng về môn **${doc.subject}**, bao gồm các khái niệm, quy trình và ví dụ minh họa thực tiễn.

# 🔑 CÁC KHÁI NIỆM CỐT LÕI
- **Nội dung chính:** Bao gồm ${chunks.length} đoạn nội dung đã được phân tích.
- **Điểm nổi bật:** Trình bày chi tiết cấu trúc lý thuyết và nguyên lý cốt lõi.

# 💡 ĐIỂM MẤU CHỐT ÔN THI
- Nắm vững định nghĩa và sự khác biệt giữa các cơ chế được mô tả trong bài.
- Chú ý liên hệ giữa lý thuyết và bài tập tình huống thực tế.`;
  }

  return {
    title: doc.title,
    summary,
    key_concepts: [doc.subject, 'Lý thuyết cốt lõi', 'Ứng dụng thực tiễn'],
    exam_tips: ['Ôn kỹ các định nghĩa', 'Phân biệt các trường hợp ngoại lệ']
  };
}
