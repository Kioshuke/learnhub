-- Đổi tên card / khóa (card_title) trong 1 môn.
-- Cập nhật toàn bộ video có đúng subject + card_title cũ.

create or replace function public.teacher_rename_video_card(
  p_subject text,
  p_old_title text,
  p_new_title text
) returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_old text;
  v_new text;
  v_cnt int;
begin
  if not public.is_teacher() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  v_old := btrim(coalesce(p_old_title, ''));
  v_new := btrim(coalesce(p_new_title, ''));
  if v_old = '' then
    return jsonb_build_object('ok', false, 'error', 'empty_old_title');
  end if;
  if v_new = '' then
    return jsonb_build_object('ok', false, 'error', 'empty_new_title');
  end if;

  update public.video_cards
     set card_title = v_new,
         updated_at = now()
   where subject = p_subject
     and card_title = v_old;

  get diagnostics v_cnt = row_count;
  return jsonb_build_object('ok', true, 'affected', v_cnt);
end;
$$;

revoke all on function public.teacher_rename_video_card(text, text, text) from public;
grant execute on function public.teacher_rename_video_card(text, text, text) to authenticated;
