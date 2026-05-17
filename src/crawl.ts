import { JSDOM } from 'jsdom';
import pLimit from 'p-limit';

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
  const path = url.pathname.replace(/\/+$/, '');
  if (path === '') {
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

class ConcurrentCrawler {
  private baseURL: string;
  private pages: Record<string, number>;
  private limit: ReturnType<typeof pLimit>;
  private maxPages: number;
  private shouldStop: boolean;
  private allTasks: Set<Promise<void>>;

  constructor(baseURL: string, maxConcurrency = 5, maxPages = Infinity) {
    this.baseURL = baseURL;
    this.pages = {};
    this.limit = pLimit(maxConcurrency);
    this.maxPages = maxPages;
    this.shouldStop = false;
    this.allTasks = new Set();
  }

  private addPageVisit(normalizedURL: string): boolean {
    if (this.shouldStop) {
      return false;
    }

    if (this.pages[normalizedURL]) {
      this.pages[normalizedURL]++;
      return false;
    }

    const uniquePages = Object.keys(this.pages).length;
    if (uniquePages >= this.maxPages) {
      this.shouldStop = true;
      console.log('Reached maximum number of pages to crawl.');
      return false;
    }

    this.pages[normalizedURL] = 1;
    return true;
  }

  private async getHTML(currentURL: string): Promise<string | undefined> {
    return await this.limit(async () => {
      try {
        const response = await fetch(currentURL, {
          headers: {
            'User-Agent': 'BootCrawler/1.0',
          },
        });

        if (response.status >= 400) {
          console.error(`Error fetching ${currentURL}: HTTP ${response.status}`);
          return;
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('text/html')) {
          console.error(`Error fetching ${currentURL}: expected HTML but got ${contentType ?? 'unknown content type'}`);
          return;
        }

        return await response.text();
      } catch (error) {
        console.error(`Error fetching ${currentURL}:`, error instanceof Error ? error.message : error);
        return;
      }
    });
  }

  private async crawlPage(currentURL: string): Promise<void> {
    if (this.shouldStop) {
      return;
    }

    try {
      const base = new URL(this.baseURL);
      const current = new URL(currentURL);

      if (base.hostname !== current.hostname) {
        return;
      }

      const normalizedCurrentURL = normalizeURL(current.href);
      if (!this.addPageVisit(normalizedCurrentURL)) {
        return;
      }

      console.log(`Crawling ${current.href}`);
      const html = await this.getHTML(current.href);
      if (!html) {
        return;
      }

      const nextURLs = getURLsFromHTML(html, this.baseURL);
      const crawlPromises = nextURLs.map((nextURL) => {
        const task = this.crawlPage(nextURL).finally(() => {
          this.allTasks.delete(task);
        });
        this.allTasks.add(task);
        return task;
      });

      await Promise.all(crawlPromises);
    } catch (error) {
      console.error(`Error crawling ${currentURL}:`, error instanceof Error ? error.message : error);
    }
  }

  async crawl(): Promise<Record<string, number>> {
    await this.crawlPage(this.baseURL);
    await Promise.all(this.allTasks);
    return this.pages;
  }
}

export async function crawlSiteAsync(baseURL: string, maxConcurrency = 5, maxPages = Infinity): Promise<Record<string, number>> {
  const crawler = new ConcurrentCrawler(baseURL, maxConcurrency, maxPages);
  return await crawler.crawl();
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
