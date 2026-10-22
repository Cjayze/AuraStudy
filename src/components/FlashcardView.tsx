import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, BookOpen, Check, ChevronLeft, ChevronRight, CircleHelp,
  FileText, Layers3, LoaderCircle, Pencil, Plus, RotateCcw, Sparkles, Trash2,
  WandSparkles, X
} from 'lucide-react';
import { api } from '../services/api';
import { DocumentItem, FlashcardDraft, FlashcardSet } from '../types';

interface FlashcardViewProps {
  sets: FlashcardSet[];
  documents: DocumentItem[];
  loading: boolean;
  onRefresh: () => Promise<void> | void;
}

type CreateMode = 'choose' | 'manual' | 'ai';

const blankCard = (): FlashcardDraft => ({ front_text: '', back_text: '' });

export const FlashcardView: React.FC<FlashcardViewProps> = ({ sets, documents, loading, onRefresh }) => {
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [mode, setMode] = useState<CreateMode>('choose');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [cards, setCards] = useState<FlashcardDraft[]>([]);
  const [aiDocumentId, setAiDocumentId] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [activeSet, setActiveSet] = useState<FlashcardSet | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);

  const readyDocuments = useMemo(() => documents.filter((doc) => doc.status === 'ready'), [documents]);
  const resetCreator = () => {
    setCreatorOpen(false);
    setMode('choose');
    setEditingId(null);
    setTitle('');
    setSubject('');
    setDescription('');
    setDocumentId('');
    setAiDocumentId('');
    setCards([]);
    setError('');
  };

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const startManual = () => {
    setMode('manual');
    if (!cards.length) setCards([blankCard()]);
    setError('');
  };

  const startAi = () => {
    setMode('ai');
    setError('');
  };

  const generateCards = async () => {
    if (!aiDocumentId) {
      setError('Chọn tài liệu trong thư viện để Aura AI tạo thẻ.');
      return;
    }
    setAiLoading(true);
    setError('');
    try {
      const result = await api.generateFlashcards(aiDocumentId);
      setCards(result.cards);
      setDocumentId(result.document_id);
      setTitle((current) => current || `Flashcard - ${result.document_title}`);
      const doc = readyDocuments.find((item) => item.id === result.document_id);
      if (doc) setSubject((current) => current || doc.subject || 'Chung');
    } catch (err: any) {
      setError(err?.message || 'Aura AI chưa tạo được flashcard.');
    } finally {
      setAiLoading(false);
    }
  };

  const saveSet = async () => {
    const validCards = cards.map((card) => ({ front_text: card.front_text.trim(), back_text: card.back_text.trim() }));
    if (!title.trim()) return setError('Nhập tên cho bộ flashcard.');
    if (!validCards.length || validCards.some((card) => !card.front_text || !card.back_text)) {
      return setError('Mỗi thẻ cần có đủ mặt trước và mặt sau.');
    }
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await api.updateFlashcardSet(editingId, { title, subject, description, cards: validCards });
        setNotice('Đã cập nhật bộ flashcard.');
      } else {
        await api.createFlashcardSet({
          title, subject, description, document_id: documentId || null,
          creation_method: mode === 'ai' ? 'ai' : 'manual', cards: validCards
        });
        setNotice('Đã lưu bộ flashcard.');
      }
      resetCreator();
      await onRefresh();
    } catch (err: any) {
      setError(err?.message || 'Không thể lưu bộ flashcard.');
    } finally {
      setSaving(false);
    }
  };

  const editSet = async (set: FlashcardSet) => {
    setError('');
    try {
      const detail = await api.getFlashcardSet(set.id);
      setEditingId(detail.id);
      setTitle(detail.title);
      setSubject(detail.subject || '');
      setDescription(detail.description || '');
      setDocumentId(detail.document_id || '');
      setCards((detail.cards || []).map(({ front_text, back_text }) => ({ front_text, back_text })));
      setMode('manual');
      setCreatorOpen(true);
    } catch (err: any) {
      setNotice(err?.message || 'Không thể mở bộ thẻ để chỉnh sửa.');
    }
  };

  const deleteSet = async (set: FlashcardSet) => {
    if (!window.confirm(`Xóa bộ flashcard “${set.title}” và toàn bộ tiến độ ôn tập?`)) return;
    try {
      await api.deleteFlashcardSet(set.id);
      setNotice('Đã xóa bộ flashcard.');
      await onRefresh();
    } catch (err: any) {
      setNotice(err?.message || 'Không thể xóa bộ flashcard.');
    }
  };

  const beginStudy = async (set: FlashcardSet) => {
    try {
      const detail = await api.getFlashcardSet(set.id);
      if (!detail.cards?.length) {
        setNotice('Bộ thẻ này chưa có flashcard.');
        return;
      }
      setActiveSet(detail);
      setActiveIndex(0);
      setFlipped(false);
    } catch (err: any) {
      setNotice(err?.message || 'Không thể tải bộ flashcard.');
    }
  };

  const markCard = async (status: 'learning' | 'known') => {
    if (!activeSet?.cards?.[activeIndex]) return;
    setReviewSaving(true);
    const card = activeSet.cards[activeIndex];
    try {
      await api.reviewFlashcard(activeSet.id, card.id, status);
      const nextCards = activeSet.cards.map((item, index) => index === activeIndex
        ? { ...item, status, review_count: item.review_count + 1, last_reviewed_at: new Date().toISOString() }
        : item);
      setActiveSet({ ...activeSet, cards: nextCards, known_cards: nextCards.filter((item) => item.status === 'known').length });
      if (activeIndex < nextCards.length - 1) {
        setActiveIndex(activeIndex + 1);
        setFlipped(false);
      } else {
        setNotice('Đã hoàn thành lượt ôn tập. Bạn có thể tiếp tục ôn hoặc quay lại bộ thẻ.');
        void onRefresh();
      }
    } catch (err: any) {
      setNotice(err?.message || 'Không lưu được tiến độ ôn tập.');
    } finally {
      setReviewSaving(false);
    }
  };

  const moveCard = (step: number) => {
    if (!activeSet?.cards?.length) return;
    setActiveIndex((index) => (index + step + activeSet.cards!.length) % activeSet.cards!.length);
    setFlipped(false);
  };

  useEffect(() => {
    if (!activeSet) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, button')) return;
      if (event.code === 'Space') {
        event.preventDefault();
        setFlipped((value) => !value);
      } else if (event.key === 'ArrowRight') moveCard(1);
      else if (event.key === 'ArrowLeft') moveCard(-1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeSet, activeIndex]);

  if (activeSet?.cards?.length) {
    const card = activeSet.cards[activeIndex];
    const progressPercent = Math.round(((activeIndex + 1) / activeSet.cards.length) * 100);
    return (
      <div className="mx-auto flex min-h-[calc(100vh-61px)] max-w-5xl flex-col px-4 py-5 sm:px-8 sm:py-8">
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => { setActiveSet(null); void onRefresh(); }} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Quay lại bộ thẻ
          </button>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm">{activeSet.subject}</span>
        </div>

        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center py-8">
          <div className="mb-6 text-center">
            <p className="text-sm font-medium text-blue-700">{activeSet.title}</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Ôn tập flashcard</h1>
            <p className="mt-2 text-sm text-slate-500">Thẻ {activeIndex + 1} / {activeSet.cards.length}</p>
          </div>

          <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>

          <button
            type="button"
            aria-label={flipped ? 'Lật về mặt câu hỏi' : 'Lật để xem câu trả lời'}
            aria-pressed={flipped}
            onClick={() => setFlipped((value) => !value)}
            className="flashcard-scene group my-4 block w-full cursor-pointer text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
          >
            <span className={`flashcard-inner ${flipped ? 'is-flipped' : ''}`}>
              <span className="flashcard-face flashcard-front">
                <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"><CircleHelp className="h-4 w-4" /> Câu hỏi</span>
                <span className="flashcard-copy">{card.front_text}</span>
                <span className="mt-7 text-sm text-slate-400">Nhấn để lật thẻ · Space</span>
              </span>
              <span className="flashcard-face flashcard-back">
                <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-blue-800"><BookOpen className="h-4 w-4" /> Trả lời</span>
                <span className="flashcard-copy">{card.back_text}</span>
                <span className="mt-7 text-sm text-blue-700/65">Nhấn để xem lại câu hỏi</span>
              </span>
            </span>
          </button>

          <div className="mt-3 flex items-center justify-between gap-3">
            <button type="button" onClick={() => moveCard(-1)} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /> Trước</button>
            <div className="flex gap-2">
              <button type="button" disabled={reviewSaving} onClick={() => void markCard('learning')} className="inline-flex h-11 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"><RotateCcw className="h-4 w-4" /> Chưa nhớ</button>
              <button type="button" disabled={reviewSaving} onClick={() => void markCard('known')} className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"><Check className="h-4 w-4" /> Đã nhớ</button>
            </div>
            <button type="button" onClick={() => moveCard(1)} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Sau <ChevronRight className="h-4 w-4" /></button>
          </div>
          <p className="mt-5 text-center text-xs text-slate-400">Đã nhớ {activeSet.known_cards} / {activeSet.total_cards} thẻ trong bộ</p>
        </div>
        {notice && <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">{notice}</div>}
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-[calc(100vh-61px)] max-w-6xl px-4 py-6 sm:px-8 sm:py-9">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-700"><Layers3 className="h-4 w-4" /> Không gian ghi nhớ</div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Flashcard</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Tạo bộ thẻ theo cách của bạn hoặc để Aura AI rút ra kiến thức chính từ tài liệu.</p>
        </div>
        <button onClick={() => { resetCreator(); setCreatorOpen(true); }} className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"><Plus className="h-4 w-4" /> Tạo bộ flashcard</button>
      </div>

      {loading ? (
        <div className="flex min-h-56 items-center justify-center text-sm text-slate-500"><LoaderCircle className="mr-2 h-5 w-5 animate-spin text-blue-600" /> Đang tải bộ thẻ...</div>
      ) : sets.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sets.map((set) => {
            const completion = set.total_cards ? Math.round((set.known_cards / set.total_cards) * 100) : 0;
            return (
              <article key={set.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="h-1.5 bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400" />
                <div className="p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{set.subject || 'Chung'}</span>
                    <span className="text-xs text-slate-400">{set.creation_method === 'ai' ? 'Tạo bằng Aura AI' : 'Tạo thủ công'}</span>
                  </div>
                  <h2 className="line-clamp-2 min-h-14 text-lg font-bold text-slate-900">{set.title}</h2>
                  {set.description && <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">{set.description}</p>}
                  {set.document_title && <div className="mt-3 flex items-center gap-1.5 truncate text-xs text-slate-400"><FileText className="h-3.5 w-3.5 shrink-0" />{set.document_title}</div>}
                  <div className="mt-5 flex items-center justify-between text-xs font-medium text-slate-500"><span>{set.total_cards} thẻ</span><span>{set.known_cards} đã nhớ</span></div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${completion}%` }} /></div>
                  <div className="mt-5 flex gap-2">
                    <button onClick={() => void beginStudy(set)} disabled={!set.total_cards} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"><BookOpen className="h-4 w-4" /> Học ngay</button>
                    <button aria-label="Chỉnh sửa bộ thẻ" onClick={() => void editSet(set)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-blue-700"><Pencil className="h-4 w-4" /></button>
                    <button aria-label="Xóa bộ thẻ" onClick={() => void deleteSet(set)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-blue-200 bg-white/70 px-6 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Layers3 className="h-7 w-7" /></div>
          <h2 className="text-lg font-bold text-slate-900">Chưa có bộ flashcard nào</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Tạo thẻ thủ công cho những kiến thức cần nhớ hoặc chọn tài liệu để Aura AI tạo bản nháp cho bạn.</p>
          <button onClick={() => { resetCreator(); setCreatorOpen(true); }} className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"><Plus className="h-4 w-4" /> Tạo bộ đầu tiên</button>
        </div>
      )}

      {creatorOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving && !aiLoading) resetCreator(); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="flashcard-modal-title" className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-blue-700"><Layers3 className="h-4 w-4" /> Flashcard</div>
                <h2 id="flashcard-modal-title" className="text-xl font-bold text-slate-900">{editingId ? 'Chỉnh sửa bộ thẻ' : mode === 'choose' ? 'Tạo bộ flashcard' : mode === 'ai' ? 'Tạo bằng Aura AI' : 'Tạo thủ công'}</h2>
                <p className="mt-1 text-sm text-slate-500">{mode === 'choose' ? 'Chọn cách phù hợp để bắt đầu bộ thẻ.' : 'Xem lại và chỉnh sửa nội dung trước khi lưu.'}</p>
              </div>
              <button onClick={resetCreator} disabled={saving || aiLoading} aria-label="Đóng" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"><X className="h-5 w-5" /></button>
            </div>

            {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">{error}</div>}

            {mode === 'choose' && !editingId ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <button onClick={startManual} className="group rounded-2xl border border-slate-200 p-5 text-left transition hover:border-blue-300 hover:bg-blue-50/50">
                  <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-blue-100 group-hover:text-blue-700"><Pencil className="h-5 w-5" /></span>
                  <span className="block font-bold text-slate-900">Tạo thủ công</span><span className="mt-1 block text-sm leading-5 text-slate-500">Tự viết câu hỏi và câu trả lời cho từng thẻ.</span>
                </button>
                <button onClick={startAi} className="group rounded-2xl border border-blue-200 bg-blue-50/40 p-5 text-left transition hover:border-blue-400 hover:bg-blue-50">
                  <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm"><WandSparkles className="h-5 w-5" /></span>
                  <span className="block font-bold text-slate-900">Tạo bằng Aura AI</span><span className="mt-1 block text-sm leading-5 text-slate-500">Chọn tài liệu để tạo bản nháp rồi tự chỉnh sửa.</span>
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {mode === 'ai' && !cards.length && (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 sm:p-5">
                    <label htmlFor="flashcard-ai-document" className="mb-2 block text-sm font-semibold text-slate-800">Chọn tài liệu học tập</label>
                    <select id="flashcard-ai-document" value={aiDocumentId} onChange={(event) => setAiDocumentId(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100">
                      <option value="">Chọn tài liệu trong thư viện</option>
                      {readyDocuments.map((doc) => <option key={doc.id} value={doc.id}>{doc.title} · {doc.subject}</option>)}
                    </select>
                    {!readyDocuments.length && <p className="mt-2 text-xs text-slate-500">Bạn cần có tài liệu đã xử lý xong trong thư viện trước.</p>}
                    <button onClick={() => void generateCards()} disabled={aiLoading || !readyDocuments.length} className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{aiLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{aiLoading ? 'Đang tạo bản nháp...' : 'Tạo bản nháp flashcard'}</button>
                  </div>
                )}

                {(mode === 'manual' || cards.length > 0) && (
                  <>
                    {mode === 'ai' && cards.length > 0 && <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><span>Aura AI đã tạo {cards.length} thẻ. Hãy xem lại trước khi lưu.</span><button onClick={() => { setCards([]); setDocumentId(''); }} className="font-semibold underline">Chọn tài liệu khác</button></div>}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-sm font-semibold text-slate-700">Tên bộ thẻ<input value={title} maxLength={160} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Khái niệm mạng máy tính" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" /></label>
                      <label className="text-sm font-semibold text-slate-700">Môn học<input value={subject} maxLength={100} onChange={(event) => setSubject(event.target.value)} placeholder="Ví dụ: Mạng máy tính" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" /></label>
                    </div>
                    <label className="block text-sm font-semibold text-slate-700">Mô tả <span className="font-normal text-slate-400">(không bắt buộc)</span><input value={description} maxLength={1000} onChange={(event) => setDescription(event.target.value)} placeholder="Ghi chú ngắn về bộ thẻ" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" /></label>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2"><h3 className="font-bold text-slate-900">Thẻ ({cards.length})</h3><button onClick={() => setCards((current) => [...current, blankCard()])} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"><Plus className="h-4 w-4" /> Thêm thẻ</button></div>
                    <div className="max-h-[36vh] space-y-3 overflow-y-auto pr-1">
                      {cards.map((card, index) => (
                        <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
                          <div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wide text-slate-400">Thẻ {index + 1}</span><button aria-label={`Xóa thẻ ${index + 1}`} onClick={() => setCards((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <label className="text-xs font-semibold text-slate-600">Mặt trước<textarea value={card.front_text} maxLength={3000} onChange={(event) => setCards((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, front_text: event.target.value } : item))} rows={3} placeholder="Câu hỏi hoặc thuật ngữ" className="mt-1 block w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal leading-5 text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" /></label>
                            <label className="text-xs font-semibold text-slate-600">Mặt sau<textarea value={card.back_text} maxLength={5000} onChange={(event) => setCards((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, back_text: event.target.value } : item))} rows={3} placeholder="Câu trả lời hoặc giải thích" className="mt-1 block w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal leading-5 text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" /></label>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col-reverse justify-between gap-2 border-t border-slate-100 pt-4 sm:flex-row">
                      {!editingId && <button onClick={() => setMode('choose')} className="h-10 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100">Đổi cách tạo</button>}
                      <button onClick={() => void saveSet()} disabled={saving || aiLoading || (mode === 'ai' && !cards.length)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:ml-auto">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{saving ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Xác nhận và lưu bộ thẻ'}</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {notice && <div role="status" className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">{notice}</div>}
    </div>
  );
};
