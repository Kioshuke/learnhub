import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "../scripts/core/supabase-public-config.js";

const TEST_DE_UUID = /^t:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function trimDescription(value, maxLength = 160) {
  const chars = Array.from(String(value || "").trim());
  if (chars.length <= maxLength) return chars.join("");
  return `${chars.slice(0, maxLength - 1).join("").trimEnd()}…`;
}

function stripTags(v) {
  return String(v || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export async function onRequestGet(context) {
  const requestUrl = new URL(context.request.url);
  const de = requestUrl.searchParams.get("de") || "";
  if (requestUrl.searchParams.get("open") !== "phong-hoc" || !TEST_DE_UUID.test(de)) {
    return context.next();
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500);
  let meta;
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_test_meta`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
      },
      body: JSON.stringify({ p_de: de }),
      signal: controller.signal
    });
    if (!response.ok) return context.next();
    meta = await response.json();
    if (!meta || meta.ok !== true) return context.next();
  } catch (_error) {
    return context.next();
  } finally {
    clearTimeout(timeoutId);
  }

  const title = `${String(meta.name || "Bài kiểm tra")} - LearnHub`;
  const subject = String(meta.subject || "").trim();
  const minutes = Number(meta.minutes) || 0;
  const fallbackDescription = [
    subject ? `Bài kiểm tra ${subject}` : "Bài kiểm tra",
    minutes > 0 ? `${minutes} phút` : "",
    "LearnHub"
  ].filter(Boolean).join(" - ");
  const description = trimDescription(
    stripTags(meta.description) || fallbackDescription
  );
  const tags = {
    title,
    "og:title": title,
    "og:description": description,
    "og:url": requestUrl.href,
    "og:type": "website"
  };

  const response = await context.next();
  if (!response.headers.get("content-type")?.toLowerCase().includes("text/html")) {
    return response;
  }

  const present = Object.fromEntries(Object.keys(tags).map((key) => [key, false]));
  const placeholders = [
    '<title data-lh-meta-slot="title"></title>',
    '<meta data-lh-meta-slot="og:title">',
    '<meta data-lh-meta-slot="og:description">',
    '<meta data-lh-meta-slot="og:url">',
    '<meta data-lh-meta-slot="og:type">'
  ].join("");

  const updatedExisting = new HTMLRewriter()
    .on("title", { element(element) {
      present.title = true;
      element.setInnerContent(tags.title);
    } })
    .on('meta[property="og:title"]', { element(element) {
      present["og:title"] = true;
      element.setAttribute("content", tags["og:title"]);
    } })
    .on('meta[property="og:description"]', { element(element) {
      present["og:description"] = true;
      element.setAttribute("content", tags["og:description"]);
    } })
    .on('meta[property="og:url"]', { element(element) {
      present["og:url"] = true;
      element.setAttribute("content", tags["og:url"]);
    } })
    .on('meta[property="og:type"]', { element(element) {
      present["og:type"] = true;
      element.setAttribute("content", tags["og:type"]);
    } })
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
        element.setAttribute("property", key);
        element.setAttribute("content", tags[key]);
        element.removeAttribute("data-lh-meta-slot");
      }
    } })
    .transform(updatedExisting);

  return completeMetadata;
}
