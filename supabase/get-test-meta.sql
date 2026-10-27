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
  v_row public.test_sets%rowtype;
  v_total int;
begin
  if v_key like 't:%' then
    v_key := substr(v_key, 3);
  end if;

  begin
    v_id := v_key::uuid;
  exception when others then
    return jsonb_build_object('ok', false);
  end;

  select * into v_row from public.test_sets where id = v_id;
  if not found then
    return jsonb_build_object('ok', false);
  end if;

  select coalesce(sum(coalesce(jsonb_array_length(sec->'questions'), 0)), 0)::int
    into v_total
    from jsonb_array_elements(
           case when jsonb_typeof(v_row.content) = 'array' then v_row.content else '[]'::jsonb end
         ) sec;

  return jsonb_build_object(
    'ok', true,
    'name', v_row.name,
    'description', v_row.description,
    'subject', v_row.subject,
    'minutes', v_row.minutes,
    'question_count',
      case when v_row.subtest_enabled and coalesce(v_row.subtest_count, 0) > 0
           then v_row.subtest_count else v_total end
  );
end;
$$;

revoke execute on function public.get_test_meta(text) from public;
grant execute on function public.get_test_meta(text) to anon, authenticated;
