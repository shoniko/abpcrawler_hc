const sleep = require("system-sleep")
const url = require('url');

async function initABP(browser) {
    // For whatever reason Puppeteer sometimes forgets to
    // list ABP background page as a target. This helps a little.
    sleep(1000);
  
    // Find ABP's background page  
    const targets = await browser.targets();
    const backgroundPageTarget = targets.find(target => {
      console.log("Title: " + target._targetInfo.title + " URL: " + target.url());
  
      if ((target.type() == "background_page") &&
        (target._targetInfo.title == "Adblock Plus")) {
        return true;
      }
    });
    if (typeof backgroundPageTarget == "undefined")
      throw "ABP not found!";
  
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
    let optionsPage = await browser.newPage();
    await optionsPage.goto(extensionUrl);
    const updateButtonSelector = ".i18n_options_filterList_update";
    await optionsPage.waitForSelector(updateButtonSelector);
    await optionsPage.click(updateButtonSelector);
    // TODO: figure out the `filter list update finished` event to wait for 
    sleep(5000);
    await optionsPage.close();
  }

module.exports = {
  initABP: initABP
}