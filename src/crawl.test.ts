import { describe, expect, it } from 'vitest';
import { normalizeURL, getHeadingFromHTML, getFirstParagraphFromHTML, getURLsFromHTML, getImagesFromHTML, extractPageData } from './crawl';

describe('normalizeURL', () => {
  it('removes http protocol and trailing slash', () => {
    const input = 'http://www.boot.dev/blog/path/';
    const expected = 'www.boot.dev/blog/path';
    expect(normalizeURL(input)).toBe(expected);
  });

  it('removes https protocol and trailing slash', () => {
    const input = 'https://www.boot.dev/blog/path/';
    const expected = 'www.boot.dev/blog/path';
    expect(normalizeURL(input)).toBe(expected);
  });

  it('preserves the path without a trailing slash', () => {
    const input = 'https://www.boot.dev/blog/path';
    const expected = 'www.boot.dev/blog/path';
    expect(normalizeURL(input)).toBe(expected);
  });

  it('removes query string and hash fragment', () => {
    const input = 'https://www.boot.dev/blog/path/?search=test#section';
    const expected = 'www.boot.dev/blog/path';
    expect(normalizeURL(input)).toBe(expected);
  });

  it('normalizes the root domain path', () => {
    const input = 'https://www.boot.dev/';
    const expected = 'www.boot.dev';
    expect(normalizeURL(input)).toBe(expected);
  });
});

describe('getHeadingFromHTML', () => {
  it('returns h1 text when present', () => {
    const inputBody = `<html><body><h1>Test Title</h1></body></html>`;
    const actual = getHeadingFromHTML(inputBody);
    expect(actual).toEqual('Test Title');
  });

  it('falls back to h2 when h1 is missing', () => {
    const inputBody = `<html><body><h2>Secondary Title</h2></body></html>`;
    const actual = getHeadingFromHTML(inputBody);
    expect(actual).toEqual('Secondary Title');
  });

  it('returns an empty string when no heading is found', () => {
    const inputBody = `<html><body><p>No heading here.</p></body></html>`;
    const actual = getHeadingFromHTML(inputBody);
    expect(actual).toEqual('');
  });
});

describe('getFirstParagraphFromHTML', () => {
  it('returns first paragraph inside main when main exists', () => {
    const inputBody = `
      <html><body>
        <p>Outside paragraph.</p>
        <main>
          <p>Main paragraph.</p>
        </main>
      </body></html>
    `;
    const actual = getFirstParagraphFromHTML(inputBody);
    expect(actual).toEqual('Main paragraph.');
  });

  it('returns first paragraph when no main tag exists', () => {
    const inputBody = `<html><body><p>First paragraph.</p><p>Second paragraph.</p></body></html>`;
    const actual = getFirstParagraphFromHTML(inputBody);
    expect(actual).toEqual('First paragraph.');
  });

  it('returns an empty string when no paragraph is found', () => {
    const inputBody = `<html><body><div>No paragraphs here.</div></body></html>`;
    const actual = getFirstParagraphFromHTML(inputBody);
    expect(actual).toEqual('');
  });
});

describe('getURLsFromHTML', () => {
  it('returns absolute URLs without modification', () => {
    const inputURL = 'https://crawler-test.com';
    const inputBody = `<html><body><a href="https://example.com/page">Example</a></body></html>`;

    const actual = getURLsFromHTML(inputBody, inputURL);
    expect(actual).toEqual(['https://example.com/page']);
  });

  it('converts relative links to absolute URLs', () => {
    const inputURL = 'https://crawler-test.com';
    const inputBody = `<html><body><a href="/path/one"><span>Boot.dev</span></a></body></html>`;

    const actual = getURLsFromHTML(inputBody, inputURL);
    expect(actual).toEqual(['https://crawler-test.com/path/one']);
  });

  it('extracts all anchor href values and ignores anchors without href', () => {
    const inputURL = 'https://crawler-test.com';
    const inputBody = `<html><body>
      <a href="/path/one">First</a>
      <a href="https://external.com/page">Second</a>
      <a>No href</a>
    </body></html>`;

    const actual = getURLsFromHTML(inputBody, inputURL);
    expect(actual).toEqual([
      'https://crawler-test.com/path/one',
      'https://external.com/page',
    ]);
  });
});

describe('getImagesFromHTML', () => {
  it('converts relative image src values to absolute URLs', () => {
    const inputURL = 'https://crawler-test.com';
    const inputBody = `<html><body><img src="/logo.png" alt="Logo"></body></html>`;

    const actual = getImagesFromHTML(inputBody, inputURL);
    expect(actual).toEqual(['https://crawler-test.com/logo.png']);
  });

  it('returns absolute image URLs unchanged', () => {
    const inputURL = 'https://crawler-test.com';
    const inputBody = `<html><body><img src="https://images.com/photo.jpg" alt="Photo"></body></html>`;

    const actual = getImagesFromHTML(inputBody, inputURL);
    expect(actual).toEqual(['https://images.com/photo.jpg']);
  });

  it('ignores img tags without a src attribute', () => {
    const inputURL = 'https://crawler-test.com';
    const inputBody = `<html><body>
      <img alt="Missing src">
      <img src="/logo.png" alt="Logo">
    </body></html>`;

    const actual = getImagesFromHTML(inputBody, inputURL);
    expect(actual).toEqual(['https://crawler-test.com/logo.png']);
  });
});

describe('extractPageData', () => {
  it('returns structured page data for a basic page', () => {
    const inputURL = 'https://crawler-test.com';
    const inputBody = `
      <html><body>
        <h1>Test Title</h1>
        <p>This is the first paragraph.</p>
        <a href="/link1">Link 1</a>
        <img src="/image1.jpg" alt="Image 1">
      </body></html>
    `;

    const actual = extractPageData(inputBody, inputURL);
    const expected = {
      url: 'https://crawler-test.com',
      heading: 'Test Title',
      first_paragraph: 'This is the first paragraph.',
      outgoing_links: ['https://crawler-test.com/link1'],
      image_urls: ['https://crawler-test.com/image1.jpg'],
    };

    expect(actual).toEqual(expected);
  });

  it('falls back to h2 when h1 is missing and still resolves relative assets', () => {
    const inputURL = 'https://crawler-test.com';
    const inputBody = `
      <html><body>
        <h2>Fallback Title</h2>
        <main><p>Main paragraph content.</p></main>
        <a href="https://external.com/page">External</a>
        <img src="/hero.png" alt="Hero">
      </body></html>
    `;

    const actual = extractPageData(inputBody, inputURL);
    const expected = {
      url: 'https://crawler-test.com',
      heading: 'Fallback Title',
      first_paragraph: 'Main paragraph content.',
      outgoing_links: ['https://external.com/page'],
      image_urls: ['https://crawler-test.com/hero.png'],
    };

    expect(actual).toEqual(expected);
  });

  it('returns empty values when content is missing', () => {
    const inputURL = 'https://crawler-test.com';
    const inputBody = `<html><body><div>No useful content here</div></body></html>`;

    const actual = extractPageData(inputBody, inputURL);
    const expected = {
      url: 'https://crawler-test.com',
      heading: '',
      first_paragraph: '',
      outgoing_links: [],
      image_urls: [],
    };

    expect(actual).toEqual(expected);
  });
});
