import fs from 'fs';
import path from 'path';
import type { ExtractedPageData } from './crawl.js';

export function writeJSONReport(
  pageData: Record<string, ExtractedPageData>,
  filename = 'report.json',
): void {
  const sorted = Object.values(pageData).sort((a, b) => a.url.localeCompare(b.url));
  const output = JSON.stringify(sorted, null, 2);
  const filePath = path.resolve(process.cwd(), filename);
  fs.writeFileSync(filePath, output);
}
