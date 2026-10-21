-- Migration: 0001_flashcards.sql
-- Description: Create flashcard_sets, flashcards, and flashcard_progress tables with foreign keys and indexes

CREATE TABLE IF NOT EXISTS "flashcard_sets" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "document_id" text,
  "title" text NOT NULL,
  "subject" text DEFAULT 'General',
  "description" text,
  "creation_method" text DEFAULT 'manual',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "flashcards" (
  "id" text PRIMARY KEY NOT NULL,
  "set_id" text NOT NULL REFERENCES "flashcard_sets"("id") ON DELETE CASCADE,
  "front_text" text NOT NULL,
  "back_text" text NOT NULL,
  "position" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "flashcard_progress" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "flashcard_id" text NOT NULL REFERENCES "flashcards"("id") ON DELETE CASCADE,
  "status" text DEFAULT 'new',
  "review_count" integer DEFAULT 0,
  "last_reviewed_at" timestamp,
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_flashcard_sets_user_id" ON "flashcard_sets" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_flashcard_sets_document_id" ON "flashcard_sets" ("document_id");
CREATE INDEX IF NOT EXISTS "idx_flashcards_set_id" ON "flashcards" ("set_id");
CREATE INDEX IF NOT EXISTS "idx_flashcard_progress_user_card" ON "flashcard_progress" ("user_id", "flashcard_id");
