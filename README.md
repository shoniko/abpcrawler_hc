Adblock Plus crawler
===
This is a Web crawler, which uses [Headless Chrome Crawler](https://github.com/yujiosaka/headless-chrome-crawler) to load Adblock Plus extension, crawl a list of provided URLs with any given depth and log filter hit results.

This requires a small change in [adblockpluschrome](https://github.com/adblockplus/adblockpluschrome) to expose the [HitLogger class](https://github.com/adblockplus/adblockpluschrome/blob/master/lib/hitLogger.js#L163). In the end of the file just add this line: `ext.HitLogger = HitLogger;`

Running a crawl manually
===
Checkout the repository and then run:

    npm install
When that is done, launch the crawl with
    
    npm start -- -p ./devenv.chrome -u ./top500.domains.csv

This will run the crawl and store results into `filterhits.log` file in current directory.

Settings file
===
There are two ways of providing parameters to a crawler. First - through the command line, which has the highest priority. Second - through a config file `settings.json`, which looks like this:

```
{
    // path to a file which specifies a list of URLs to crawl
    "urllist":"settings/listofurls.csv",
    // path to Adblock Plus
    "abppath":"/path/to/adblockpluschrome/devenv.chrome",
    // Crawling depth
    "depth": 0,
    // Output folder
    "output": "/path/to/output/folder"
    // enable taking screenshots
    "screenshots": true,
    // time to wait before making a screenshot
    "screenshotsDelay": 5000,
}

```
Input URLs file structure
===
Input URLs should be provided in a `.csv` file, where URLs are a second column. Something like this:

```
Number,URL
1,https://www.firsturl.com/
2,https://www.secondurl.com/
```

Running a Docker container
===
Checkout the repository and then run:

    docker build -t abp-crawler .

This will build a container image based on the `Dockerfile` and name it `abp-crawler`. To run a crawl it is better to mount a volume with a settings file and input URLs. Also to get results it's better to mount a separate volume for results folder. So, create a `settings` folder and create `settings.json` file there and then create a `result` folder and mount them like so: 

    docker run -v ~/settings:/home/crawler/settings -v ~/result:/home/crawlresult abp-crawler

Log file structure
===

Log file is a list of lines, where each line is a JSON object.

Both blocked and non-blocked requests are logged. Non-blocked requests have a `filter` parameter set to `null.

    {"request":{"url":"https://creativecommons.org/wp-content/themes/cc/js/sticky-nav.js","type":"SCRIPT","docDomain":"creativecommons.org","thirdParty":false,"sitekey":null,"specificOnly":false},"filter":null,"level":"info","message":""}

Blocked requests have filter set to actual filter that triggered the blocking:

    {"request":{"url":"http://simple-adblock.com/adblocktest/files/adbanner.gif","type":"IMAGE","docDomain":"simple-adblock.com","thirdParty":false,"sitekey":null,"specificOnly":false},"filter":{"text":"/adbanner.","subscriptions":null,"regexpSource":null,"sitekeys":null},"level":"info","message":""}

Element hiding filters are also logged, when they are being hit:

    {"request":{"url":"https://www.amazon.com/","type":"ELEMHIDE","docDomain":"www.amazon.com"},"filter":{"text":"@@||amazon.com^$elemhide","subscriptions":null,"contentType":1073741824,"regexpSource":null,"sitekeys":null},"level":"info","message":""}

Screenshots
===
Screenshots are stored in the output folder in a `screenshots` directory.
