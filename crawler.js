const HCCrawler = require("headless-chrome-crawler");
const logger = require("./logger");
const sleep = require("system-sleep")

let crawler = null;

async function launchCrawler(pathToExtension)
{
  // Start the cralwer and load ABP
  crawler = await HCCrawler.launch({
    headless: false,
    args: ["--disable-extensions-except=" + pathToExtension,
    "--load-extension=" + pathToExtension],
    customCrawl: async (page, crawl) => {
        // We need to change the viewport of each page as it defaults to 800x600
        // see: https://github.com/GoogleChrome/puppeteer/issues/1183
        await page._client.send("Emulation.clearDeviceMetricsOverride");
        const result = await crawl();
        return result;
    }
  });

  // For whatever reason Puppeteer sometimes forgets to
  // list ABP background page as a target. This helps a little.
  sleep(1000);

  // Find ABP's background page  
  const targets = await crawler._browser.targets();
  const backgroundPageTarget = targets.find(target => {
    console.log("Title: " + target._targetInfo.title + " URL: " + target.url());

    if ((target.type() == "background_page") &&
        (target._targetInfo.title == "Adblock Plus"))
        {
            return true;
        }
  });
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
}

async function addToqueue(url, depth) {
  // Queue a request with custom options
  await crawler.queue({
    url: url,
    maxDepth: depth,
  });
}

async function waitForFinish() {
    sleep(1000);
    await crawler.onIdle();
}

module.exports = {
    launchCrawler: launchCrawler,
    addToqueue: addToqueue,
    waitForFinish: waitForFinish
}