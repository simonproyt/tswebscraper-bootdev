function main() {
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
  process.exit(0);
}

main();
