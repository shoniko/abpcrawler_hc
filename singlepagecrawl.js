const puppeteer = require("puppeteer");
const crawler = require("./crawler")

async function runOnURL(options) {
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: options.userDataDir,
    args: ["--disable-extensions-except=" + options.abppath,
    "--load-extension=" + options.abppath,
      // The two options below are needed to run crawl in a Docker container
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  });
  const page = await browser.newPage();

  await page.goto(options.singlePage);

  crawler.setOptions(options);
  const crawlResult = await crawler.crawlFunction(page, () => ({}));

  await browser.close();

  return crawlResult;
}

module.exports = {
  runOnURL: runOnURL
}