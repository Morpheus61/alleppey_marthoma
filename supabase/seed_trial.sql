-- seed_trial.sql — Bhagam (prayer group) seed data
-- Run AFTER migrations 001–028 in Supabase SQL Editor.
-- Creates the 10 standard prayer groups for St. George Marthoma, Alappuzha.
-- Update house_count and name_ml to match the actual register.
-- Calendar events and Pulpit messages are entered via admin UI.

insert into public.groups (name, name_ml, slug, group_type, description, is_archived)
values
  ('Bhagam 1',  'ഭാഗം 1',  'bhagam-1',  'prayer', 'Prayer group — Bhagam 1',  false),
  ('Bhagam 2',  'ഭാഗം 2',  'bhagam-2',  'prayer', 'Prayer group — Bhagam 2',  false),
  ('Bhagam 3',  'ഭാഗം 3',  'bhagam-3',  'prayer', 'Prayer group — Bhagam 3',  false),
  ('Bhagam 4',  'ഭാഗം 4',  'bhagam-4',  'prayer', 'Prayer group — Bhagam 4',  false),
  ('Bhagam 5',  'ഭാഗം 5',  'bhagam-5',  'prayer', 'Prayer group — Bhagam 5',  false),
  ('Bhagam 6',  'ഭാഗം 6',  'bhagam-6',  'prayer', 'Prayer group — Bhagam 6',  false),
  ('Bhagam 7',  'ഭാഗം 7',  'bhagam-7',  'prayer', 'Prayer group — Bhagam 7',  false),
  ('Bhagam 8',  'ഭാഗം 8',  'bhagam-8',  'prayer', 'Prayer group — Bhagam 8',  false),
  ('Bhagam 9',  'ഭാഗം 9',  'bhagam-9',  'prayer', 'Prayer group — Bhagam 9',  false),
  ('Bhagam 10', 'ഭാഗം 10', 'bhagam-10', 'prayer', 'Prayer group — Bhagam 10', false)
on conflict (slug) do nothing;

-- Functional ministry groups (admin enters descriptions via admin UI)
insert into public.groups (name, name_ml, slug, group_type, description, is_archived)
values
  ('Choir',               'ഗായക സംഘം',        'choir',         'ministry', 'Church Choir — Sunday services and special programmes', false),
  ('Sevika Sangam',       'സേവിക സംഘം',        'sevika-sangam', 'ministry', 'Sevika Sangam — Women''s fellowship', false),
  ('Youth Fellowship',    'യൂത്ത് ഫെല്ലോഷിപ്പ്', 'youth',         'ministry', 'Youth Fellowship', false),
  ('Pain & Palliative',   'സേവന വേദി',          'palliative',    'ministry', 'Pain & Palliative Care ministry', false)
on conflict (slug) do nothing;
