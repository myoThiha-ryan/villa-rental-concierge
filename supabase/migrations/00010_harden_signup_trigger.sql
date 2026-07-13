-- Harden the auth → public.users signup trigger for production.
--
-- The original trigger works, but a user created *before* it existed had no
-- public.users row. This migration makes the flow resilient and self-healing:
--   1. Idempotent insert (ON CONFLICT DO NOTHING) — safe against races/re-runs.
--   2. Exception-safe — a failure here can NEVER block auth signup.
--   3. Locked search_path — security-definer best practice.
--   4. Backfills any existing auth users that are missing a public.users row.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
exception
  when others then
    -- Never let profile creation abort the auth signup; log and move on.
    raise warning 'handle_new_user failed for %: %', new.id, sqlerrm;
    return new;
end;
$$;

-- Recreate the trigger cleanly (idempotent).
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Self-heal: backfill any auth users that never got a public.users row.
insert into public.users (id, email, full_name)
select u.id, u.email, u.raw_user_meta_data->>'full_name'
from auth.users u
left join public.users p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
