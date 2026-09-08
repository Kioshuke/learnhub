const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const GRID = {
  topic:         { category: "Từ Vựng Theo Chủ Đề",                  level: "Cơ bản" },
  nhapmon:       { category: "Từ Vựng Nhập Môn",                      level: "Dễ" },
  foundation800: { category: "800 Từ Vựng Nền Tảng",                  level: "Trung bình" },
  elite300:      { category: "300 Từ Vựng Tủ Chuyên Sâu Nâng Cao 9+", level: "Nâng cao 9+" }
};
const FOLDER_SUBDIRS = {
  topic: "topic", nhapmon: "nhapmon", foundation800: "foundation800", elite300: "elite300"
};

function sqlStr(v) {
  return String(v ?? "").replace(/'/g, "''");
}

function parseFile(filePath) {
  const src = fs.readFileSync(filePath, "utf8");
  const nameMatch = src.match(/TOPIC_NAME\s*=\s*["']([^"']+)["']/);
  const name = nameMatch ? nameMatch[1].trim() : path.basename(filePath, ".js");
  const rawMatch = src.match(/rawData\s*=\s*`([\s\S]*?)`/);
  const cards = [];
  if (rawMatch) {
    rawMatch[1].split(/\r?\n/).forEach(line => {
      line = line.trim();
      if (!line) return;
      const idx = line.indexOf(" - ");
      if (idx <= 0) return;
      const front = line.slice(0, idx).trim();
      const back = line.slice(idx + 3).trim();
      if (front && back) cards.push({ front, back });
    });
  }
  return { name, cards };
}

function collectFiles() {
  const out = [];
  for (const key of Object.keys(FOLDER_SUBDIRS)) {
    const dir = path.join(ROOT, "flashcard", FOLDER_SUBDIRS[key]);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith(".js")) continue;
      out.push({ group: key, file: path.join(dir, f) });
    }
  }
  return out;
}

function gen() {
  const files = collectFiles();
  const blocks = [];
  let totalCards = 0, totalSets = 0, skipped = [];

  files.forEach(({ group, file }) => {
    const { name, cards } = parseFile(file);
    if (!cards.length) { skipped.push(file); return; }
    const meta = GRID[group];
    const jsonLiteral = `'${JSON.stringify(cards).replace(/'/g, "''")}'::jsonb`;

    blocks.push(`insert into public.flashcard_sets (teacher_id, name, category, level, description, cards)
select
  t.id,
  '${sqlStr(name)}',
  '${sqlStr(meta.category)}',
  '${sqlStr(meta.level)}',
  '',
  ${jsonLiteral}
from public.users t
where t.id = (select id from public.users order by created_at asc nulls last limit 1)
  and not exists (
    select 1 from public.flashcard_sets s
    where s.name = '${sqlStr(name)}' and s.category = '${sqlStr(meta.category)}'
  );`);
    totalCards += cards.length;
    totalSets++;
  });

  const header = `-- ============================================================================
-- import_flashcards.sql — SINH TỰ ĐỘNG (node supabase/import-flashcards.js)
-- ${new Date().toISOString()}
-- ${totalSets} bộ thẻ, ${totalCards} thẻ. Yêu cầu: đã chạy schema.sql + flashcards.sql.
-- NOTE: teacher_id = giáo viên/admin đầu tiên. Read: tất cả (list/get). Write: chỉ giáo viên.
-- Chạy 1 lần trên Supabase SQL Editor. Có thể chạy lại an toàn (guard chống trùng name+category).
-- ============================================================================

begin;

${blocks.join("\n\n")}

commit;
`;

  const outPath = path.join(__dirname, "import_flashcards.sql");
  fs.writeFileSync(outPath, header, "utf8");
  console.log(`✅ Đã sinh ${outPath}`);
  console.log(`   - ${totalSets} bộ thẻ, tổng ${totalCards} thẻ.`);
  if (skipped.length) console.log(`   - Bỏ qua ${skipped.length} file (không có thẻ): ${skipped.join(", ")}`);
}

gen();