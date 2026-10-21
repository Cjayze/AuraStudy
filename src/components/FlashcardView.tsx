import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Layers, Plus, Trash2, Edit3, Play, ArrowLeft, RotateCcw, ChevronLeft, ChevronRight,
  Check, X, Sparkles, BookOpen, FileText, Loader2, AlertCircle, Save, Search, Brain
} from 'lucide-react';
import { api } from '../services/api';
import { DocumentItem, FlashcardSetItem, FlashcardSetDetail, FlashcardItem, FlashcardProgressItem } from '../types';

// ─── Sub-view types ──────────────────────────────────────────────────────────
type SubView = 'list' | 'create' | 'edit' | 'study';

interface DraftCard { id?: string; front_text: string; back_text: string; }

interface FlashcardViewProps {
  documents: DocumentItem[];
  onRefresh: () => void;
  preSelectedDoc?: DocumentItem | null;
  onClearPreSelectedDoc?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────
export const FlashcardView: React.FC<FlashcardViewProps> = ({
  documents,
  onRefresh,
  preSelectedDoc,
  onClearPreSelectedDoc
}) => {
  // ── State ────────────────────────────────────────────────────────────────
  const [subView, setSubView] = useState<SubView>('list');
  const [sets, setSets] = useState<FlashcardSetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Create/Edit form state
  const [createMethod, setCreateMethod] = useState<'choose' | 'manual' | 'ai'>('choose');
  const [formTitle, setFormTitle] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDocumentId, setFormDocumentId] = useState<string | null>(null);
  const [draftCards, setDraftCards] = useState<DraftCard[]>([{ front_text: '', back_text: '' }]);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);

  // Study state
  const [studyDetail, setStudyDetail] = useState<FlashcardSetDetail | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyProgress, setStudyProgress] = useState<Map<string, FlashcardProgressItem>>(new Map());
  const [studyLoading, setStudyLoading] = useState(false);

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Refs
  const cardRef = useRef<HTMLDivElement>(null);

  // ── Auto-clear messages ──────────────────────────────────────────────────
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 6000);
      return () => clearTimeout(t);
    }
  }, [error]);

  // ── Fetch sets ───────────────────────────────────────────────────────────
  const fetchSets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getFlashcardSets();
      setSets(data);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách flashcard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSets(); }, [fetchSets]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const resetForm = () => {
    setCreateMethod('choose');
    setFormTitle('');
    setFormSubject('');
    setFormDescription('');
    setFormDocumentId(null);
    setDraftCards([{ front_text: '', back_text: '' }]);
    setEditingSetId(null);
  };

  const addCard = () => setDraftCards(prev => [...prev, { front_text: '', back_text: '' }]);

  const removeCard = (idx: number) => {
    if (draftCards.length <= 1) return;
    setDraftCards(prev => prev.filter((_, i) => i !== idx));
  };

  const updateCard = (idx: number, field: 'front_text' | 'back_text', value: string) => {
    setDraftCards(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  // ── Create / Save ──────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!formTitle.trim()) { setError('Vui lòng nhập tên bộ flashcard.'); return; }
    const validCards = draftCards.filter(c => c.front_text.trim() && c.back_text.trim());
    if (validCards.length === 0) { setError('Bộ flashcard cần ít nhất 1 thẻ có đầy đủ hai mặt.'); return; }

    setSaving(true);
    setError(null);
    try {
      if (editingSetId) {
        await api.updateFlashcardSet(editingSetId, {
          title: formTitle.trim(),
          subject: formSubject.trim() || 'General',
          description: formDescription.trim() || undefined,
          cards: validCards
        });
        setSuccessMsg('Đã cập nhật bộ flashcard thành công!');
      } else {
        await api.createFlashcardSet({
          title: formTitle.trim(),
          subject: formSubject.trim() || 'General',
          description: formDescription.trim() || undefined,
          document_id: formDocumentId,
          creation_method: createMethod === 'ai' ? 'ai' : 'manual',
          cards: validCards
        });
        setSuccessMsg('Đã tạo bộ flashcard thành công!');
      }
      resetForm();
      setSubView('list');
      fetchSets();
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Không thể lưu bộ flashcard.');
    } finally {
      setSaving(false);
    }
  };

  // ── AI Generation ──────────────────────────────────────────────────────
  const handleAIGenerate = async (docId: string) => {
    setAiLoading(true);
    setError(null);
    try {
      const result = await api.generateFlashcardsAI(docId);
      setFormDocumentId(result.document_id);
      setFormTitle(result.document_title);
      setFormSubject(result.subject || 'General');
      setDraftCards(result.cards.map(c => ({ front_text: c.front_text, back_text: c.back_text })));
      setCreateMethod('ai');
      setSuccessMsg(`Aura AI đã tạo ${result.cards.length} thẻ. Bạn có thể chỉnh sửa trước khi lưu.`);
    } catch (err: any) {
      setError(err.message || 'Aura AI không thể tạo flashcard. Vui lòng thử lại.');
    } finally {
      setAiLoading(false);
    }
  };

  // ── Auto-generate if preSelectedDoc is passed ────────────────────────────
  useEffect(() => {
    if (preSelectedDoc) {
      resetForm();
      setSubView('create');
      setCreateMethod('ai');
      handleAIGenerate(preSelectedDoc.id);
      if (onClearPreSelectedDoc) onClearPreSelectedDoc();
    }
  }, [preSelectedDoc, onClearPreSelectedDoc]);

  // ── Delete Set ─────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('Xóa bộ flashcard này? Hành động không thể hoàn tác.')) return;
    try {
      await api.deleteFlashcardSet(id);
      setSuccessMsg('Đã xóa bộ flashcard.');
      fetchSets();
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Không thể xóa bộ flashcard.');
    }
  };

  // ── Edit Set ───────────────────────────────────────────────────────────
  const handleEditSet = async (id: string) => {
    setLoading(true);
    try {
      const detail = await api.getFlashcardSetDetail(id);
      setEditingSetId(id);
      setFormTitle(detail.set.title);
      setFormSubject(detail.set.subject || '');
      setFormDescription(detail.set.description || '');
      setFormDocumentId(detail.set.document_id);
      setDraftCards(detail.cards.map(c => ({ id: c.id, front_text: c.front_text, back_text: c.back_text })));
      setCreateMethod(detail.set.creation_method === 'ai' ? 'ai' : 'manual');
      setSubView('edit');
    } catch (err: any) {
      setError(err.message || 'Không thể tải thông tin bộ flashcard.');
    } finally {
      setLoading(false);
    }
  };

  // ── Study ──────────────────────────────────────────────────────────────
  const startStudy = async (id: string) => {
    setStudyLoading(true);
    try {
      const detail = await api.getFlashcardSetDetail(id);
      setStudyDetail(detail);
      setCurrentCardIndex(0);
      setIsFlipped(false);
      const progressMap = new Map<string, FlashcardProgressItem>();
      detail.progress.forEach(p => progressMap.set(p.flashcard_id, p));
      setStudyProgress(progressMap);
      setSubView('study');
    } catch (err: any) {
      setError(err.message || 'Không thể mở bộ flashcard.');
    } finally {
      setStudyLoading(false);
    }
  };

  const markCard = async (status: 'learning' | 'known') => {
    if (!studyDetail) return;
    const card = studyDetail.cards[currentCardIndex];
    try {
      await api.recordFlashcardProgress(studyDetail.set.id, card.id, status);
      setStudyProgress(prev => {
        const next = new Map(prev);
        next.set(card.id, {
          flashcard_id: card.id,
          status,
          review_count: (prev.get(card.id)?.review_count || 0) + 1,
          last_reviewed_at: new Date().toISOString()
        });
        return next;
      });
      // Auto advance
      if (currentCardIndex < studyDetail.cards.length - 1) {
        setCurrentCardIndex(prev => prev + 1);
        setIsFlipped(false);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể ghi nhận tiến độ.');
    }
  };

  const goToCard = (idx: number) => {
    if (!studyDetail || idx < 0 || idx >= studyDetail.cards.length) return;
    setCurrentCardIndex(idx);
    setIsFlipped(false);
  };

  // ── Keyboard shortcuts for study ──────────────────────────────────────
  useEffect(() => {
    if (subView !== 'study' || !studyDetail) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          setIsFlipped(prev => !prev);
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToCard(currentCardIndex + 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goToCard(currentCardIndex - 1);
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [subView, studyDetail, currentCardIndex]);

  // ── Filtered sets ─────────────────────────────────────────────────────
  const filteredSets = sets.filter(s => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.subject.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q);
  });

  // ────────────────────────────────────────────────────────────────────────
  // ── RENDER: Study View ─────────────────────────────────────────────────
  // ────────────────────────────────────────────────────────────────────────
  if (subView === 'study' && studyDetail) {
    const card = studyDetail.cards[currentCardIndex];
    const totalCards = studyDetail.cards.length;
    const knownCards = Array.from(studyProgress.values()).filter((p: FlashcardProgressItem) => p.status === 'known').length;
    const progressPercent = totalCards > 0 ? Math.round((knownCards / totalCards) * 100) : 0;
    const currentProgress = card ? studyProgress.get(card.id) : undefined;

    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => { setSubView('list'); fetchSets(); }}
            className="p-2 rounded-xl hover:bg-slate-200/60 text-slate-500 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-800 truncate">{studyDetail.set.title}</h2>
            <p className="text-xs text-slate-500">{studyDetail.set.subject} · {knownCards}/{totalCards} đã nhớ</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span>Tiến độ ôn tập</span>
            <span className="font-semibold text-blue-600">{progressPercent}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Card */}
        {card && (
          <div
            ref={cardRef}
            onClick={() => setIsFlipped(prev => !prev)}
            className="relative w-full min-h-[280px] md:min-h-[320px] rounded-2xl cursor-pointer select-none mb-6"
            style={{ perspective: '1200px' }}
          >
            <div
              className="w-full h-full transition-transform duration-500 relative"
              style={{
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
              }}
            >
              {/* Front */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center p-6 md:p-10 rounded-2xl bg-gradient-to-br from-blue-50 via-white to-cyan-50 border-2 border-blue-200/60 shadow-lg"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="text-[10px] uppercase tracking-widest text-blue-400 font-semibold mb-3">Mặt trước</div>
                <p className="text-center text-lg md:text-xl font-semibold text-slate-800 leading-relaxed whitespace-pre-wrap break-words max-w-full">
                  {card.front_text}
                </p>
                <div className="mt-6 text-xs text-slate-400 flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> Nhấn để lật · Space
                </div>
              </div>

              {/* Back */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center p-6 md:p-10 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-2 border-emerald-200/60 shadow-lg"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <div className="text-[10px] uppercase tracking-widest text-emerald-400 font-semibold mb-3">Mặt sau</div>
                <p className="text-center text-base md:text-lg text-slate-700 leading-relaxed whitespace-pre-wrap break-words max-w-full">
                  {card.back_text}
                </p>
                <div className="mt-6 text-xs text-slate-400 flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> Nhấn để lật · Space
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Card counter */}
        <div className="text-center text-sm text-slate-500 mb-4">
          Thẻ {currentCardIndex + 1} / {totalCards}
          {currentProgress && (
            <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
              currentProgress.status === 'known'
                ? 'bg-emerald-100 text-emerald-700'
                : currentProgress.status === 'learning'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-100 text-slate-500'
            }`}>
              {currentProgress.status === 'known' ? 'Đã nhớ' : currentProgress.status === 'learning' ? 'Chưa nhớ' : 'Chưa ôn'}
            </span>
          )}
        </div>

        {/* Navigation and action buttons */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <button
            onClick={() => goToCard(currentCardIndex - 1)}
            disabled={currentCardIndex === 0}
            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>

          <button
            onClick={() => markCard('learning')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 font-medium text-sm hover:bg-amber-100 transition-colors cursor-pointer shadow-sm"
          >
            <X className="w-4 h-4" /> Chưa nhớ
          </button>

          <button
            onClick={() => markCard('known')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium text-sm hover:bg-emerald-100 transition-colors cursor-pointer shadow-sm"
          >
            <Check className="w-4 h-4" /> Đã nhớ
          </button>

          <button
            onClick={() => goToCard(currentCardIndex + 1)}
            disabled={currentCardIndex >= totalCards - 1}
            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Keyboard hint */}
        <p className="text-center text-[11px] text-slate-400">← → để chuyển thẻ · Space để lật</p>

        {/* Card dots for quick navigation */}
        {totalCards <= 40 && (
          <div className="flex flex-wrap justify-center gap-1.5 mt-5">
            {studyDetail.cards.map((c, idx) => {
              const p = studyProgress.get(c.id);
              let dotColor = 'bg-slate-300';
              if (p?.status === 'known') dotColor = 'bg-emerald-400';
              else if (p?.status === 'learning') dotColor = 'bg-amber-400';
              return (
                <button
                  key={c.id}
                  onClick={() => goToCard(idx)}
                  className={`w-3 h-3 rounded-full transition-all cursor-pointer ${dotColor} ${idx === currentCardIndex ? 'ring-2 ring-blue-400 ring-offset-1 scale-125' : 'hover:scale-110'}`}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  // ── RENDER: Create / Edit View ─────────────────────────────────────────
  // ────────────────────────────────────────────────────────────────────────
  if (subView === 'create' || subView === 'edit') {
    // Step 1: Choose method (only for create, not edit)
    if (subView === 'create' && createMethod === 'choose') {
      return (
        <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => { resetForm(); setSubView('list'); }} className="p-2 rounded-xl hover:bg-slate-200/60 text-slate-500 transition-colors cursor-pointer">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-800">Tạo bộ Flashcard mới</h2>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <p className="text-sm text-slate-600 mb-6">Chọn cách tạo bộ flashcard phù hợp với bạn:</p>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Manual */}
            <button
              onClick={() => setCreateMethod('manual')}
              className="group p-6 rounded-2xl bg-white border-2 border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all text-left cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                <Edit3 className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-bold text-slate-800 mb-2">Tạo thủ công</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Tự nhập nội dung hai mặt cho mỗi thẻ. Phù hợp khi bạn muốn tạo thẻ theo ý riêng hoặc ghi chú cá nhân.
              </p>
            </button>

            {/* AI */}
            <button
              onClick={() => setCreateMethod('ai')}
              className="group p-6 rounded-2xl bg-white border-2 border-slate-200 hover:border-cyan-400 hover:shadow-lg transition-all text-left cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center mb-4 group-hover:bg-cyan-100 transition-colors">
                <Sparkles className="w-6 h-6 text-cyan-600" />
              </div>
              <h3 className="font-bold text-slate-800 mb-2">Tạo bằng Aura AI</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Chọn tài liệu đã có trong thư viện, AI sẽ tự động tạo thẻ từ nội dung. Bạn có thể chỉnh sửa trước khi lưu.
              </p>
            </button>
          </div>
        </div>
      );
    }

    // Step 2 for AI: Select document
    if (subView === 'create' && createMethod === 'ai' && draftCards.length <= 1 && !draftCards[0]?.front_text.trim()) {
      return (
        <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setCreateMethod('choose')} className="p-2 rounded-xl hover:bg-slate-200/60 text-slate-500 transition-colors cursor-pointer">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-800">Chọn tài liệu nguồn</h2>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {aiLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
              <p className="text-sm text-slate-600 font-medium">Aura AI đang tạo flashcard từ tài liệu...</p>
              <p className="text-xs text-slate-400 mt-1">Quá trình có thể mất 10-20 giây</p>
            </div>
          )}

          {!aiLoading && (
            <>
              {documents.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">Chưa có tài liệu nào. Hãy tải lên tài liệu trước.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.filter(d => d.status === 'ready').map(doc => (
                    <button
                      key={doc.id}
                      onClick={() => handleAIGenerate(doc.id)}
                      className="w-full flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all text-left cursor-pointer"
                    >
                      <FileText className="w-5 h-5 text-blue-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate">{doc.title}</p>
                        <p className="text-xs text-slate-500">{doc.subject} · {doc.file_type.toUpperCase()}</p>
                      </div>
                      <Sparkles className="w-4 h-4 text-cyan-500 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => setCreateMethod('manual')}
                className="mt-4 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" /> Hoặc tạo thủ công
              </button>
            </>
          )}
        </div>
      );
    }

    // Step 3: Card editor (shared between manual and AI)
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => {
              if (subView === 'edit') { resetForm(); setSubView('list'); }
              else if (createMethod === 'ai' && draftCards.some(c => c.front_text.trim())) { /* stay */ setCreateMethod('ai'); setDraftCards([{ front_text: '', back_text: '' }]); }
              else { setCreateMethod('choose'); }
            }}
            className="p-2 rounded-xl hover:bg-slate-200/60 text-slate-500 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-slate-800">
            {subView === 'edit' ? 'Chỉnh sửa bộ Flashcard' : createMethod === 'ai' ? 'Xem trước & chỉnh sửa thẻ AI' : 'Tạo bộ Flashcard thủ công'}
          </h2>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" /> {successMsg}
          </div>
        )}

        {/* Set metadata */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tên bộ flashcard *</label>
            <input
              type="text"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="VD: Từ vựng tiếng Anh Unit 5"
              maxLength={200}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Môn học</label>
              <input
                type="text"
                value={formSubject}
                onChange={e => setFormSubject(e.target.value)}
                placeholder="VD: Tiếng Anh"
                maxLength={100}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Mô tả (tùy chọn)</label>
              <input
                type="text"
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                placeholder="Mô tả ngắn gọn..."
                maxLength={500}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Cards */}
        <div className="space-y-3 mb-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700">{draftCards.length} thẻ</h3>
            <button
              onClick={addCard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm thẻ
            </button>
          </div>

          {draftCards.map((card, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Thẻ #{idx + 1}</span>
                <button
                  onClick={() => removeCard(idx)}
                  disabled={draftCards.length <= 1}
                  className="p-1 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-blue-500 mb-1">Mặt trước</label>
                  <textarea
                    value={card.front_text}
                    onChange={e => updateCard(idx, 'front_text', e.target.value)}
                    placeholder="Câu hỏi hoặc thuật ngữ..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-blue-50/50 border border-blue-100 text-sm text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-emerald-500 mb-1">Mặt sau</label>
                  <textarea
                    value={card.back_text}
                    onChange={e => updateCard(idx, 'back_text', e.target.value)}
                    placeholder="Câu trả lời hoặc giải thích..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-emerald-50/50 border border-emerald-100 text-sm text-slate-800 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all resize-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Save buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm shadow-blue-200"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {subView === 'edit' ? 'Lưu thay đổi' : 'Lưu bộ flashcard'}
          </button>
          <button
            onClick={() => { resetForm(); setSubView('list'); }}
            className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-medium text-sm hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Hủy
          </button>
          {draftCards.filter(c => c.front_text.trim() && c.back_text.trim()).length < draftCards.length && (
            <span className="text-xs text-amber-600">
              {draftCards.length - draftCards.filter(c => c.front_text.trim() && c.back_text.trim()).length} thẻ chưa hoàn thành sẽ bị bỏ qua
            </span>
          )}
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  // ── RENDER: List View (default) ────────────────────────────────────────
  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-blue-600" />
            Flashcard
          </h1>
          <p className="text-sm text-slate-500 mt-1">Tạo và ôn tập thẻ ghi nhớ cho các môn học</p>
        </div>
        <button
          onClick={() => { resetForm(); setSubView('create'); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors cursor-pointer shadow-sm shadow-blue-200"
        >
          <Plus className="w-4 h-4" /> Tạo bộ flashcard
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" /> {successMsg}
        </div>
      )}

      {/* Search */}
      {sets.length > 0 && (
        <div className="relative mb-5">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm bộ flashcard..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && sets.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 flex items-center justify-center mx-auto mb-4">
            <Brain className="w-10 h-10 text-blue-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">Chưa có bộ flashcard nào</h3>
          <p className="text-sm text-slate-500 mb-5 max-w-sm mx-auto">
            Tạo bộ flashcard đầu tiên để bắt đầu ôn tập. Bạn có thể tạo thủ công hoặc để Aura AI tạo từ tài liệu.
          </p>
          <button
            onClick={() => { resetForm(); setSubView('create'); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" /> Tạo bộ flashcard
          </button>
        </div>
      )}

      {/* Set list */}
      {!loading && filteredSets.length > 0 && (
        <div className="grid gap-3">
          {filteredSets.map(set => {
            const progressPercent = set.card_count > 0 ? Math.round((set.known_count / set.card_count) * 100) : 0;
            return (
              <div
                key={set.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 hover:shadow-md hover:border-blue-200/60 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="font-bold text-slate-800 truncate">{set.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                        set.creation_method === 'ai' ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {set.creation_method === 'ai' ? '✦ AI' : 'Thủ công'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mb-2">
                      <span className="font-medium text-blue-600">{set.subject}</span>
                      <span>{set.card_count} thẻ</span>
                      {set.document_title && (
                        <span className="flex items-center gap-1 truncate max-w-[200px]">
                          <FileText className="w-3 h-3 shrink-0" /> {set.document_title}
                        </span>
                      )}
                    </div>
                    {set.description && (
                      <p className="text-xs text-slate-400 line-clamp-1">{set.description}</p>
                    )}

                    {/* Progress bar */}
                    {set.card_count > 0 && (
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full transition-all"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500">{set.known_count}/{set.card_count}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => startStudy(set.id)}
                      disabled={studyLoading || set.card_count === 0}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
                    >
                      {studyLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                      Học
                    </button>
                    <button
                      onClick={() => handleEditSet(set.id)}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(set.id)}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* No results for search */}
      {!loading && sets.length > 0 && filteredSets.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Không tìm thấy bộ flashcard nào phù hợp với "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
};
