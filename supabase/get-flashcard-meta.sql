-- ============================================================================
-- LEARNHUB — META BỘ FLASHCARD CHO PREVIEW KHI CHIA SẺ LINK
-- Dùng cho Cloudflare Pages Function (functions/index.js) khi crawler của
-- Facebook / Zalo / Messenger đọc link /?open=flash&set=<uuid>.
-- Chạy 1 lần trên SQL Editor (sau khi đã có bảng flashcard_sets).
-- ============================================================================

create or replace function public.get_flashcard_meta(p_set text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_key text := btrim(coalesce(p_set, ''));
  v_id uuid;
  v_row public.flashcard_sets%rowtype;
begin
  -- Cho phép truyền "f:<uuid>" hoặc "<uuid>" cho linh hoạt.
  if v_key like 'f:%' then
    v_key := substr(v_key, 3);
  end if;

  begin
    v_id := v_key::uuid;
  exception when others then
    return jsonb_build_object('ok', false);
  end;

  select * into v_row from public.flashcard_sets where id = v_id;
  if not found then
    return jsonb_build_object('ok', false);
  end if;

  return jsonb_build_object(
    'ok', true,
    'name', v_row.name,
    'description', v_row.description,
    'category', v_row.category,
    'level', v_row.level,
    'card_count', coalesce(jsonb_array_length(v_row.cards), 0)
  );
end;
$$;

revoke execute on function public.get_flashcard_meta(text) from public;
grant execute on function public.get_flashcard_meta(text) to anon, authenticated;

notify pgrst, 'reload schema';
