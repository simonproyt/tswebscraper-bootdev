import { JSDOM } from 'jsdom';

export interface ExtractedPageData {
  url: string;
  heading: string;
  first_paragraph: string;
  outgoing_links: string[];
  image_urls: string[];
}

export function normalizeURL(urlString: string): string {
  const url = new URL(urlString);
  const host = url.hostname;
  const path = url.pathname.replace(/\/+$/, "");
  if (path === "") {
    return host;
  }
  return `${host}${path}`;
}

export function getHeadingFromHTML(html: string): string {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const heading = document.querySelector('h1') ?? document.querySelector('h2');
  return heading?.textContent?.trim() ?? '';
}

export function getFirstParagraphFromHTML(html: string): string {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const mainParagraph = document.querySelector('main p');
  const firstParagraph = mainParagraph ?? document.querySelector('p');
  return firstParagraph?.textContent?.trim() ?? '';
}

export function getURLsFromHTML(html: string, baseURL: string): string[] {
  const urls: string[] = [];
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const anchorElements = document.querySelectorAll('a');

  anchorElements.forEach((anchor) => {
    const href = anchor.getAttribute('href');
    if (!href) {
      return;
    }

    try {
      const url = new URL(href, baseURL);
      urls.push(url.href);
    } catch (error) {
      // Ignore invalid URLs
    }
  });

  return urls;
}

export function getImagesFromHTML(html: string, baseURL: string): string[] {
  const urls: string[] = [];
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const imageElements = document.querySelectorAll('img');

  imageElements.forEach((image) => {
    const src = image.getAttribute('src');
    if (!src) {
      return;
    }

    try {
      const url = new URL(src, baseURL);
      urls.push(url.href);
    } catch (error) {
      // Ignore invalid URLs
    }
  });

  return urls;
}

export function extractPageData(html: string, pageURL: string): ExtractedPageData {
  return {
    url: pageURL,
    heading: getHeadingFromHTML(html),
    first_paragraph: getFirstParagraphFromHTML(html),
    outgoing_links: getURLsFromHTML(html, pageURL),
    image_urls: getImagesFromHTML(html, pageURL),
  };
}
