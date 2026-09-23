import React, { useState, useRef, useEffect } from 'react';
import { DocumentItem, ChatMessage } from '../types';
import { api } from '../services/api';
import {
  Send,
  Sparkles,
  Bot,
  User as UserIcon,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Layers,
  RotateCcw,
  Lightbulb,
  ExternalLink,
  Cpu
} from 'lucide-react';

interface ChatViewProps {
  documents: DocumentItem[];
  selectedDocument: DocumentItem | null;
  onSelectDocument: (doc: DocumentItem | null) => void;
  onOpenQuizModal: (doc: DocumentItem) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  documents,
  selectedDocument,
  onSelectDocument,
  onOpenQuizModal
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Xin chào! Tôi là **Aura AI**, trợ lý học tập được hỗ trợ bởi mô hình Gemini và kỹ thuật RAG (Retrieval-Augmented Generation).\n\nTôi có thể giúp bạn giải đáp thắc mắc chuyên sâu, tra cứu kiến thức chuẩn xác từ các tài liệu bạn đã tải lên, tóm tắt bài giảng hoặc gợi ý câu hỏi ôn tập!',
      timestamp: new Date().toISOString(),
      suggested_questions: [
        'Chuẩn hóa CSDL là gì và tại sao cần đưa về 3NF?',
        'Giải thích 4 tính chất ACID trong hệ quản trị CSDL',
        'Mô hình OSI 7 tầng gồm những tầng nào?'
      ]
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedCitationId, setExpandedCitationId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (questionText?: string) => {
    const query = questionText || input.trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!questionText) setInput('');
    setLoading(true);

    try {
      // Prepare history
      const historyPayload = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await api.askQuestion({
        question: query,
        document_id: selectedDocument ? selectedDocument.id : undefined,
        history: historyPayload
      });

      const assistantMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: res.answer,
        timestamp: new Date().toISOString(),
        retrieved_context: res.retrieved_context,
        suggested_questions: res.suggested_questions,
        model_used: res.model_used
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Có lỗi xảy ra khi xử lý câu hỏi: ${err?.message || 'Không thể kết nối đến máy chủ.'}`,
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Cuộc trò chuyện đã được làm mới. Hãy đặt bất kỳ câu hỏi nào về tài liệu học tập của bạn!',
        timestamp: new Date().toISOString(),
        suggested_questions: [
          'Tóm tắt nội dung chính của tài liệu',
          'Các khái niệm quan trọng nhất cần nhớ là gì?'
        ]
      }
    ]);
  };

  return (
    <div id="chat-view-content" className="flex flex-col h-[calc(100vh-61px)] max-w-5xl mx-auto p-3 sm:p-6">
      
      {/* Top Bar: Context Selector & Tools */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-[260px]">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Phạm vi ngữ cảnh RAG
            </label>
            <select
              id="chat-document-selector"
              value={selectedDocument ? selectedDocument.id : 'all'}
              onChange={(e) => {
                const docId = e.target.value;
                if (docId === 'all') {
                  onSelectDocument(null);
                } else {
                  const doc = documents.find((d) => d.id === docId);
                  if (doc) onSelectDocument(doc);
                }
              }}
              className="text-xs sm:text-sm font-semibold text-slate-800 bg-transparent border-none p-0 focus:outline-none focus:ring-0 cursor-pointer w-full"
            >
              <option value="all">🔍 Tìm kiếm thông minh trên tất cả tài liệu ({documents.length} bài)</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  📄 {doc.title} ({doc.subject})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedDocument && (
            <button
              id="chat-create-quiz-shortcut"
              onClick={() => onOpenQuizModal(selectedDocument)}
              className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200/60 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-orange-600" />
              <span className="hidden sm:inline">Tạo đề thi từ bài này</span>
            </button>
          )}

          <button
            id="chat-clear-btn"
            onClick={handleClearHistory}
            title="Làm mới cuộc trò chuyện"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-6 space-y-5">
        {messages.map((msg) => {
          const isAI = msg.role === 'assistant';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isAI ? 'justify-start' : 'justify-end'}`}
            >
              {isAI && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-[85%] sm:max-w-[75%] space-y-2.5`}>
                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isAI
                      ? 'bg-slate-50 text-slate-800 border border-slate-200/70'
                      : 'bg-blue-600 text-white shadow-md shadow-blue-100'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>

                {/* Citations / Reference Chunks */}
                {isAI && msg.retrieved_context && msg.retrieved_context.length > 0 && (
                  <div className="bg-blue-50/60 border border-blue-100/90 rounded-xl p-3 space-y-2 text-xs">
                    <button
                      onClick={() =>
                        setExpandedCitationId(expandedCitationId === msg.id ? null : msg.id)
                      }
                      className="w-full flex items-center justify-between text-[11px] font-semibold text-blue-900 cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        Trích dẫn nguồn tài liệu đối chiếu ({msg.retrieved_context.length} đoạn văn)
                      </span>
                      {expandedCitationId === msg.id ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {expandedCitationId === msg.id && (
                      <div className="space-y-2 pt-1">
                        {msg.retrieved_context.map((ctx, idx) => (
                          <div
                            key={idx}
                            className="bg-white p-2.5 rounded-lg border border-blue-100 text-[11px] text-slate-700"
                          >
                            <div className="flex items-center justify-between font-medium text-blue-900 mb-1">
                              <span className="truncate max-w-[200px]">📌 {ctx.document_title}</span>
                              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">
                                Độ tương đồng: {Math.round(ctx.similarity_score * 100)}%
                              </span>
                            </div>
                            <p className="text-slate-600 italic line-clamp-3">"{ctx.chunk_text}"</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Suggested Questions Chips */}
                {isAI && msg.suggested_questions && msg.suggested_questions.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3 text-amber-500" /> Gợi ý câu hỏi tiếp theo:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggested_questions.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(q)}
                          className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-xs rounded-full transition-colors text-left cursor-pointer"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {!isAI && (
                <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-2xl text-xs text-slate-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
              <span>Aura AI đang tra cứu tài liệu & đối chiếu kiến thức...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="mt-3 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-2 sm:p-2.5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end gap-2"
        >
          <textarea
            id="chat-input-textarea"
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedDocument
                ? `Hỏi bất kỳ điều gì về "${selectedDocument.title}"... (Enter để gửi)`
                : 'Đặt câu hỏi về kiến thức, bài giảng hoặc yêu cầu giải thích thuật ngữ... (Enter để gửi)'
            }
            className="flex-1 text-xs sm:text-sm text-slate-800 p-2.5 resize-none focus:outline-none"
          />
          <button
            id="chat-send-btn"
            type="submit"
            disabled={!input.trim() || loading}
            className="p-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-40 text-white rounded-xl shadow-sm shadow-orange-100 transition-all cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
