-- Migration 020: Family member change-request support
-- ============================================================
-- POLICY DECISION: Members do NOT get direct UPDATE access on family_members.
-- Only Admin / Super Admin may apply changes directly.
-- Members submit change requests through their Profile page; Admin reviews
-- and approves them via the Approvals Queue (/admin/approvals).
--
-- This migration extends apply_change_request() to handle family_members
-- in addition to the existing profiles support.
-- ============================================================

create or replace function public.apply_change_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req change_requests%rowtype;
begin
  -- Verify caller is super_admin or admin
  if not (public.is_super_admin() or public.is_admin_or_above()) then
    raise exception 'Permission denied — admin required';
  end if;

  select * into v_req from change_requests where id = p_request_id;
  if not found then raise exception 'Change request not found'; end if;
  if v_req.status <> 'pending' then raise exception 'Request already processed'; end if;

  -- ── profiles update ─────────────────────────────────────────
  if v_req.target_table = 'profiles' then
    update profiles set
      full_name      = coalesce((v_req.proposed_data->>'full_name'),      full_name),
      full_name_ml   = coalesce((v_req.proposed_data->>'full_name_ml'),   full_name_ml),
      house_name     = coalesce((v_req.proposed_data->>'house_name'),     house_name),
      address        = coalesce((v_req.proposed_data->>'address'),        address),
      phone_landline = coalesce((v_req.proposed_data->>'phone_landline'), phone_landline),
      email          = coalesce((v_req.proposed_data->>'email'),          email)
    where id = v_req.target_id;
  end if;

  -- ── family_members update ────────────────────────────────────
  if v_req.target_table = 'family_members' then
    update family_members set
      full_name        = coalesce((v_req.proposed_data->>'full_name'),        full_name),
      full_name_ml     = coalesce((v_req.proposed_data->>'full_name_ml'),     full_name_ml),
      relation_to_head = coalesce((v_req.proposed_data->>'relation_to_head'), relation_to_head),
      date_of_birth    = coalesce((v_req.proposed_data->>'date_of_birth'),    date_of_birth::text)::date,
      gender           = coalesce((v_req.proposed_data->>'gender'),           gender),
      phone            = coalesce((v_req.proposed_data->>'phone'),            phone),
      email            = coalesce((v_req.proposed_data->>'email'),            email)
    where id = v_req.target_id;
  end if;

  -- Mark approved
  update change_requests
  set status     = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_request_id;

  -- Audit
  insert into audit_log (actor_id, action, target_table, target_id, details)
  values (
    auth.uid(), 'change_request.approve',
    'change_requests', p_request_id,
    jsonb_build_object('target_table', v_req.target_table, 'target_id', v_req.target_id)
  );
end;
$$;

