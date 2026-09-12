-- ============================================================================
-- bulk-videos.sql — Import HÀNG LOẠT các khóa video (trước đây trong
-- element/phonghoc-data.js: Tổng ôn ngữ pháp, Giải tích 1, Ma trận,
-- MOS Word/Excel/PowerPoint) vào bảng video_cards.
-- ----------------------------------------------------------------------------
-- * Chạy SAU khi đã chạy videocards-v2.sql.
-- * Chạy lại nhiều lần được: xoá dữ liệu cũ 6 card này rồi insert id cố định.
-- * teacher_id = 'bulk-import' (hàm list không lọc theo teacher).
-- * Bỏ qua item pdf / pending (cơ chế GV chỉ hỗ trợ video YT/Vimeo/Drive).
-- ============================================================================

-- 0) Xoá dữ liệu cũ của chính các card này (tránh trùng khi chạy lại)
delete from public.video_cards
 where (subject, card_title) in (
       ('Anh Văn', 'TỔNG ÔN NGỮ PHÁP'),
       ('Toán Học', 'TỔNG ÔN GIẢI TÍCH 1'),
       ('Toán Học', 'TOÁN MA TRẬN'),
       ('Tin Học', 'MOS Word'),
       ('Tin Học', 'MOS Excel'),
       ('Tin Học', 'MOS PowerPoint')
 );

-- 1) Import từng card
insert into public.video_cards
  (id, teacher_id, subject, card_title, card_description, group_name, title, video_url, sort_order, is_complete)
values
  ('00000000-0000-4000-8000-000000000000', 'bulk-import', 'Anh Văn', 'TỔNG ÔN NGỮ PHÁP', 'Video tổng ôn ngữ pháp tiếng Anh.', 'Ngữ pháp tiếng Anh', 'So sánh', 'https://www.youtube.com/watch?v=H8Fcn9XpDic', 1, false),
  ('00000000-0000-4000-8000-000000000001', 'bulk-import', 'Anh Văn', 'TỔNG ÔN NGỮ PHÁP', 'Video tổng ôn ngữ pháp tiếng Anh.', 'Ngữ pháp tiếng Anh', 'Thì của động từ', 'https://www.youtube.com/watch?v=RQb4H9iBup0', 2, false),
  ('00000000-0000-4000-8000-000000000002', 'bulk-import', 'Anh Văn', 'TỔNG ÔN NGỮ PHÁP', 'Video tổng ôn ngữ pháp tiếng Anh.', 'Ngữ pháp tiếng Anh', 'Câu bị động', 'https://www.youtube.com/watch?v=K8743i3Lx6E', 3, false),
  ('00000000-0000-4000-8000-000000000003', 'bulk-import', 'Anh Văn', 'TỔNG ÔN NGỮ PHÁP', 'Video tổng ôn ngữ pháp tiếng Anh.', 'Ngữ pháp tiếng Anh', 'Mệnh đề quan hệ', 'https://www.youtube.com/watch?v=xmL6XgE2xE0', 4, false),
  ('00000000-0000-4000-8000-000000000004', 'bulk-import', 'Anh Văn', 'TỔNG ÔN NGỮ PHÁP', 'Video tổng ôn ngữ pháp tiếng Anh.', 'Ngữ pháp tiếng Anh', 'Động từ khuyết thiếu', 'https://www.youtube.com/watch?v=dh06Qd5uPRI', 5, false),
  ('00000000-0000-4000-8000-000000000005', 'bulk-import', 'Anh Văn', 'TỔNG ÔN NGỮ PHÁP', 'Video tổng ôn ngữ pháp tiếng Anh.', 'Ngữ pháp tiếng Anh', 'Từ loại', 'https://www.youtube.com/watch?v=_Ce2kBuivNA', 6, false),
  ('00000000-0000-4000-8000-000000000006', 'bulk-import', 'Anh Văn', 'TỔNG ÔN NGỮ PHÁP', 'Video tổng ôn ngữ pháp tiếng Anh.', 'Ngữ pháp tiếng Anh', 'Câu điều kiện', 'https://www.youtube.com/watch?v=G7TBLDeFIuM', 7, false),
  ('00000000-0000-4000-8000-000000000007', 'bulk-import', 'Anh Văn', 'TỔNG ÔN NGỮ PHÁP', 'Video tổng ôn ngữ pháp tiếng Anh.', 'Ngữ pháp tiếng Anh', 'Liên từ', 'https://www.youtube.com/watch?v=3Q6MtuYtc00', 8, false),
  ('00000000-0000-4000-8000-000000000008', 'bulk-import', 'Anh Văn', 'TỔNG ÔN NGỮ PHÁP', 'Video tổng ôn ngữ pháp tiếng Anh.', 'Ngữ pháp tiếng Anh', 'Lượng từ', 'https://www.youtube.com/watch?v=fW3j-JhEHzE', 9, false),
  ('00000000-0000-4000-8000-000000000009', 'bulk-import', 'Anh Văn', 'TỔNG ÔN NGỮ PHÁP', 'Video tổng ôn ngữ pháp tiếng Anh.', 'Ngữ pháp tiếng Anh', 'Word Form', 'https://www.youtube.com/watch?v=BtXJGT_6efk', 10, false),
  ('00000000-0000-4000-8000-000000000010', 'bulk-import', 'Anh Văn', 'TỔNG ÔN NGỮ PHÁP', 'Video tổng ôn ngữ pháp tiếng Anh.', 'Ngữ pháp tiếng Anh', 'Câu tường thuật', 'https://www.youtube.com/watch?v=XwvUbIkt1ZQ', 11, false),
  ('00000000-0000-4000-8000-000000000011', 'bulk-import', 'Anh Văn', 'TỔNG ÔN NGỮ PHÁP', 'Video tổng ôn ngữ pháp tiếng Anh.', 'Ngữ pháp tiếng Anh', 'Mạo từ', 'https://www.youtube.com/watch?v=Q8kKYTVKa4c', 12, false),
  ('00000000-0000-4000-8000-000000000012', 'bulk-import', 'Anh Văn', 'TỔNG ÔN NGỮ PHÁP', 'Video tổng ôn ngữ pháp tiếng Anh.', 'Ngữ pháp tiếng Anh', 'Sự phối thì', 'https://www.youtube.com/watch?v=r1lvjKxSyTk', 13, false),
  ('00000000-0000-4000-8000-000000000013', 'bulk-import', 'Anh Văn', 'TỔNG ÔN NGỮ PHÁP', 'Video tổng ôn ngữ pháp tiếng Anh.', 'Ngữ pháp tiếng Anh', 'Word Order', 'https://www.youtube.com/watch?v=5IHP4GYrDpw', 14, false);

insert into public.video_cards
  (id, teacher_id, subject, card_title, card_description, group_name, title, video_url, sort_order, is_complete)
values
  ('00000000-0000-4000-8000-000000000014', 'bulk-import', 'Toán Học', 'TỔNG ÔN GIẢI TÍCH 1', 'Video tổng ôn Giải tích 1.', 'Giải tích 1', 'B1: Giới hạn hàm số', 'https://www.youtube.com/watch?v=2H-XDZ3lB6g', 1, false),
  ('00000000-0000-4000-8000-000000000015', 'bulk-import', 'Toán Học', 'TỔNG ÔN GIẢI TÍCH 1', 'Video tổng ôn Giải tích 1.', 'Giải tích 1', 'B2: Giới hạn hàm số (tiếp)', 'https://www.youtube.com/watch?v=_cljZgXg2WM', 2, false),
  ('00000000-0000-4000-8000-000000000016', 'bulk-import', 'Toán Học', 'TỔNG ÔN GIẢI TÍCH 1', 'Video tổng ôn Giải tích 1.', 'Giải tích 1', 'Luyện tập giới hạn hàm số', 'https://www.youtube.com/watch?v=ZRYN2Bhi6p4', 3, false),
  ('00000000-0000-4000-8000-000000000017', 'bulk-import', 'Toán Học', 'TỔNG ÔN GIẢI TÍCH 1', 'Video tổng ôn Giải tích 1.', 'Giải tích 1', 'B3: Một số dạng hàm số quan trọng', 'https://www.youtube.com/watch?v=uxFFDiWAOYQ', 4, false),
  ('00000000-0000-4000-8000-000000000018', 'bulk-import', 'Toán Học', 'TỔNG ÔN GIẢI TÍCH 1', 'Video tổng ôn Giải tích 1.', 'Giải tích 1', 'B4: Đại lượng vô cùng bé - vô cùng lớn', 'https://www.youtube.com/watch?v=ZfaqXVhJEh4', 5, false),
  ('00000000-0000-4000-8000-000000000019', 'bulk-import', 'Toán Học', 'TỔNG ÔN GIẢI TÍCH 1', 'Video tổng ôn Giải tích 1.', 'Giải tích 1', 'B5: Các tiêu chuẩn tồn tại giới hạn dãy số', 'https://www.youtube.com/watch?v=RUbMStw8tJs', 6, false),
  ('00000000-0000-4000-8000-000000000020', 'bulk-import', 'Toán Học', 'TỔNG ÔN GIẢI TÍCH 1', 'Video tổng ôn Giải tích 1.', 'Giải tích 1', 'B6: Dãy số theo kiểu quy nạp', 'https://www.youtube.com/watch?v=w7ME28JrHuA', 7, false),
  ('00000000-0000-4000-8000-000000000021', 'bulk-import', 'Toán Học', 'TỔNG ÔN GIẢI TÍCH 1', 'Video tổng ôn Giải tích 1.', 'Giải tích 1', 'B7: Dãy số - Giới hạn dãy số', 'https://www.youtube.com/watch?v=n6VxD511CLM', 8, false),
  ('00000000-0000-4000-8000-000000000022', 'bulk-import', 'Toán Học', 'TỔNG ÔN GIẢI TÍCH 1', 'Video tổng ôn Giải tích 1.', 'Giải tích 1', 'Luyện tập dãy số', 'https://www.youtube.com/watch?v=z9IXS93zAjg', 9, false),
  ('00000000-0000-4000-8000-000000000023', 'bulk-import', 'Toán Học', 'TỔNG ÔN GIẢI TÍCH 1', 'Video tổng ôn Giải tích 1.', 'Giải tích 1', 'B9: PP L''Hospital - giới hạn hàm số mũ', 'https://www.youtube.com/watch?v=VuFcNmS4myw', 10, false);

insert into public.video_cards
  (id, teacher_id, subject, card_title, card_description, group_name, title, video_url, sort_order, is_complete)
values
  ('00000000-0000-4000-8000-000000000024', 'bulk-import', 'Toán Học', 'TOÁN MA TRẬN', 'Tổng hợp 5 buổi toán cao cấp: Ma trận, Định thức, Nghịch đảo, Hạng, Lũy thừa bậc cao.', 'Ma trận', 'B1: Ma trận - Các phép toán', 'https://www.youtube.com/watch?v=WqmuR6hhzIo', 1, false),
  ('00000000-0000-4000-8000-000000000025', 'bulk-import', 'Toán Học', 'TOÁN MA TRẬN', 'Tổng hợp 5 buổi toán cao cấp: Ma trận, Định thức, Nghịch đảo, Hạng, Lũy thừa bậc cao.', 'Ma trận', 'B2: Định thức ma trận', 'https://www.youtube.com/watch?v=vLS9UWTIE6U', 2, false),
  ('00000000-0000-4000-8000-000000000026', 'bulk-import', 'Toán Học', 'TOÁN MA TRẬN', 'Tổng hợp 5 buổi toán cao cấp: Ma trận, Định thức, Nghịch đảo, Hạng, Lũy thừa bậc cao.', 'Ma trận', 'B3: Ma trận nghịch đảo', 'https://www.youtube.com/watch?v=ti61DhllUnE', 3, false),
  ('00000000-0000-4000-8000-000000000027', 'bulk-import', 'Toán Học', 'TOÁN MA TRẬN', 'Tổng hợp 5 buổi toán cao cấp: Ma trận, Định thức, Nghịch đảo, Hạng, Lũy thừa bậc cao.', 'Ma trận', 'B4: Hạng ma trận', 'https://www.youtube.com/watch?v=KMSsoeCds7E', 4, false),
  ('00000000-0000-4000-8000-000000000028', 'bulk-import', 'Toán Học', 'TOÁN MA TRẬN', 'Tổng hợp 5 buổi toán cao cấp: Ma trận, Định thức, Nghịch đảo, Hạng, Lũy thừa bậc cao.', 'Ma trận', 'B5: Nâng cao - Lũy thừa bậc cao ma trận', 'https://www.youtube.com/watch?v=gwJaJ_5AU0Q', 5, false);

insert into public.video_cards
  (id, teacher_id, subject, card_title, card_description, group_name, title, video_url, sort_order, is_complete)
values
  ('00000000-0000-4000-8000-000000000029', 'bulk-import', 'Tin Học', 'MOS Word', 'Luyện tập kỹ năng Microsoft Word nâng cao theo từng buổi.', 'MOS Word', 'Buổi 1', 'https://drive.google.com/file/d/1T2l-jfuQKz7LHPy0Ook46pW6bwRT4jSA/view?usp=drive_link', 1, false),
  ('00000000-0000-4000-8000-000000000030', 'bulk-import', 'Tin Học', 'MOS Word', 'Luyện tập kỹ năng Microsoft Word nâng cao theo từng buổi.', 'MOS Word', 'Buổi 2', 'https://drive.google.com/file/d/1J6arqsJju23wZlmPwbW77EE9ZPGaMv4U/view?usp=drive_link', 2, false),
  ('00000000-0000-4000-8000-000000000031', 'bulk-import', 'Tin Học', 'MOS Word', 'Luyện tập kỹ năng Microsoft Word nâng cao theo từng buổi.', 'MOS Word', 'Buổi 3', 'https://drive.google.com/file/d/1egQYJ3OI0JFsvXm2uSue-GB0aGMP4ZCi/view?usp=drive_link', 3, false),
  ('00000000-0000-4000-8000-000000000032', 'bulk-import', 'Tin Học', 'MOS Word', 'Luyện tập kỹ năng Microsoft Word nâng cao theo từng buổi.', 'MOS Word', 'Buổi 4', 'https://drive.google.com/file/d/14wBvhKC92W05e25R_uaiA2xniGyhldSX/view?usp=drive_link', 4, false),
  ('00000000-0000-4000-8000-000000000033', 'bulk-import', 'Tin Học', 'MOS Word', 'Luyện tập kỹ năng Microsoft Word nâng cao theo từng buổi.', 'MOS Word', 'Buổi 5', 'https://drive.google.com/file/d/1ubgj-7nUstTh0jNQNKXMtX6XZJBLLUjn/view?usp=drive_link', 5, false),
  ('00000000-0000-4000-8000-000000000034', 'bulk-import', 'Tin Học', 'MOS Word', 'Luyện tập kỹ năng Microsoft Word nâng cao theo từng buổi.', 'MOS Word', 'Tài liệu Word', 'https://drive.google.com/drive/folders/181rUF1_PNQrpqiTJt4mDAWU8HuZgy_Sp?usp=sharing', 6, false);

insert into public.video_cards
  (id, teacher_id, subject, card_title, card_description, group_name, title, video_url, sort_order, is_complete)
values
  ('00000000-0000-4000-8000-000000000035', 'bulk-import', 'Tin Học', 'MOS Excel', 'Luyện tập kỹ năng Microsoft Excel nâng cao theo từng buổi.', 'MOS Excel', 'Buổi 1', 'https://drive.google.com/file/d/1ngkgtRbhW74BO0B9daBqVkh2RK5ZtW8q/view?usp=sharing', 1, false),
  ('00000000-0000-4000-8000-000000000036', 'bulk-import', 'Tin Học', 'MOS Excel', 'Luyện tập kỹ năng Microsoft Excel nâng cao theo từng buổi.', 'MOS Excel', 'Buổi 2', 'https://drive.google.com/file/d/1nuxuwBQuKt19uuVbW_bcxgJtd7DDRTW6/view?usp=drive_link', 2, false),
  ('00000000-0000-4000-8000-000000000037', 'bulk-import', 'Tin Học', 'MOS Excel', 'Luyện tập kỹ năng Microsoft Excel nâng cao theo từng buổi.', 'MOS Excel', 'Buổi 3', 'https://drive.google.com/file/d/1UUeRuiqk-GmvKmNyAGcdLAcJL7XwKAFp/view?usp=drive_link', 3, false),
  ('00000000-0000-4000-8000-000000000038', 'bulk-import', 'Tin Học', 'MOS Excel', 'Luyện tập kỹ năng Microsoft Excel nâng cao theo từng buổi.', 'MOS Excel', 'Buổi 4', 'https://drive.google.com/file/d/1_fujRFfhBWuqUg_JmZtxJ9O56GD4svIZ/view?usp=drive_link', 4, false),
  ('00000000-0000-4000-8000-000000000039', 'bulk-import', 'Tin Học', 'MOS Excel', 'Luyện tập kỹ năng Microsoft Excel nâng cao theo từng buổi.', 'MOS Excel', 'Buổi 5', 'https://drive.google.com/file/d/1cJtzhxxSu6BDzL7rSWRRbrPzehtoGcTt/view?usp=drive_link', 5, false),
  ('00000000-0000-4000-8000-000000000040', 'bulk-import', 'Tin Học', 'MOS Excel', 'Luyện tập kỹ năng Microsoft Excel nâng cao theo từng buổi.', 'MOS Excel', 'Buổi 6', 'https://drive.google.com/file/d/1Y9YEQ7oNdUERDKn0KThta-jMEIkbHli8/view?usp=drive_link', 6, false),
  ('00000000-0000-4000-8000-000000000041', 'bulk-import', 'Tin Học', 'MOS Excel', 'Luyện tập kỹ năng Microsoft Excel nâng cao theo từng buổi.', 'MOS Excel', 'Buổi 7', 'https://drive.google.com/file/d/1D-rPXB1vFiLvu97qvPn5ExmMwhXueZ4j/view?usp=drive_link', 7, false),
  ('00000000-0000-4000-8000-000000000042', 'bulk-import', 'Tin Học', 'MOS Excel', 'Luyện tập kỹ năng Microsoft Excel nâng cao theo từng buổi.', 'MOS Excel', 'Buổi 8', 'https://drive.google.com/file/d/1Ts4tMbg2rnXF5KnlfaIRgLyP4W_XsDMo/view?usp=drive_link', 8, false),
  ('00000000-0000-4000-8000-000000000043', 'bulk-import', 'Tin Học', 'MOS Excel', 'Luyện tập kỹ năng Microsoft Excel nâng cao theo từng buổi.', 'MOS Excel', 'Tài liệu Excel', 'https://drive.google.com/drive/folders/1cvIG5_0JvvHEwt6pFTgJC9LHTH6vebXB?usp=drive_link', 9, false);

insert into public.video_cards
  (id, teacher_id, subject, card_title, card_description, group_name, title, video_url, sort_order, is_complete)
values
  ('00000000-0000-4000-8000-000000000044', 'bulk-import', 'Tin Học', 'MOS PowerPoint', 'Luyện tập kỹ năng Microsoft PowerPoint nâng cao theo từng buổi.', 'MOS PowerPoint', 'Buổi 1', 'https://drive.google.com/file/d/1SjowPuXIqOCg4pwac4aqmULNes4G7iML/view?usp=drive_link', 1, false),
  ('00000000-0000-4000-8000-000000000045', 'bulk-import', 'Tin Học', 'MOS PowerPoint', 'Luyện tập kỹ năng Microsoft PowerPoint nâng cao theo từng buổi.', 'MOS PowerPoint', 'Buổi 2', 'https://drive.google.com/file/d/1rN-t0Hsw8Eh9OogYszs6rpsnLTqvQPbi/view?usp=drive_link', 2, false),
  ('00000000-0000-4000-8000-000000000046', 'bulk-import', 'Tin Học', 'MOS PowerPoint', 'Luyện tập kỹ năng Microsoft PowerPoint nâng cao theo từng buổi.', 'MOS PowerPoint', 'Buổi 3', 'https://drive.google.com/file/d/1c1TtlBRsXHphB8oWnvzyKqWr5Twux6Sa/view?usp=drive_link', 3, false),
  ('00000000-0000-4000-8000-000000000047', 'bulk-import', 'Tin Học', 'MOS PowerPoint', 'Luyện tập kỹ năng Microsoft PowerPoint nâng cao theo từng buổi.', 'MOS PowerPoint', 'Buổi 4', 'https://drive.google.com/file/d/17vXpQfbnRbyOJqvQwTfY3h0B9qZkkLc6/view?usp=drive_link', 4, false),
  ('00000000-0000-4000-8000-000000000048', 'bulk-import', 'Tin Học', 'MOS PowerPoint', 'Luyện tập kỹ năng Microsoft PowerPoint nâng cao theo từng buổi.', 'MOS PowerPoint', 'Buổi 5', 'https://drive.google.com/file/d/1Ks2xqFIvruXRmYp2KhKoB6AwBzgSGxVa/view?usp=drive_link', 5, false),
  ('00000000-0000-4000-8000-000000000049', 'bulk-import', 'Tin Học', 'MOS PowerPoint', 'Luyện tập kỹ năng Microsoft PowerPoint nâng cao theo từng buổi.', 'MOS PowerPoint', 'Tài liệu PowerPoint', 'https://drive.google.com/drive/folders/1_vgYUYyKpk-kLfoSEQcPFz7ukpI50sRd?usp=sharing', 6, false);

-- 2) Kiểm tra
select subject, card_title, count(*) as so_video
  from public.video_cards
 where teacher_id = 'bulk-import'
 group by subject, card_title
 order by subject, card_title;
