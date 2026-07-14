-- Migration: 005_seed_data
-- Development seed: admin profile + 6 sample groups + demo members
-- Run this ONLY against a local/dev instance, not production.

-- ============================================================
-- SAMPLE GROUPS
-- ============================================================
insert into public.groups (slug, name, name_ml, description, description_ml, group_type)
values
  (
    'sevika-sangam',
    'Sevika Sangam',
    'സേവിക സംഘം',
    'The women''s fellowship of St. George Marthoma Church, Alappuzha. We meet every second Sunday after the morning service.',
    'സെന്റ് ജോർജ് മർത്തോമ്മ ചർച്ചിലെ വനിതാ ഫെലോഷിപ്പ്. ഞങ്ങൾ എല്ലാ രണ്ടാം ഞായറാഴ്ചയും രാവിലെ സർവീസിനു ശേഷം ഒത്തുകൂടുന്നു.',
    'functional'
  ),
  (
    'choir',
    'Church Choir',
    'ഗായകസംഘം',
    'The choir leads congregational worship through music and song. Rehearsals every Saturday at 6 PM.',
    'ഗായകസംഘം ആരാധനയ്ക്ക് ഗാനത്തിലൂടെ നേതൃത്വം നൽകുന്നു. ഓരോ ശനിയാഴ്ചയും വൈകുന്നേരം 6 മണിക്ക് റിഹേഴ്സൽ.',
    'functional'
  ),
  (
    'pain-palliative',
    'Pain & Palliative Care',
    'ശൂശ്രൂഷ',
    'Our palliative care unit visits and supports seriously ill patients and their families in Alappuzha.',
    'ആലപ്പുഴയിൽ ഗുരുതരമായ രോഗികളെയും അവരുടെ കുടുംബങ്ങളെയും സന്ദർശിക്കുകയും പിന്തുണയ്ക്കുകയും ചെയ്യുന്നു.',
    'functional'
  ),
  (
    'yuvajana-sakhyam',
    'Yuvajana Sakhyam',
    'യുവജന സഖ്യം',
    'The youth fellowship (ages 15–35). Monthly meetings, Bible studies, service camps, and more.',
    'യുവജന ഫെലോഷിപ്പ് (15–35 വയസ്). പ്രതിമാസ യോഗങ്ങൾ, ബൈബിൾ പഠനം, സർവീസ് ക്യാമ്പുകൾ.',
    'youth'
  ),
  (
    'prayer-group-north',
    'North Ward Prayer Group',
    'വടക്ക് വാർഡ് പ്രാർഥന ഗ്രൂപ്പ്',
    'Weekly house prayer meetings rotating among homes in the north ward of the parish.',
    'ഇടവകയുടെ വടക്കൻ ഭാഗത്തെ ഭവനങ്ങളിൽ ആഴ്ചതോറും ഭവന പ്രാർഥന.',
    'prayer'
  ),
  (
    'prayer-group-south',
    'South Ward Prayer Group',
    'തെക്ക് വാർഡ് പ്രാർഥന ഗ്രൂപ്പ്',
    'Weekly house prayer meetings rotating among homes in the south ward of the parish.',
    'ഇടവകയുടെ തെക്കൻ ഭാഗത്തെ ഭവനങ്ങളിൽ ആഴ്ചതോറും ഭവന പ്രാർഥന.',
    'prayer'
  )
on conflict (slug) do nothing;
