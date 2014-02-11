var Utilities = require("./Utilities");

var GenHarFactory = function (page, address, title, resources) {
    "use strict";
    var entries = [],
        urlArray = [],
        processedTitle = title.length === 0 ? address : address + ' (' + title + ')';

    resources.forEach(function (resource) {
        var request = resource.request,
            startReply = resource.startReply,
            endReply = resource.endReply,
            redirectUrl = "",
            fallbackBodySize = 0,
            bodySize,
            statuses = Utilities.createStatusFromResponse(endReply),
            url = request.url;

        if (!request || !startReply) {
            return;
        }

        if (!endReply) {
            endReply = {
                time : request.time,
                unfinished : true,
                headers : []
            };
            console.log("Element is unfinished with URL: " + url);
        } else {
            endReply.unfinished = false;
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

        if (url !== undefined && url !== null && url.indexOf(";base64") !== -1) {
            url = url.substring(0, 128);
        }

        bodySize = endReply.compressedSize || (endReply.bodySize || 0);

        if (bodySize === 0 || bodySize === undefined) {
            bodySize = fallbackBodySize;
            console.log("Body size is Zero or Undefined");
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
                bodySize: bodySize,
                content: {
                    size: bodySize,
                    mimeType: (endReply.contentType || '')
                }
            },
            cache: {},
            timings: {
                blocked: 0,
                dns: -1,
                connect: -1,
                send: 0,
                wait: !endReply.unfinished ? (startReply.time - request.time) : 0,
                receive: !endReply.unfinished ? (endReply.time - startReply.time) : 0,
                ssl: -1
            },
            pageref: address
        });
    });

    return {
        log: {
            version: '1.3',
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
                        onLoad: page.endTime - page.firstResource,
                        browserFirstLoad: page.firstResource - page.startTime,
                        onReady: (new Date()) - page.startTime
                    }
                }
            ],
            entries: entries
        },
        urls_for_dns: {
            urlArray: urlArray
        }
    };
};

var SendAndComplete = function () {
    'use strict';
    var previousEntries = [],
        previousPages = [],
        currentHar = null;

    var attachResults = function (pagesElements, harFileEntries, webPage) {
        if (webPage.startTime === undefined || webPage.endTime === undefined) {
            throw "Start and End times don't exist!";
        }

        if (pagesElements === undefined || harFileEntries === undefined) {
            throw "This is really crap you MOFO";
        }

        Utilities.attachPreviousEntries(previousEntries, harFileEntries);
        Utilities.attachPreviousEntries(previousPages, pagesElements);
    };

    var populateFromWebPage = function (webPage) {

        var tempHar = new GenHarFactory(webPage, webPage.address, webPage.title, webPage.resources);

        attachResults(tempHar.log.pages, tempHar.log.entries, webPage);

        tempHar.log.entries = previousEntries;
        tempHar.log.pages = previousPages;

        currentHar = tempHar;
    };

    var harString = function () {
        return JSON.stringify(currentHar, undefined, 1);
    };

    return {
        populateFromWebPage : populateFromWebPage,
        harFile : function () {
            return currentHar;
        },
        harString : harString

    };
}

exports.createNew = function () {
    return new SendAndComplete();
};