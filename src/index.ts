import { crawlSiteAsync } from './crawl.js';
import { writeJSONReport } from './report.js';

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Error: Missing URL argument.');
    console.error('Usage: npm run start -- <baseURL> [maxConcurrency] [maxPages]');
    process.exit(1);
  }

  if (args.length > 3) {
    console.error('Error: Too many arguments.');
    console.error('Usage: npm run start -- <baseURL> [maxConcurrency] [maxPages]');
    process.exit(1);
  }

  const baseURL = args[0];
  const maxConcurrency = args[1] ? Number(args[1]) : 5;
  const maxPages = args[2] ? Number(args[2]) : Infinity;

  if (Number.isNaN(maxConcurrency) || maxConcurrency <= 0) {
    console.error('Error: maxConcurrency must be a positive number.');
    process.exit(1);
  }

  if (Number.isNaN(maxPages) || maxPages <= 0) {
    console.error('Error: maxPages must be a positive number.');
    process.exit(1);
  }

  console.log(`Starting crawler at ${baseURL}`);
  console.log(`Max concurrency: ${maxConcurrency}, Max pages: ${maxPages}`);
  const pages = await crawlSiteAsync(baseURL, maxConcurrency, maxPages);
  console.log('Finished crawling.');
  writeJSONReport(pages, 'report.json');
  const firstPage = Object.values(pages)[0];
  if (firstPage) {
    console.log(`First page record: ${firstPage['url']} - ${firstPage['heading']}`);
  }
  Object.values(pages).forEach((page) => {
    console.log(`${page.url}: ${page.heading}`);
  });
  process.exit(0);
}

main().catch((error) => {
  console.error('Unexpected error:', error instanceof Error ? error.message : error);
  process.exit(1);
});
