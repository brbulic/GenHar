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

function createStatusFromResponse(response) {
    'use strict';

    if (response === null) {
        return {
            status : "",
            statusText : ""
        };
    }

    var isError = response.errorCode !== undefined,
        simun = response.status || '',
        petar = response.statusText || '';

    if (isError) {
        console.log("Simun petar");
        simun = response.errorCode;
        petar = response.errorString;
    }

    return {
        status: simun,
        statusText: petar
    };
}

function createHAR(page, address, title, resources) {
    'use strict';
    var entries = [],
        urlArray = [],
        processedTitle = title.length === 0 ? address : address + ' (' + title + ')';

    /*
     console.log("Page " + processedTitle + " started loading at: " + page.startTime.toISOString());
     console.log("Page " + processedTitle + " ended loading at: " + page.endTime.toISOString());
     */

    resources.forEach(function (resource) {
        var request = resource.request,
            startReply = resource.startReply,
            endReply = resource.endReply,
            redirectUrl = "",
            fallbackBodySize = 0,
            statuses = createStatusFromResponse(endReply);

        if (!request || !startReply || !endReply) {
            return;
        }

        endReply.headers.forEach(function (element) {
            if (endReply.status === 302 || endReply.status === 301) {
                if (element.name === "Location") {
                    redirectUrl = element.value;
                }
            }

            if (element.name === "Content-Length") {
                fallbackBodySize = parseInt(element.value, 10);
            }
        });

        var url = request.url;

        if (url !== undefined && url !== null && url.indexOf(";base64") != -1) {
          url = url.substring(0, 128);
        }

        urlArray.push(request.url);
        entries.push({
            startedDateTime: request.time.toISOString(),
            time: endReply.time - request.time,
            request: {
                method: request.method,
                url: url,
                httpVersion: "HTTP/1.1",
                cookies: [],
                headers: request.headers,
                queryString: [],
                headersSize: -1,
                bodySize: -1
            },
            response: {
                status: statuses.status,
                statusText: statuses.statusText,
                httpVersion: "HTTP/1.1",
                cookies: [],
                headers: endReply.headers,
                redirectURL: redirectUrl,
                headersSize: -1,
                bodySize: (startReply.bodySize || fallbackBodySize),
                content: {
                    size: (startReply.bodySize || fallbackBodySize),
                    mimeType: (endReply.contentType || '')
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
                    startedDateTime: page.startTime.toISOString(),
                    id: address,
                    title: processedTitle,
                    pageTimings: {
                        onLoad: page.endTime - page.startTime
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
        throw "Start and End times don't exist!";
    }

    if (pagesElements === 'undefined' || elements === 'undefined') {
        throw "This is really crap you MOFO";
    }

    var tempHar = createHAR(webPage, webPage.address, webPage.title, webPage.resources);

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

var currentlyLoadingElements = 0;
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
        if (page.startTime === undefined) {
            page.startTime = new Date();
        }
        console.log("Started loading " + measuredUrl + " on timestamp: " + page.startTime.toISOString());
    };

    page.onResourceError = function (resourceError) {
        console.log('Unable to load resource (URL:' + resourceError.url + ')');
        console.log('Error code: ' + resourceError.errorCode + '. Description: ' + resourceError.errorString);
        page.resources[resourceError.id].startReply = null
    };

    page.onError = function (msg, trace) {
        var msgStack = ['ERROR: ' + msg];
        currentlyLoadingElements = currentlyLoadingElements - 1;
        if (trace) {
            msgStack.push('TRACE:');
            trace.forEach(function (t) {
                msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function + '")' : ''));
            });
        }
        console.error(msgStack.join('\n'));
    };

    page.onResourceRequested = function (req) {

        if (page.startTime === undefined) {
            page.startTime = req.time;
        }

        currentlyLoadingElements = currentlyLoadingElements + 1;
        page.resources[req.id] = {
            request: req,
            startReply: null,
            endReply: null
        };
    };

    page.onResourceReceived = function (res) {

        var pageResouce = page.resources[res.id];

        if (res.stage === 'start') {
            pageResouce.startReply = res;
        }
        if (res.stage === 'end') {
            // only deduce elements if the resource has been recieved
            var currentRes = page.resources[res.id];

            currentRes.endReply = res;
            currentlyLoadingElements = currentlyLoadingElements - 1;

            if (currentRes.startReply === null) {
                console.log("An element without startReply. ID:" + res.id);
                if (res.contentType === null && res.headers.length === 0) {
                    console.log("Eliminating element because it's something with error.");
                    currentRes.startReply = null;
                } else {
                    currentRes.startReply = currentRes.request;
                }
            }
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
                var resHar = createHAR(page, page.address, page.title, page.resources);
                attachPreviousEntries(previousEntries, resHar.log.entries);
                attachPreviousEntries(previousPages, resHar.log.pages);
                page.close();
                renderAndMeasurePage(redirectAddress);
            }
        } else {

            console.log("Loading done! Waiting for all elements to finish...");
            page.endTime = new Date();
            page.title = page.evaluate(function () {
                return document.title;
            });

            setTimeout(function () {

                timer = setInterval(function () {
                    var lastDelta = lastElementCount - currentlyLoadingElements;
                    if (lastDelta === 0) {
                        deltasZeroCount = deltasZeroCount + 1;
                    }

                    lastElementCount = currentlyLoadingElements;

                    console.log("Currently loading elements: " + currentlyLoadingElements);
                    console.log("Completed Delta: " + lastDelta);

                    if (currentlyLoadingElements === 0 || deltasZeroCount > 10) {
                        clearInterval(timer);

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
