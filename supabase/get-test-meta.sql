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
  v_prefix text;
begin
  if v_key like 't:%' then
    v_key := substr(v_key, 3);
  end if;

  -- Thử cast là UUID đầy đủ trước
  begin
    v_id := v_key::uuid;
  exception when others then
    -- Nếu không phải UUID valid → dùng prefix matching (8 ký tự đầu)
    v_prefix := left(v_key, 8);
    v_id := null;
  end;

  -- Nếu có prefix matching thì dùng query LIKE, ngược lại dùng exact match
  if v_id is not null then
    select * into v_row from public.test_sets where id = v_id;
  else
    select * into v_row from public.test_sets where left(id::text, 8) = v_prefix;
  end if;

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
