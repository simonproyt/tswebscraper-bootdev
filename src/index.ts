import { crawlPage } from './crawl.js';

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error("Error: Missing URL argument.");
    console.error("Usage: npm run start -- <baseURL>");
    process.exit(1);
  }

  if (args.length > 1) {
    console.error("Error: Too many arguments.");
    console.error("Usage: npm run start -- <baseURL>");
    process.exit(1);
  }

  const baseURL = args[0];
  console.log(`Starting crawler at ${baseURL}`);
  const pages = await crawlPage(baseURL);
  console.log('Crawl complete:', pages);
  process.exit(0);
}

main().catch((error) => {
  console.error("Unexpected error:", error instanceof Error ? error.message : error);
  process.exit(1);
});
