-- Migration 008: Add Malayalam fields to posts
-- Enables bilingual (English + Malayalam) posts and announcements

alter table public.posts
  add column if not exists title_ml text,
  add column if not exists body_ml  text;
