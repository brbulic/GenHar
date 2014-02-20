var Utilities = require("./Utilities");

var GenHarFactory = function (page, address, title, resources, config) {
    "use strict";
    var entries = [],
        urlArray = [],
        processedTitle = title.length === 0 ? address : address + ' (' + title + ')',
        useHeaders = config.fullHeader;

    resources.forEach(function (resource) {
        var request = resource.request,
            connected = resource.connected,
            started = request.created,
            redirectUrl = "",
            fallbackBodySize = 0,
            bodySize,
            contents = null,
            url = request.url;

        if (!request || !connected) {
            return;
        }

        if (connected.compressedSize !== connected.bodySize) {
            contents = {
                compression: connected.compressedSize,
                size: connected.bodySize,
                mimeType: connected.contentType
            };
        } else {
            contents = {
                size: connected.bodySize,
                mimeType: connected.contentType
            };
        }

        if (connected.opened > request.created) {
            started = connected.opened;
        }

        if (!started) {
            console.log("Element is unfinished with URL: " + url);
        }

        var headers = [];

        if (useHeaders) {
            headers.push({
                name : "UncompressedSize",
                value : (connected.bodySize || 0).toString()
            });
            var contentLengthHeader = null;

            connected.headers.forEach(function (element) {
                if (connected.status === 302 || connected.status === 301) {
                    if (element.name === "Location") {
                        redirectUrl = element.value;
                    }
                }

                if (element.name === "Content-Length") {
                    fallbackBodySize = parseInt(element.value, 10);

                    if (contents.compression) {
                        element.value = (contents.compression).toString();
                    }

                    contentLengthHeader = element;
                }

                headers.push(element);
            });

            if (contentLengthHeader === null) {
                var a = {
                    name : "Content-Length",
                    value : (contents.compression || 0).toString()
                };
                headers.push(a);
            }
        }

        if (url !== undefined && url !== null && url.indexOf(";base64") !== -1) {
            url = url.substring(0, 128);
        }

        bodySize = contents.compression || (contents.size || 0);

        if (bodySize === 0 || bodySize === undefined) {
            bodySize = fallbackBodySize;
            console.log("Body size is Zero or Undefined");
        }

        urlArray.push(request.url);
        entries.push({
            startedDateTime: request.time.toISOString(),
            time: connected.done - request.created,
            request: {
                method: request.method,
                url: url,
                httpVersion: "HTTP/1.1",
                cookies: [],
                headers: useHeaders ? request.headers : [],
                queryString: [],
                headersSize: -1,
                bodySize: -1
            },
            response: {
                status: connected.status,
                statusText: connected.statusText,
                httpVersion: "HTTP/1.1",
                cookies: [],
                headers: headers,
                redirectURL: redirectUrl,
                headersSize: -1,
                bodySize: bodySize,
                content: {
                    size: bodySize,
                    uncompressedSize : contents.bodySize || 0,
                    mimeType: (contents.mimeType || '')
                }
            },
            cache: {},
            timings: {
                blocked: started - request.created,
                dns: connected.resolved - started,
                connect: connected.connected - connected.resolved,
                send: connected.sent - connected.connected,
                wait: connected.recv - connected.sent,
                receive: connected.done - connected.recv,
                ssl: connected.ssl
            },
            pageref: address
        });
    });

    var renderings = [];
    if (page.nrend > 0) {
        page.renderTime = page.rends[0].end;
    } else {
        page.renderTime = page.endTime;
    }
    page.rends.forEach(function (rend) {
        renderings.push({
            id: rend.id,
            url: rend.url,
            rect: rend.rect,
            start: rend.start,
            end: rend.end,
            time: rend.rendtime
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
                        onLoad: page.endTime - page.startTime,
                        browserFirstLoad: page.firstResource - page.startTime,
                        onContentLoad: page.renderTime - page.startTime,
                        _st: page.startTime,
                        _et: page.endTime
                    }
                }
            ],
            entries: entries,
            _renderings: renderings
        },
        urls_for_dns: {
            urlArray: urlArray
        }
    };
};

var SendAndComplete = function (externalConfig) {
    'use strict';
    var previousEntries = [],
        previousPages = [],
        currentHar = null,
        config = {
            fullHeader : externalConfig.fullHeader,
            fullSpeed : externalConfig.fullSpeed
        };

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

        var tempHar = new GenHarFactory(webPage, webPage.address, webPage.title, webPage.resources, config);

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

exports.createNew = function (externalConfig) {
    return new SendAndComplete(externalConfig);
};