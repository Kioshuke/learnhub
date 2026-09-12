-- Đổi tên nhóm / chủ đề (group_name) trong 1 card (theo môn + tên card).
-- Cập nhật toàn bộ video có đúng subject + card_title + group_name cũ.

create or replace function public.teacher_rename_video_group(
  p_subject text,
  p_card_title text,
  p_old_group text,
  p_new_group text
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

  v_old := btrim(coalesce(p_old_group, ''));
  v_new := btrim(coalesce(p_new_group, ''));
  if v_old = '' then
    return jsonb_build_object('ok', false, 'error', 'empty_old_group');
  end if;
  if v_new = '' then
    return jsonb_build_object('ok', false, 'error', 'empty_new_group');
  end if;

  update public.video_cards
     set group_name = v_new,
         updated_at = now()
   where subject = p_subject
     and card_title = p_card_title
     and group_name = v_old;

  get diagnostics v_cnt = row_count;
  return jsonb_build_object('ok', true, 'affected', v_cnt);
end;
$$;

revoke all on function public.teacher_rename_video_group(text, text, text, text) from public;
grant execute on function public.teacher_rename_video_group(text, text, text, text) to authenticated;