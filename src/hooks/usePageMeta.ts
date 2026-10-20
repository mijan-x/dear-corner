import { useEffect } from "react";

const SITE = "Dear Corner";
const DEFAULT_TITLE = "Dear Corner — Little Things, Lovely Spaces.";
const DEFAULT_DESCRIPTION =
  "Aesthetic room decor, lamps and lighting, desk and stationery, accessories and gifts, delivered across Bangladesh. Cash on Delivery.";

function setMeta(
  selector: string,
  attr: "name" | "property",
  key: string,
  content: string,
) {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.content = content;
}

/**
 * Sets the document title and description for a page.
 * Pass a page title ("Lighting") to get "Lighting · Dear Corner".
 * noindex keeps private pages (cart, account, admin) out of search results.
 */
export function usePageMeta({
  title,
  description,
  noindex,
}: {
  title?: string;
  description?: string;
  noindex?: boolean;
}) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE}` : DEFAULT_TITLE;
    const text = description ?? DEFAULT_DESCRIPTION;
    setMeta('meta[name="description"]', "name", "description", text);
    setMeta(
      'meta[property="og:title"]',
      "property",
      "og:title",
      document.title,
    );
    setMeta(
      'meta[property="og:description"]',
      "property",
      "og:description",
      text,
    );
    setMeta(
      'meta[name="robots"]',
      "name",
      "robots",
      noindex ? "noindex, nofollow" : "index, follow",
    );
  }, [title, description, noindex]);
}
