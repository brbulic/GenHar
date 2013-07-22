(function () {
  'use strict';
  if (!Date.prototype.hasOwnProperty('toISOString')) {
    Date.prototype.toISOString = function () {

      function pad(n) {
        return n < 10 ? '0' + n : n;
      }

      function ms(n) {
        return n < 10 ? '00' + n : n < 100 ? '0' + n : n;
      }

      return this.getFullYear() + '-' +
      pad(this.getMonth() + 1) + '-' +
      pad(this.getDate()) + 'T' +
      pad(this.getHours()) + ':' +
      pad(this.getMinutes()) + ':' +
      pad(this.getSeconds()) + '.' +
      ms(this.getMilliseconds()) + 'Z';
    };
  }
}());

var previousEntries = [];
var previousPages = [];

function attachPreviousEntries(prevEntries, currEntries) {
  'use strict';

  if (!(prevEntries instanceof Array)) {
    return;
  }

  currEntries.forEach(function (obj) {
    prevEntries.push(obj);
  });
}

function propertyExists(stringy) {
  'use strict';
  return (stringy !== 'undefined' && stringy !== null && stringy.length > 0);
}

function marlinHeadersSetup(userAppConfig) {
  "use strict";
  var finish = [];

  if (propertyExists(userAppConfig.appOS)) {
    finish.push(userAppConfig.appOS, ' ');
  }
  if (propertyExists(userAppConfig.appVersion)) {
    finish.push(userAppConfig.appVersion, ' ');
  }
  if (propertyExists(userAppConfig.appDate)) {
    finish.push(userAppConfig.appDate, ' ');
  }

  return finish.join('').trim();
}

function createHAR(page, address, title, startTime, endTime, resources) {
  'use strict';
  var entries = [],
  urlArray = [],
  processedTitle = title.length === 0 ? address : address + ' (' + title + ')';

  resources.forEach(function (resource) {
    var request = resource.request,
    startReply = resource.startReply,
    endReply = resource.endReply,
    redirectUrl = "";

    if (!request || !startReply || !endReply) {
      return;
    }
    if (endReply.status === 302) {
      endReply.headers.forEach(function (element) {
        if (element.name === "Location") {
          redirectUrl = element.value;
        }
      });
    }

    urlArray.push(request.url);
    entries.push({
      startedDateTime: request.time.toISOString(),
      time: endReply.time - request.time,
      request: {
        method: request.method,
        url: request.url,
        httpVersion: "HTTP/1.1",
        cookies: [],
        headers: request.headers,
        queryString: [],
        headersSize: -1,
        bodySize: -1
      },
      response: {
        status: (endReply.status || ''),
        statusText: (endReply.statusText || ''),
        httpVersion: "HTTP/1.1",
        cookies: [],
        headers: endReply.headers,
        redirectURL: redirectUrl,
        headersSize: -1,
        bodySize: startReply.bodySize,
        content: {
          size: startReply.bodySize,
          mimeType: endReply.contentType || ''
        }
      },
      cache: {},
      timings: {
        blocked: 0,
        dns: -1,
        connect: -1,
        send: 0,
        wait: startReply.time - request.time,
        receive: endReply.time - startReply.time,
        ssl: -1
      },
      pageref: address
    });
  });

return {
  log: {
    version: '1.2',
    creator: {
      name: "MarlinMobile",
      version: phantom.version.major + '.' + phantom.version.minor + '.' + phantom.version.patch
    },
    pages: [
    {
      startedDateTime: startTime.toISOString(),
      id: address,
      title: processedTitle,
      pageTimings: {
        onLoad: endTime - startTime
      }
    }
    ],
    entries: entries
  },
  urls_for_dns: {
    urlArray: urlArray
  }
};
}

function sendAndComplete(pagesElements, elements, webPage) {
  'use strict';
  if (webPage.startTime === 'undefined' || webPage.endTime === 'undefined') {
    throw "Start and End times don't exist!"
  }

  var tempHar = createHAR(webPage, webPage.address, webPage.title, webPage.startTime, webPage.endTime, webPage.resources);

  attachPreviousEntries(elements, tempHar.log.entries);
  attachPreviousEntries(pagesElements, tempHar.log.pages);

  tempHar.log.entries = previousEntries;
  tempHar.log.pages = previousPages;
  
  return JSON.stringify(tempHar, undefined, 0);
}

/* Real application begins */

var system = require('system');

var startingAddress = null,
  redirectAddress = null,
  userAgentProfile = null,
  userConfig = null,
  isRedirect = null;

var currentElementCount = 0;
var lastElementCount = 0;
var deltasZeroCount = 0;

var renderAndMeasurePage = function (measuredUrl) {
  'use strict';

  var page = require('webpage').create(),
  result = marlinHeadersSetup(userConfig),
  timer = null;

  isRedirect = false;

  page.address = measuredUrl;
  page.resources = [];

  if (userAgentProfile !== null) {
    page.settings.userAgent = userAgentProfile;
  }

  if (result !== null) {
    page.customHeaders = {
      'HTTP_X_MARLIN_MOBILE': result
    };
  }

  page.onLoadStarted = function () {
    page.startTime = new Date();
    console.log("Started loading " + measuredUrl);
  };

  page.onResourceError = function (resourceError) {
    currentElementCount = currentElementCount - 1;
    console.log('Unable to load resource (URL:' + resourceError.url + ')');
    console.log('Error code: ' + resourceError.errorCode + '. Description: ' + resourceError.errorString);
  };

  page.onError = function (msg, trace) {
    var msgStack = ['ERROR: ' + msg];
    if (trace) {
      msgStack.push('TRACE:');
      trace.forEach(function (t) {
        msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function + '")' : ''));
      });
    }
    console.error(msgStack.join('\n'));
  };

  page.onResourceRequested = function (req) {
    currentElementCount = currentElementCount + 1;
    page.resources[req.id] = {
      request: req,
      startReply: null,
      endReply: null
    };
  };

  page.onResourceReceived = function (res) {
    if (res.stage === 'start') {
      page.resources[res.id].startReply = res;
    }
    if (res.stage === 'end') {
      // only deduce elements if the resource has been recieved
      page.resources[res.id].endReply = res;
      currentElementCount = currentElementCount - 1;
    }
  };

  page.onNavigationRequested = function (url, type, willNavigate, main) {
    if (main && url !== page.address && page.startTime instanceof Date) {
      page.endTime = new Date();
      isRedirect = true;
      console.log("Redirecting to url: " + url + " from: " + page.address);
      redirectAddress = url;
    }
  };

  page.open(measuredUrl, function (status) {
    if (status !== 'success') {
      if (isRedirect === false) {
        console.log("FAILED loading of url: " + startingAddress);
        phantom.emitData('FAILED');
      } else {
        console.log("This is a buggy redirect. Redirecting to page: " + redirectAddress);
        var resHar = createHAR(page, page.address, page.title, page.startTime, page.endTime, page.resources);
        attachPreviousEntries(previousEntries, resHar.log.entries);
        attachPreviousEntries(previousPages, resHar.log.pages);
        page.close();
        renderAndMeasurePage(redirectAddress);
      }
    } else {

      console.log("Loading done! Waiting for all elements to finish...");
      page.title = page.evaluate(function () {
        return document.title;
      });

      setTimeout(function () {
        console.log("Waiting for initial timeout...");
        timer = setInterval(function () {
          var lastDelta = lastElementCount - currentElementCount;
          if (lastDelta === 0) {
            deltasZeroCount = deltasZeroCount + 1;
          }

          lastElementCount = currentElementCount;

          console.log("Currently loading elements: " + currentElementCount);
          console.log("Completed Delta: " + lastDelta);

          if (currentElementCount === 0 || deltasZeroCount > 4) {
            clearInterval(timer);
            page.endTime = new Date();
            var endHar = sendAndComplete(previousPages, previousEntries, page);
            page.close();
            phantom.emitData(endHar);
          }
        }, 1000);
      }, 2500);
    }
  });
};

if (system.args.length === 1) {
  console.log('Usage: genhar.js <some URL> [UAS]');
  phantom.emitData('INVALID_ARGUMENTS');
} else {
  phantom.onError = function (msg, trace) {
    'use strict';
    var msgStack = ['PHANTOM ERROR: ' + msg];
    if (trace && trace.length) {
      msgStack.push('TRACE:');
      trace.forEach(function (t) {
        msgStack.push(' -> ' + (t.file || t.sourceURL) + ': ' + t.line + (t.function ? ' (in function ' + t.function + ')' : ''));
      });
    }
    console.error(msgStack.join('\n'));
    phantom.exit(1);
  };

  startingAddress = system.args[1];

  var argsLength = system.args.length;
  if (argsLength === 3) {
    userConfig = JSON.parse(system.args[2]);
    if (userConfig.userAgent !== 'undefined') {
      userAgentProfile = userConfig.userAgent;
    }
  }

  renderAndMeasurePage(startingAddress);
}
