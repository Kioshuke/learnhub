# LEARNHUB PLATFORM - AI CODING RULES

## 1. PROJECT ARCHITECTURE & TECH STACK
- **Architecture**: Jamstack SPA (Vanilla JS + Cloudflare Workers + Supabase Backend). NO Node.js/Build tools/NPM/Frameworks (No React, Vue, Tailwind).
- **Frontend**: Plain HTML5, CSS3, ES6+ Modular JS. FontAwesome v6.
- **Backend/DB**: Supabase (PostgreSQL + RLS + PL/pgSQL RPCs). Authentication via Google OAuth/Email.
- **Worker**: Cloudflare Worker proxy (`/worker/worker.js`) for OpenRouter/Gemini APIs.
- **Subject Colors**: Centralized in `scripts/features/subjects-data.js` (7 rainbow colors + default).

## 2. STRICT CODING CONSTRAINTS
- **No Heavy Libraries**: Do NOT import npm packages via CDN unless explicitly asked.
- **DOM & State**: Use native `document.querySelector`, `DOMContentLoaded`, dynamic event delegation. Clean up event listeners/intervals when switching pages/tabs.
- **CSS**: Use Native CSS Variables (`var(--primary-color)`). Keep styles modular in respective page CSS files. Maintain dark/light mode compatibility.
- **Supabase Calls**: Always handle errors with `try...catch` and display user-friendly toast/alerts. Use RPC functions for atomic multi-step operations.

## 3. BUG FIXING & DIAGNOSTIC RULES
- **NO Browser Simulation**: STRICTLY PROHIBITED from running browser simulation, headless browser tests, or UI preview tools if the bug can be identified by static code analysis. Do not waste system resources or tokens.
- **Bug Analysis Table**: BEFORE proposing code changes, output a Markdown table summarizing the issue in this exact structure:
  | Loại lỗi / Vấn đề | Tác động / Ảnh hưởng | Nguyên nhân cốt lõi | Đề xuất giải pháp |
  | :--- | :--- | :--- | :--- |
- **Minimal Diff**: Make surgical, localized edits. Change ONLY the specific lines/functions required to fix the issue.
- **Preserve Existing Logic**: Maintain current function signatures, global variable scopes, and event listeners. Do NOT rewrite working code.

## 4. RESPONSE FORMAT FOR AI
- Keep response concise and direct.
- First show the **Bug Analysis Table**.
- Then provide code snippets ONLY for edited functions/lines, explicitly tagged with exact relative file paths (e.g. `<!-- scripts/admin/blog-manage.js -->`).