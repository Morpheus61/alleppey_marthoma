-- Migration 026: Allow admins to delete certificate requests
-- Admin users (is_admin = true) may delete any certificate request.

create policy "cert: admin can delete"
  on public.certificate_requests for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );
