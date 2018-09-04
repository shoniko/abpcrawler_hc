const HCCrawler = require("headless-chrome-crawler");
const logger = require("./logger");
const abp = require("./abp");
const sleep = require("system-sleep")
const url = require('url');
const path = require('path');
const util = require('util');
const exec = util.promisify(require("child_process").exec);

let crawler = null;
let options = null;

async function crawlFunction(page, crawl) {
  // We need to change the viewport of each page as it defaults to 800x600
  // see: https://github.com/GoogleChrome/puppeteer/issues/1183
  await page._client.send("Emulation.clearDeviceMetricsOverride");
  const result = await crawl();
  if (options.screenshots) {
    try {
      await page.waitFor(options.screenshotsDelay ? options.screenshotsDelay : 0);
      let currentDate = new Date();
      
      let fileName = path.join(options.output, "/screenshots/",
        url.parse(page.url()).hostname +
        "_" + currentDate.getDate() + "-"
        + (currentDate.getMonth() + 1) + "-"
        + currentDate.getFullYear() + "_"
        + currentDate.getHours() + "-"
        + currentDate.getMinutes() + "-"
        + currentDate.getSeconds() +
        ".png");
      await page.screenshot({
        path: fileName,
        fullPage: true
      });
      result.screenshotPath = fileName;
    }
    catch(e){
      console.log(e);
      throw e;
    }
  }
  if (options.postProcessing) {
    try {
      let postProcessingParam = {}
      postProcessingParam.screenshotPath = result.screenshotPath;

      let args = options.postProcessing.args.concat(
        [JSON.stringify(postProcessingParam).replace(/\"/g, "\\\"")]
      );

      let execLine = options.postProcessing.program;
      args.forEach(element => {
        execLine += " " + element;
      });

      const { stdout, stderr } = await exec(execLine);
      const response = stdout.replace("\n", "");
      console.log("Detected " + response + " ads on " + page.url());
      result.adsDetected = response;
    }
    catch(e) {
      console.log("Post-processing error:");
      console.log(e);
      throw e;
    }
  }

  return result;
}

async function launchCrawler(newOptions) {
  options = newOptions;
  if (options.output) {
    logger.setLogPath(options.output);
  }
  // Start the cralwer and load ABP
  crawler = await HCCrawler.launch({
    headless: false,
    maxConcurrency: options.concurrency,
    userDataDir: options.userDataDir,
    args: ["--disable-extensions-except=" + options.abppath,
    "--load-extension=" + options.abppath,
      // The two options below are needed to run crawl in a Docker container
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
    onError: (error) => {
      console.log(error);
    },
    customCrawl: crawlFunction
  });

  await abp.initABP(crawler._browser);
  
  crawler.addListener("requeststarted", (options) => console.log(options.url));
}

async function addToqueue(url, depth) {
  // Queue a request with custom options
  await crawler.queue({
    url: url,
    maxDepth: depth,
    obeyRobotsTxt: false
  });
}

async function waitForFinish() {
  // Wait for first URLs to queue up
  sleep(1000);
  await crawler.onIdle();
  // Let the postProcessing finish, if needed
  sleep(2000);
}

function setOptions(newOptions) {
  options = newOptions;
} 

async function close() {
  await crawler.close();
}

module.exports = {
  launchCrawler: launchCrawler,
  addToqueue: addToqueue,
  waitForFinish: waitForFinish,
  close: close,
  crawlFunction: crawlFunction,
  setOptions: setOptions
}