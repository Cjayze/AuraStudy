import { randomUUID } from 'node:crypto';
import { Router, Response } from 'express';
import { getDb, saveDb, ensureDocumentCleanText, FlashcardSetRecord, FlashcardRecord } from '../db';
import { authenticateToken, AuthRequest } from '../auth';
import { generateFlashcardDrafts } from '../flashcardGenerator';

export const flashcardRouter = Router();

type CardInput = { front_text?: unknown; back_text?: unknown };

function normalizeCards(input: unknown): Array<{ front_text: string; back_text: string }> | null {
  if (!Array.isArray(input) || input.length < 1 || input.length > 200) return null;
  const cards = input.map((item: CardInput) => ({
    front_text: typeof item?.front_text === 'string' ? item.front_text.trim() : '',
    back_text: typeof item?.back_text === 'string' ? item.back_text.trim() : ''
  }));
  if (cards.some((card) => !card.front_text || !card.back_text || card.front_text.length > 3000 || card.back_text.length > 5000)) return null;
  return cards;
}

function findOwnedSet(userId: string, setId: string) {
  const db = getDb();
  const set = db.flashcard_sets.find((item) => item.id === setId && item.user_id === userId);
  return set ? { db, set } : null;
}

function serializeSet(set: FlashcardSetRecord, userId: string, includeCards = false) {
  const db = getDb();
  const cards = db.flashcards
    .filter((card) => card.set_id === set.id)
    .sort((a, b) => a.position - b.position)
    .map((card) => {
      const progress = db.flashcard_progress.find((item) => item.flashcard_id === card.id && item.user_id === userId);
      return {
        id: card.id,
        set_id: card.set_id,
        front_text: card.front_text,
        back_text: card.back_text,
        position: card.position,
        status: progress?.status || 'new',
        review_count: progress?.review_count || 0,
        last_reviewed_at: progress?.last_reviewed_at || null
      };
    });
  const sourceDocument = set.document_id ? db.documents.find((item) => item.id === set.document_id) : undefined;
  const result = {
    id: set.id,
    title: set.title,
    subject: set.subject,
    description: set.description || null,
    document_id: set.document_id || null,
    document_title: sourceDocument?.title || null,
    creation_method: set.creation_method,
    created_at: set.created_at,
    updated_at: set.updated_at,
    total_cards: cards.length,
    known_cards: cards.filter((card) => card.status === 'known').length
  };
  return includeCards ? { ...result, cards } : result;
}

flashcardRouter.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const sets = db.flashcard_sets
    .filter((set) => set.user_id === req.user!.id)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((set) => serializeSet(set, req.user!.id));
  return res.json({ status: 'success', data: sets });
});

flashcardRouter.post('/generate', authenticateToken, async (req: AuthRequest, res: Response) => {
  const documentId = String(req.body?.document_id || '');
  const db = getDb();
  const document = db.documents.find((item) => item.id === documentId && item.user_id === req.user!.id && item.status === 'ready');
  if (!document) return res.status(404).json({ status: 'error', message: 'Không tìm thấy tài liệu sẵn sàng sử dụng trong thư viện của bạn.' });
  try {
    const sourceText = await ensureDocumentCleanText(document);
    const cards = await generateFlashcardDrafts(sourceText);
    return res.json({ status: 'success', data: { cards, document_id: document.id, document_title: document.title } });
  } catch (error: any) {
    return res.status(503).json({ status: 'error', message: error?.message || 'Aura AI chưa thể tạo flashcard từ tài liệu này.' });
  }
});

flashcardRouter.post('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : '';
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
  const cards = normalizeCards(req.body?.cards);
  const creationMethod = req.body?.creation_method === 'ai' ? 'ai' : 'manual';
  const documentId = req.body?.document_id ? String(req.body.document_id) : null;
  if (!title || title.length > 160 || subject.length > 100 || description.length > 1000 || !cards) {
    return res.status(400).json({ status: 'error', message: 'Hãy nhập tên bộ thẻ và từ 1 đến 200 thẻ có đủ mặt trước, mặt sau.' });
  }
  const db = getDb();
  if (documentId && !db.documents.some((doc) => doc.id === documentId && doc.user_id === req.user!.id)) {
    return res.status(404).json({ status: 'error', message: 'Không tìm thấy tài liệu nguồn trong thư viện của bạn.' });
  }
  const now = new Date().toISOString();
  const set: FlashcardSetRecord = {
    id: `fset_${randomUUID()}`,
    user_id: req.user!.id,
    document_id: documentId,
    title,
    subject: subject || 'Chung',
    description: description || null,
    creation_method: creationMethod,
    created_at: now,
    updated_at: now
  };
  db.flashcard_sets.push(set);
  db.flashcards.push(...cards.map((card, position): FlashcardRecord => ({
    id: `fc_${randomUUID()}`,
    set_id: set.id,
    ...card,
    position,
    created_at: now,
    updated_at: now
  })));
  saveDb();
  return res.status(201).json({ status: 'success', data: serializeSet(set, req.user!.id, true) });
});

flashcardRouter.get('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const owned = findOwnedSet(req.user!.id, req.params.id);
  if (!owned) return res.status(404).json({ status: 'error', message: 'Không tìm thấy bộ flashcard.' });
  return res.json({ status: 'success', data: serializeSet(owned.set, req.user!.id, true) });
});

flashcardRouter.put('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const owned = findOwnedSet(req.user!.id, req.params.id);
  if (!owned) return res.status(404).json({ status: 'error', message: 'Không tìm thấy bộ flashcard.' });
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : '';
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
  const cards = normalizeCards(req.body?.cards);
  if (!title || title.length > 160 || subject.length > 100 || description.length > 1000 || !cards) {
    return res.status(400).json({ status: 'error', message: 'Hãy nhập tên bộ thẻ và từ 1 đến 200 thẻ hợp lệ.' });
  }
  const now = new Date().toISOString();
  const existingCards = owned.db.flashcards.filter((card) => card.set_id === owned.set.id).sort((a, b) => a.position - b.position);
  const removedIds = new Set(existingCards.slice(cards.length).map((card) => card.id));
  owned.db.flashcards = owned.db.flashcards.filter((card) => !removedIds.has(card.id));
  owned.db.flashcard_progress = owned.db.flashcard_progress.filter((progress) => !removedIds.has(progress.flashcard_id));
  owned.set.title = title;
  owned.set.subject = subject || 'Chung';
  owned.set.description = description || null;
  owned.set.updated_at = now;
  cards.forEach((card, position) => {
    const existing = existingCards[position];
    if (existing) Object.assign(existing, card, { position, updated_at: now });
    else owned.db.flashcards.push({ id: `fc_${randomUUID()}`, set_id: owned.set.id, ...card, position, created_at: now, updated_at: now });
  });
  saveDb();
  return res.json({ status: 'success', data: serializeSet(owned.set, req.user!.id, true) });
});

flashcardRouter.delete('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const owned = findOwnedSet(req.user!.id, req.params.id);
  if (!owned) return res.status(404).json({ status: 'error', message: 'Không tìm thấy bộ flashcard.' });
  const cardIds = new Set(owned.db.flashcards.filter((card) => card.set_id === owned.set.id).map((card) => card.id));
  owned.db.flashcard_sets = owned.db.flashcard_sets.filter((set) => set.id !== owned.set.id);
  owned.db.flashcards = owned.db.flashcards.filter((card) => card.set_id !== owned.set.id);
  owned.db.flashcard_progress = owned.db.flashcard_progress.filter((progress) => !cardIds.has(progress.flashcard_id));
  saveDb();
  return res.json({ status: 'success', message: 'Đã xóa bộ flashcard.' });
});

flashcardRouter.post('/:id/progress', authenticateToken, (req: AuthRequest, res: Response) => {
  const owned = findOwnedSet(req.user!.id, req.params.id);
  const cardId = String(req.body?.card_id || '');
  const status = req.body?.status;
  if (!owned) return res.status(404).json({ status: 'error', message: 'Không tìm thấy bộ flashcard.' });
  if (status !== 'learning' && status !== 'known') return res.status(400).json({ status: 'error', message: 'Trạng thái ôn tập không hợp lệ.' });
  if (!owned.db.flashcards.some((card) => card.id === cardId && card.set_id === owned.set.id)) {
    return res.status(404).json({ status: 'error', message: 'Không tìm thấy thẻ trong bộ flashcard này.' });
  }
  const now = new Date().toISOString();
  let progress = owned.db.flashcard_progress.find((item) => item.flashcard_id === cardId && item.user_id === req.user!.id);
  if (!progress) {
    progress = { id: `fcp_${randomUUID()}`, user_id: req.user!.id, flashcard_id: cardId, status, review_count: 1, last_reviewed_at: now, updated_at: now };
    owned.db.flashcard_progress.push(progress);
  } else {
    progress.status = status;
    progress.review_count += 1;
    progress.last_reviewed_at = now;
    progress.updated_at = now;
  }
  owned.set.updated_at = now;
  saveDb();
  return res.json({ status: 'success', data: progress });
});

flashcardRouter.post('/:id/cards', authenticateToken, (req: AuthRequest, res: Response) => {
  const owned = findOwnedSet(req.user!.id, req.params.id);
  const frontText = typeof req.body?.front_text === 'string' ? req.body.front_text.trim() : '';
  const backText = typeof req.body?.back_text === 'string' ? req.body.back_text.trim() : '';
  if (!owned) return res.status(404).json({ status: 'error', message: 'Không tìm thấy bộ flashcard.' });
  if (!frontText || !backText || frontText.length > 3000 || backText.length > 5000) return res.status(400).json({ status: 'error', message: 'Hãy nhập đủ mặt trước và mặt sau.' });
  const now = new Date().toISOString();
  const card: FlashcardRecord = { id: `fc_${randomUUID()}`, set_id: owned.set.id, front_text: frontText, back_text: backText, position: owned.db.flashcards.filter((item) => item.set_id === owned.set.id).length, created_at: now, updated_at: now };
  owned.db.flashcards.push(card);
  owned.set.updated_at = now;
  saveDb();
  return res.status(201).json({ status: 'success', data: { ...card, status: 'new', review_count: 0, last_reviewed_at: null } });
});

flashcardRouter.put('/cards/:cardId', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const card = db.flashcards.find((item) => item.id === req.params.cardId);
  const set = card && db.flashcard_sets.find((item) => item.id === card.set_id && item.user_id === req.user!.id);
  if (!card || !set) return res.status(404).json({ status: 'error', message: 'Không tìm thấy thẻ flashcard.' });
  const frontText = typeof req.body?.front_text === 'string' ? req.body.front_text.trim() : '';
  const backText = typeof req.body?.back_text === 'string' ? req.body.back_text.trim() : '';
  if (!frontText || !backText || frontText.length > 3000 || backText.length > 5000) return res.status(400).json({ status: 'error', message: 'Hãy nhập đủ mặt trước và mặt sau.' });
  const now = new Date().toISOString();
  card.front_text = frontText;
  card.back_text = backText;
  card.updated_at = now;
  set.updated_at = now;
  saveDb();
  return res.json({ status: 'success', data: card });
});

flashcardRouter.delete('/cards/:cardId', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const card = db.flashcards.find((item) => item.id === req.params.cardId);
  const set = card && db.flashcard_sets.find((item) => item.id === card.set_id && item.user_id === req.user!.id);
  if (!card || !set) return res.status(404).json({ status: 'error', message: 'Không tìm thấy thẻ flashcard.' });
  db.flashcards = db.flashcards.filter((item) => item.id !== card.id);
  db.flashcard_progress = db.flashcard_progress.filter((item) => item.flashcard_id !== card.id);
  db.flashcards.filter((item) => item.set_id === set.id).forEach((item, index) => { item.position = index; });
  set.updated_at = new Date().toISOString();
  saveDb();
  return res.json({ status: 'success', message: 'Đã xóa thẻ flashcard.' });
});
