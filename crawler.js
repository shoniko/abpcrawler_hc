const HCCrawler = require("headless-chrome-crawler");
const logger = require("./logger");
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
      console.log("Detected " + response + " ads on " + result.response.url);
    }
    catch(e) {
      console.log("Post-processing error:");
      console.log(e);
      throw e;
    }
  }

  return result;
}

async function initABP() {
  // For whatever reason Puppeteer sometimes forgets to
  // list ABP background page as a target. This helps a little.
  sleep(1000);

  // Find ABP's background page  
  const targets = await crawler._browser.targets();
  const backgroundPageTarget = targets.find(target => {
    console.log("Title: " + target._targetInfo.title + " URL: " + target.url());

    if ((target.type() == "background_page") &&
      (target._targetInfo.title == "Adblock Plus")) {
      return true;
    }
  });
  if (typeof backgroundPageTarget == "undefined")
    return false;

  const backgroundPage = await backgroundPageTarget.page();

  // Add an intermediary `filterHit` listener, which removes
  // circular references from Filter objects
  await backgroundPage.evaluate(() => {
    window.filterHit = function (request, filter) {
      let noCircularFilter = null;
      if (filter) {
        noCircularFilter = {};
        for (let attr in filter) {
          if (filter.hasOwnProperty(attr)) {
            noCircularFilter[attr] = filter[attr];
          }
        }
        noCircularFilter.subscriptions = null;
      }

      filterHitCrawler(request, noCircularFilter);
    }
  });

  // Add `filterHitCrawler` function that will actually be running in Node.js
  backgroundPage.exposeFunction("filterHitCrawler", function (request, filter) {
    // This is where we get to store all of the filter hits!
    logger.filterHitsLog.info("",
      {
        request: request,
        filter: filter
      });
  });

  // Register HitLogger for already existing tabs
  const hitLogger = await backgroundPage.evaluate(() => {
    chrome.tabs.query(
      {},
      function (tabArray) {
        tabArray.forEach(tab => {
          ext.HitLogger.addListener(tab.id, filterHit);
        });
      }
    );
  });

  // Register HitLogger for every newly created tab
  await backgroundPage.evaluate(() => {
    chrome.tabs.onCreated.addListener((tab) => {
      ext.HitLogger.addListener(tab.id, filterHit);
    });
    chrome.tabs.onRemoved.addListener((tabid) => {
      ext.HitLogger.removeListener(tabid, filterHit);
    });
  });

  // Update filter lists
  let extensionUrl = url.resolve(
    "chrome-extension://" + url.parse(backgroundPageTarget.url()).host + "/",
    "desktop-options.html#advanced"
  );
  let optionsPage = await crawler._browser.newPage();
  await optionsPage.goto(extensionUrl);
  const updateButtonSelector = ".i18n_options_filterList_update";
  await optionsPage.waitForSelector(updateButtonSelector);
  await optionsPage.click(updateButtonSelector);
  // TODO: figure out the `filter list update finished` event to wait for 
  sleep(5000);
  await optionsPage.close();
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

  await initABP();
  
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

async function close() {
  await crawler.close();
}

module.exports = {
  launchCrawler: launchCrawler,
  addToqueue: addToqueue,
  waitForFinish: waitForFinish,
  close: close
}