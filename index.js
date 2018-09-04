const csv = require("csv-parse");
const fs = require("fs");
const path = require("path");
const commandLineArgs = require("command-line-args")
const crawler = require("./crawler");
const singlePageCrawl = require("./singlepagecrawl");
const opt = require("./options");

let options = commandLineArgs(opt.optionDefinitions);
options = opt.loadFromSettingsFile(options);
if (!opt.areOptionsCorrect(options)) {
  opt.printUsage();
}

if (options.screenshots){
  if (!fs.existsSync(options.output)) {
    fs.mkdirSync(options.output);
  }
  let screenshotsDir = path.join(options.output, "/screenshots");
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }
}
(async() => {
  if (typeof options.singlePage != "undefined") {
    await singlePageCrawl.runOnURL(options);
    console.log("All done!");
    return;
  }
  // Launch the crawler
  await crawler.launchCrawler(options);

  // Add URLs to crawler's queue
  let parser = csv({
    delimiter: ',',
    columns: true
  }, function (err, data) {
    data.forEach(async line => {
      let url = line.URL.indexOf("http") == 0 ? line.URL : "https://" + line.URL; 
      await crawler.addToqueue(url, typeof options.depth == "undefined" ? 0 : options.depth);
    });
  });
  fs.createReadStream(options.urllist).pipe(parser);
  
  await crawler.waitForFinish();
  await crawler.close();
  console.log("All done!");
})();