-- Sample Certificates Seed — run in Supabase Dashboard SQL Editor (dev/review only)
-- Creates one approved certificate of each type using Motty Philip as the test member.
-- Safe to delete these records afterwards via the admin Delete button in the app.

do $$
declare
  v_member_id   uuid;
  v_admin_id    uuid;
  v_year        int := extract(year from now())::int;
begin
  -- Resolve Motty Philip's profile id (member + submitter)
  select id into v_member_id from public.profiles where full_name ilike '%motty%philip%' limit 1;
  select id into v_admin_id  from public.profiles where is_admin = true limit 1;

  if v_member_id is null then
    raise exception 'Could not find Motty Philip in profiles. Check the full_name value.';
  end if;

  -- 1. Baptism
  insert into public.certificate_requests
    (cert_type, cert_no, member_id, extras, status, created_by, reviewed_by, reviewed_at)
  values (
    'baptism',
    'SGMC-BAP-' || v_year || '-S01',
    v_member_id,
    '{
      "baptism date": "12 April 1985",
      "baptism register no": "BAP-1985-042",
      "godfather": "Rev. Thomas Mathew",
      "godmother": "Mrs. Sara Thomas",
      "officiating minister": "Rev. K.C. Cherian"
    }'::jsonb,
    'approved', v_admin_id, v_admin_id, now()
  );

  -- 2. First Communion
  insert into public.certificate_requests
    (cert_type, cert_no, member_id, extras, status, created_by, reviewed_by, reviewed_at)
  values (
    'communion',
    'SGMC-COM-' || v_year || '-S01',
    v_member_id,
    '{
      "communion date": "15 March 1992",
      "officiating minister": "Rev. Abu Cherian"
    }'::jsonb,
    'approved', v_admin_id, v_admin_id, now()
  );

  -- 3. Confirmation
  insert into public.certificate_requests
    (cert_type, cert_no, member_id, extras, status, created_by, reviewed_by, reviewed_at)
  values (
    'confirmation',
    'SGMC-CON-' || v_year || '-S01',
    v_member_id,
    '{
      "confirmation date": "20 November 1997",
      "confirmation register no": "CON-1997-011",
      "bishop": "Rt. Rev. Dr. Joseph Mar Barnabas",
      "officiating minister": "Rev. Abu Cherian"
    }'::jsonb,
    'approved', v_admin_id, v_admin_id, now()
  );

  -- 4. Matrimony
  insert into public.certificate_requests
    (cert_type, cert_no, member_id, extras, status, created_by, reviewed_by, reviewed_at)
  values (
    'matrimony',
    'SGMC-MAT-' || v_year || '-S01',
    v_member_id,
    '{
      "marriage date": "14 February 2010",
      "spouse name": "Sherine Motty",
      "witness 1": "Mr. George Cherian",
      "witness 2": "Mrs. Leena Philip",
      "officiating minister": "Rev. Abu Cherian"
    }'::jsonb,
    'approved', v_admin_id, v_admin_id, now()
  );

  -- 5. Membership
  insert into public.certificate_requests
    (cert_type, cert_no, member_id, extras, status, created_by, reviewed_by, reviewed_at)
  values (
    'membership',
    'SGMC-MEM-' || v_year || '-S01',
    v_member_id,
    '{
      "purpose": "Review Sample",
      "vicar": "Rev. Abu Cherian"
    }'::jsonb,
    'approved', v_admin_id, v_admin_id, now()
  );

  -- 6. Transfer
  insert into public.certificate_requests
    (cert_type, cert_no, member_id, extras, status, created_by, reviewed_by, reviewed_at)
  values (
    'transfer',
    'SGMC-TRF-' || v_year || '-S01',
    v_member_id,
    '{
      "transferring to": "St. Thomas Marthoma Church, Kottayam",
      "reason": "Change of residence",
      "date": "19 July 2026"
    }'::jsonb,
    'approved', v_admin_id, v_admin_id, now()
  );

  raise notice 'Sample certificates inserted for member_id = %', v_member_id;
end;
$$;
