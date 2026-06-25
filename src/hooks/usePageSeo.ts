import { useEffect } from "react";

const SITE_URL = "https://immoniq.xyz";

function setMeta(selector: string, attr: string, value: string) {
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    const [key, val] = selector.replace("meta[", "").replace("]", "").split("=");
    el.setAttribute(key, val.replace(/"/g, ""));
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function setJsonLd(id: string, data: object | null) {
  let el = document.head.querySelector(`script[data-seo-id="${id}"]`) as HTMLScriptElement | null;
  if (data == null) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.setAttribute("data-seo-id", id);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export interface PageSeoOptions {
  title?: string;
  description?: string;
  /** Path-only or absolute; resolved against site URL. */
  canonicalPath?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  jsonLd?: object | object[];
  jsonLdId?: string;
}

export function usePageSeo(opts: PageSeoOptions) {
  const {
    title,
    description,
    canonicalPath,
    ogTitle,
    ogDescription,
    ogImage,
    jsonLd,
    jsonLdId = "page",
  } = opts;

  useEffect(() => {
    if (title) document.title = title;
    if (description) setMeta('meta[name="description"]', "content", description);

    const url = canonicalPath
      ? canonicalPath.startsWith("http")
        ? canonicalPath
        : `${SITE_URL}${canonicalPath}`
      : null;

    if (url) {
      setLink("canonical", url);
      setMeta('meta[property="og:url"]', "content", url);
    }
    if (ogTitle || title) {
      setMeta('meta[property="og:title"]', "content", ogTitle || title!);
      setMeta('meta[name="twitter:title"]', "content", ogTitle || title!);
    }
    if (ogDescription || description) {
      setMeta('meta[property="og:description"]', "content", ogDescription || description!);
      setMeta('meta[name="twitter:description"]', "content", ogDescription || description!);
    }
    if (ogImage) {
      setMeta('meta[property="og:image"]', "content", ogImage);
      setMeta('meta[name="twitter:image"]', "content", ogImage);
    }

    if (jsonLd) setJsonLd(jsonLdId, jsonLd as object);

    return () => {
      if (jsonLd) setJsonLd(jsonLdId, null);
    };
  }, [title, description, canonicalPath, ogTitle, ogDescription, ogImage, jsonLdId, JSON.stringify(jsonLd)]);
}
