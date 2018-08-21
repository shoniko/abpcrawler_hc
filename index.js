const commandLineArgs = require("command-line-args")
const commandLineUsage = require("command-line-usage")
const csv = require("csv-parse");
const fs = require("fs");
const crawler = require("./crawler");

const optionDefinitions = [
  { name: "abppath", alias: "p", type: String },
  { name: "urllist", alias: "u", type: String },
  { name: "depth", alias: "d", type: String, defaultValue: 0 }
];

const options = commandLineArgs(optionDefinitions);

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
          name: "depth -d",
          typeLabel: "{underline integer}",
          description: "A crawl depth"
        }
      ]
    }
  ]
  const usage = commandLineUsage(sections)
  console.log(usage)
  return;
}

(async() => {
  // Launch the crawler
  const pathToExtension = options.abppath;
  await crawler.launchCrawler(pathToExtension);

  // Add URLs to crawler's queue
  let parser = csv({
    delimiter: ',',
    columns: true
  }, function (err, data) {
    data.forEach(async line => {
      await crawler.addToqueue("https://" + line.URL, options.depth);
    });
  });
  fs.createReadStream(options.urllist).pipe(parser);
  
  await crawler.waitForFinish();
})();