'use strict'
const singlePageCrawl = require("../../singlepagecrawl");
const fs = require("fs");

function base64_encode(file) {
  // read image
  let png = fs.readFileSync(file);
  // convert to base64 string
  return new Buffer(png).toString('base64');
}

module.exports = async function (req, res, options) {
  if (typeof req.body.url == "undefined") {
    throw "URL was undefined";
  }
  if (typeof req.body.delay != "undefined") {
    options.screenshotsDelay = req.body.delay;
  }
  options.singlePage = req.body.url;

  const crawlResult = await singlePageCrawl.runOnURL(options);
  res.json({
    adsDetected: crawlResult.adsDetected,
    url: req.body.url,
    screenshot: base64_encode(crawlResult.screenshotPath)
  });
};