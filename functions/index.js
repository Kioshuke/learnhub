import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "../scripts/core/supabase-public-config.js";

// Link chia sẻ bài test: /?open=phong-hoc&de=t:<uuid>
const TEST_DE_UUID = /^t:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Link chia sẻ bộ flashcard: /?open=flash&set=<uuid>
const FLASH_SET_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SHARE_IMAGE = "/assets/images/df252f57-2143-45f1-9d3c-250c76491de6.jfif";
// Ảnh bìa riêng khi chia sẻ bộ flashcard (1024×572, JPG để FB/Zalo đọc được).
const FLASHCARD_SHARE_IMAGE = "/assets/images/flashcard-share.jpg";
const SHARE_IMAGE_WIDTH = "1024";
const SHARE_IMAGE_HEIGHT = "572";
const DESCRIPTION_MAX = 160;

function trimDescription(value, maxLength = DESCRIPTION_MAX) {
  const chars = Array.from(String(value || "").trim());
  if (maxLength <= 0) return "";
  if (chars.length <= maxLength) return chars.join("");
  return `${chars.slice(0, maxLength - 1).join("").trimEnd()}…`;
}

function stripTags(v) {
  return String(v || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/* "N câu - Thời gian: 45p - <mô tả>" — giữ mô tả trong giới hạn 160 ký tự. */
function composeDescription(statsText, rawDescription, fallback, separator = " · ", emptyText = "") {
  const text = stripTags(rawDescription);
  if (!text) return statsText ? (emptyText ? `${statsText}${separator}${emptyText}` : statsText) : fallback;
  if (!statsText) return trimDescription(text);
  const budget = Math.max(0, DESCRIPTION_MAX - Array.from(statsText).length - Array.from(separator).length);
  const trimmed = trimDescription(text, budget);
  return trimmed ? `${statsText}${separator}${trimmed}` : statsText;
}

function buildTestCopy(meta) {
  const title = `${String(meta.name || "Bài kiểm tra").trim()} - LearnHub Test`;
  const subject = stripTags(meta.subject);
  const questionCount = Number(meta.question_count) || 0;
  const minutes = Number(meta.minutes) || 0;
  const stats = [
    questionCount > 0 ? `${questionCount} câu` : "",
    `Thời gian: ${minutes > 0 ? `${minutes}p` : "Không"}`
  ].filter(Boolean);
  const statsText = stats.join(" - ");
  const fallback = [...stats, subject ? `Môn ${subject}` : ""].filter(Boolean).join(" - ") || "Bài kiểm tra - LearnHub";
  return { title, description: composeDescription(statsText, meta.description, fallback, " - ", "chưa có mô tả đề") };
}

/* Tiêu đề + số từ + mô tả của bộ thẻ, giống cách link bài test hiển thị. */
function buildFlashcardCopy(meta) {
  const title = `${String(meta.name || "Bộ thẻ").trim()} - LearnHub Flashcard`;
  const cardCount = Number(meta.card_count) || 0;
  const category = stripTags(meta.category);
  const stats = [
    cardCount > 0 ? `${cardCount} từ` : "",
    category ? `Chủ đề ${category}` : ""
  ].filter(Boolean);
  const statsText = stats.join(" · ");
  return { title, description: composeDescription(statsText, meta.description, statsText || "Bộ thẻ - LearnHub") };
}

/* Gọi RPC Supabase (anon key) để lấy meta công khai; lỗi/timeout -> null. */
async function fetchMeta(rpcName, body) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${rpcName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    if (!response.ok) return null;
    const meta = await response.json();
    return meta && meta.ok === true ? meta : null;
  } catch (_error) {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function onRequestGet(context) {
  const requestUrl = new URL(context.request.url);
  const open = requestUrl.searchParams.get("open") || "";
  const de = requestUrl.searchParams.get("de") || "";
  const set = requestUrl.searchParams.get("set") || "";

  let copy;
  let imagePath = SHARE_IMAGE;
  if (open === "phong-hoc" && TEST_DE_UUID.test(de)) {
    const meta = await fetchMeta("get_test_meta", { p_de: de });
    if (!meta) return context.next();
    copy = buildTestCopy(meta);
  } else if (open === "flash" && FLASH_SET_UUID.test(set)) {
    const meta = await fetchMeta("get_flashcard_meta", { p_set: set });
    if (!meta) return context.next();
    copy = buildFlashcardCopy(meta);
    imagePath = FLASHCARD_SHARE_IMAGE;
  } else {
    return context.next();
  }

  const { title, description } = copy;
  const image = `${requestUrl.origin}${imagePath}`;

  const metaTags = {
    "og:title": { attribute: "property", value: title },
    "og:description": { attribute: "property", value: description },
    "og:image": { attribute: "property", value: image },
    "og:image:width": { attribute: "property", value: SHARE_IMAGE_WIDTH },
    "og:image:height": { attribute: "property", value: SHARE_IMAGE_HEIGHT },
    "og:url": { attribute: "property", value: requestUrl.href },
    "og:type": { attribute: "property", value: "website" },
    description: { attribute: "name", value: description },
    "twitter:title": { attribute: "name", value: title },
    "twitter:description": { attribute: "name", value: description },
    "twitter:image": { attribute: "name", value: image }
  };
  const tags = {
    title,
    ...Object.fromEntries(Object.entries(metaTags).map(([key, metaTag]) => [key, metaTag.value]))
  };

  const response = await context.next();
  if (!response.headers.get("content-type")?.toLowerCase().includes("text/html")) {
    return response;
  }

  const present = Object.fromEntries(Object.keys(tags).map((key) => [key, false]));
  const metaSlots = Object.keys(metaTags);
  const placeholders = [
    '<title data-lh-meta-slot="title"></title>',
    ...metaSlots.map((key) => `<meta data-lh-meta-slot="${key}">`)
  ].join("");

  const updateMeta = (key) => ({ element(element) {
    present[key] = true;
    element.setAttribute("content", tags[key]);
  } });

  const updatedExisting = new HTMLRewriter()
    .on("title", { element(element) {
      present.title = true;
      element.setInnerContent(tags.title);
    } })
    .on('meta[property="og:title"]', updateMeta("og:title"))
    .on('meta[property="og:description"]', updateMeta("og:description"))
    .on('meta[property="og:image"]', updateMeta("og:image"))
    .on('meta[property="og:url"]', updateMeta("og:url"))
    .on('meta[property="og:type"]', updateMeta("og:type"))
    .on('meta[name="description"]', updateMeta("description"))
    .on('meta[name="twitter:title"]', updateMeta("twitter:title"))
    .on('meta[name="twitter:description"]', updateMeta("twitter:description"))
    .on('meta[name="twitter:image"]', updateMeta("twitter:image"))
    .on("head", { element(element) {
      // Static placeholders are filled in a second pass through setInnerContent/setAttribute.
      element.append(placeholders, { html: true });
    } })
    .transform(response);

  const completeMetadata = new HTMLRewriter()
    .on("title[data-lh-meta-slot='title']", { element(element) {
      if (present.title) {
        element.remove();
      } else {
        element.setInnerContent(tags.title);
        element.removeAttribute("data-lh-meta-slot");
      }
    } })
    .on("meta[data-lh-meta-slot]", { element(element) {
      const key = element.getAttribute("data-lh-meta-slot");
      if (present[key]) {
        element.remove();
      } else {
        element.setAttribute(metaTags[key].attribute, key);
        element.setAttribute("content", tags[key]);
        element.removeAttribute("data-lh-meta-slot");
      }
    } })
    .transform(updatedExisting);

  return completeMetadata;
}
