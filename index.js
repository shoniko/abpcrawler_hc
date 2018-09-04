const commandLineArgs = require("command-line-args")
const commandLineUsage = require("command-line-usage")
const csv = require("csv-parse");
const fs = require("fs");
const path = require("path");
const crawler = require("./crawler");
const singlePageCrawl = require("./singlepagecrawl");

const optionDefinitions = [
  { name: "abppath", alias: "p", type: String},
  { name: "urllist", alias: "u", type: String},
  { name: "output", alias: "o", type: String},
  { name: "screenshots", alias: "s", type: Boolean },
  { name: "screenshots-delay", alias: "y", type: Number },
  { name: "depth", alias: "d", type: Number},
  { name: "postProcessing", alias: "c", type: String },
  { name: "settings", alias: "t", type: String },
  { name: "userDataDir", alias: "e", type: String },
  { name: "concurrency", alias: "r", type: Number },
  { name: "single-page", alias: "i", type: String }
];

const options = commandLineArgs(optionDefinitions);

try {
  let settingsPath = options.settings
  if (typeof settingsPath == "undefined")
    settingsPath = "settings/settings.json"
  let settings = JSON.parse(fs.readFileSync(settingsPath));
  if (typeof options.urllist == "undefined") {
    options.urllist = settings.urllist;
  }
  if (typeof options.abppath == "undefined") {
    options.abppath = settings.abppath;
  }
  if (typeof options.output == "undefined") {
    options.output = settings.output;
  }
  if (typeof options.screenshots == "undefined") {
    options.screenshots = settings.screenshots;
  }
  if (typeof options.screenshotsDelay == "undefined") {
    options.screenshotsDelay = settings.screenshotsDelay;
  }
  if (typeof options.depth == "undefined") {
    options.depth = settings.depth;
  }
  if (typeof options.postProcessing == "undefined") {
    options.postProcessing = settings.postProcessing;
  }
  if (typeof options.userDataDir == "undefined") {
    options.userDataDir = settings.userDataDir;
  }
  if (typeof options.concurrency == "undefined") {
    options.concurrency = settings.concurrency;
  }
  if (typeof options.singlePage == "undefined") {
    options.singlePage = settings.singlePage;
  }
}
catch(e){
  console.log("Settings file not found. Proceding with command line arguments.");
}

if (!options.abppath || !options.urllist)
{
  const sections = [
    {
      header: "Adblock Plus Headless Chrome Crawler",
      content: "Crawls the web and stores the filter hit statistics, along with the requests made."
    },
    {
      header: "Options",
      optionList: [
        {
          name: "abppath -p",
          typeLabel: "{underline directory}",
          description: "Path to unpacked ABP for Chrome."
        },
        {
          name: "urllist -u",
          typeLabel: "{underline file}",
          description: "A CSV list of URLs to crawl. URL to crawl is a second parameter. https://moz.com/top500/domains/csv is a good start"
        },
        {
          name: "output -o",
          typeLabel: "{underline directory}",
          description: "Path to an output folder."
        },
        {
          name: "screenshots -o",
          typeLabel: "{underline Boolean}",
          description: "Enable taking a screenshot."
        },
        {
          name: "screenshotsDelay -y",
          typeLabel: "{underline Number}",
          description: "Milliseconds to wait before making a screenshot."
        },
        {
          name: "depth -d",
          typeLabel: "{underline integer}",
          description: "A crawl depth"
        },
        {
          name: "postProcessing -c",
          typeLabel: "{underline String}",
          description: "A command to run on every page as a post processing step."
        },
        {
          name: "settings -t",
          typeLabel: "{underline String}",
          description: "Path to settings file. Default `settings/settings.json`."
        },
        {
          name: "concurrency -r",
          typeLabel: "{underline integer}",
          description: "Maximum concurrency of requests. NOTE: if taking screenshots is enabled it is best to set concurrency to 1. See: https://github.com/GoogleChrome/puppeteer/issues/1479"
        },
      ]
    },
    {
      header: "Settings file",
      content: "Alternatively settings can be set using file (by default in `settings/settings.json`). Command line parameters have higher priority."
    }

  ]
  const usage = commandLineUsage(sections)
  console.log(usage)
  return;
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