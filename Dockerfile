# See https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md#running-puppeteer-in-docker
FROM node:8-slim

# See https://crbug.com/795759
RUN apt-get update && apt-get install -yq libgconf-2-4

# Install latest chrome dev package and fonts to support major charsets (Chinese, Japanese, Arabic, Hebrew, Thai and a few others)
# Note: this installs the necessary libs to make the bundled version of Chromium that Puppeteer
# installs, work.
RUN apt-get update && apt-get install -y wget --no-install-recommends \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-unstable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst ttf-freefont \
       # Adblock Plus crawler specific prerequisites
       git python-pip \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get purge --auto-remove -y curl \
    && rm -rf /src/*.deb

# It's a good idea to use dumb-init to help prevent zombie chrome processes.
ADD https://github.com/Yelp/dumb-init/releases/download/v1.2.0/dumb-init_1.2.0_amd64 /usr/local/bin/dumb-init
RUN chmod +x /usr/local/bin/dumb-init

# Install puppeteer so it's available in the container.
RUN yarn add headless-chrome-crawler

# Clone and build adblockpluschrome extension
WORKDIR /home
RUN git clone https://github.com/adblockplus/adblockpluschrome.git
WORKDIR /home/adblockpluschrome
RUN echo "ext.HitLogger = HitLogger;" >> /home/adblockpluschrome/lib/hitLogger.js
RUN pip install jinja2
RUN python build.py devenv -t chrome

# Set up the crawler
RUN mkdir /home/crawler
COPY *.js /home/crawler/
COPY package.json /home/crawler/
RUN mkdir /home/crawler/userdatadir
COPY userdatadir /home/crawler/userdatadir
WORKDIR /home/crawler
RUN npm install

# Download the moz500 input URLs
RUN wget -O crawlurls.csv https://moz.com/top500/domains/csv

RUN apt-get update && apt-get install -y xvfb

ENTRYPOINT ["dumb-init", "--"]
CMD ["xvfb-run", "--", "npm", "start", "--", "-p", "/home/adblockpluschrome/devenv.chrome", "-o", "/home/crawlresult/"]