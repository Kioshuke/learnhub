create or replace function public.get_test_meta(p_de text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_key text := btrim(coalesce(p_de, ''));
  v_id uuid;
  v_name text;
  v_description text;
  v_subject text;
  v_minutes integer;
begin
  if v_key like 't:%' then
    v_key := substr(v_key, 3);
  end if;

  begin
    v_id := v_key::uuid;
  exception when others then
    return jsonb_build_object('ok', false);
  end;

  select name, description, subject, minutes
    into v_name, v_description, v_subject, v_minutes
    from public.test_sets
   where id = v_id;

  if not found then
    return jsonb_build_object('ok', false);
  end if;

  return jsonb_build_object(
    'ok', true,
    'name', v_name,
    'description', v_description,
    'subject', v_subject,
    'minutes', v_minutes
  );
end;
$$;

revoke execute on function public.get_test_meta(text) from public;
grant execute on function public.get_test_meta(text) to anon, authenticated;
