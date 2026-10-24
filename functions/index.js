import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "../scripts/core/supabase-public-config.js";

const TEST_DE_UUID = /^t:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function trimDescription(value, maxLength = 160) {
  const chars = Array.from(String(value || "").trim());
  if (maxLength <= 0) return "";
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

  const title = `${String(meta.name || "Bài kiểm tra")} - LearnHub Test`;
  const subject = stripTags(meta.subject);
  const questionCount = Number(meta.question_count) || 0;
  const minutes = Number(meta.minutes) || 0;
  const stats = [
    questionCount > 0 ? `${questionCount} câu` : "",
    minutes > 0 ? `${minutes} phút` : ""
  ].filter(Boolean);
  const testDescription = stripTags(meta.description);
  const statsText = stats.join(" · ");
  let description;
  if (testDescription) {
    if (!statsText) {
      description = trimDescription(testDescription);
    } else {
      const separator = " · ";
      const descriptionBudget = Math.max(
        0,
        160 - Array.from(statsText).length - Array.from(separator).length
      );
      const trimmedTestDescription = trimDescription(testDescription, descriptionBudget);
      description = trimmedTestDescription
        ? `${statsText}${separator}${trimmedTestDescription}`
        : statsText;
    }
  } else {
    const fallbackParts = [...stats, subject ? `Môn ${subject}` : ""];
    description = fallbackParts.some(Boolean)
      ? fallbackParts.filter(Boolean).join(" · ")
      : "Bài kiểm tra - LearnHub";
  }

  const metaTags = {
    "og:title": { attribute: "property", value: title },
    "og:description": { attribute: "property", value: description },
    "og:url": { attribute: "property", value: requestUrl.href },
    "og:type": { attribute: "property", value: "website" },
    description: { attribute: "name", value: description },
    "twitter:title": { attribute: "name", value: title },
    "twitter:description": { attribute: "name", value: description }
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
    .on('meta[property="og:url"]', updateMeta("og:url"))
    .on('meta[property="og:type"]', updateMeta("og:type"))
    .on('meta[name="description"]', updateMeta("description"))
    .on('meta[name="twitter:title"]', updateMeta("twitter:title"))
    .on('meta[name="twitter:description"]', updateMeta("twitter:description"))
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
