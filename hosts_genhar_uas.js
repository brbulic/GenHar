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


function attachPreviousEntries(prevEntries, currEntries) {
    'use strict';

    if (!(prevEntries instanceof Array)) {
        return;
    }

    currEntries.forEach(function(obj) {
        prevEntries.push(obj);
    });
}

function filenameMapper(filenamePrefix, filename) {
    'use strict';

    var fileNameResult = '/';
    if (filenamePrefix !== '') {
        fileNameResult = fileNameResult + filenamePrefix + '-' + filename;
    } else {
        fileNameResult = fileNameResult + filename;
    }
    return fileNameResult;
}

function createHAR(page, address, title, startTime, resources) {
    'use strict';
    var entries = [],
        urlArray = [],
        processedTitle = title.length == 0 ? address : address + ' (' + title + ')';

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
                        onLoad: page.endTime - page.startTime
                    }
                }
            ],
            entries: entries
        },
        urls_for_dns : {
            urlArray : urlArray
        }
    };
}

var system = require('system');
var fs = require('fs');

var startingAddress = null,
    redirectAddress = null,
    userAgentProfile = null,
    isRedirect = null;

var previousEntries     = [];
var previousPages       = [];

var renderAndMeasurePage = function(measuredUrl) {
    'use strict';

    var page = require('webpage').create();
    isRedirect = false;

    page.address = measuredUrl;
    page.resources = [];

    if (userAgentProfile !== null) {
        page.settings.userAgent = userAgentProfile;
    }

    page.onLoadStarted = function () {
        page.startTime = new Date();
        console.log("Started loading " + measuredUrl);
    };

    page.onResourceError = function (resourceError) {
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
            page.resources[res.id].endReply = res;
        }
    };

    page.onNavigationRequested = function(url, type, willNavigate, main) {
        if (main && url !== page.address && page.startTime instanceof Date) {
            page.endTime = new Date();
            isRedirect = true;
            console.log("Redirecting to url: " + url + " from: " + page.address);
            redirectAddress = url;
        }
    };

    page.open(measuredUrl, function (status) {
        fs.write(fs.workingDirectory + filenameMapper(page.title, 'page.html'), page.content, 'w');
        console.log('Current status is: ' + status);

        if (status !== 'success') {
           if(isRedirect === false) {
                console.log("FAILED loading of url: " + startingAddress);
                phantom.exit(1);
            } else {
                console.log("This is a buggy redirect. Redirecting to page: " + redirectAddress);
                var resHar = createHAR(page, page.address, page.title, page.startTime, page.resources);
                attachPreviousEntries(previousEntries, resHar.log.entries);
                attachPreviousEntries(previousPages, resHar.log.pages);
                page.close();
                renderAndMeasurePage(redirectAddress);
            }
        } else {

            console.log("Loading done!");

            page.endTime = new Date();
            page.title = page.evaluate(function () {
                return document.title;
            });
            
            var resultant = createHAR(page, page.address, page.title, page.startTime, page.resources);
            attachPreviousEntries(previousEntries, resultant.log.entries);
            attachPreviousEntries(previousPages, resultant.log.pages);

            previousEntries.sort(function(elem1, elem2) {
                return elem2.startedDateTime - elem1.startedDateTime;
            });

            resultant.log.entries = previousEntries;
            resultant.log.pages = previousPages;

            var hosts = resultant.urls_for_dns,
                hostsJson = JSON.stringify(hosts,undefined,4);
            delete resultant.urls_for_dns;
                
            var resultString = JSON.stringify(resultant, undefined, 4);

            console.log(page.title);
            fs.write(fs.workingDirectory + filenameMapper(page.title, 'har.json')   , resultString  , 'w');
            fs.write(fs.workingDirectory + filenameMapper(page.title, 'hosts.json') , hostsJson     , 'w');

            phantom.exit(0);
        }
    });
};

if (system.args.length === 1) {
    console.log('Usage: genhar.js <some URL> [UAS]');
    phantom.exit(1);
} else {
    phantom.onError = function(msg, trace) {
        'use strict';
        var msgStack = ['PHANTOM ERROR: ' + msg];
        if (trace && trace.length) {
            msgStack.push('TRACE:');
            trace.forEach(function(t) {
                msgStack.push(' -> ' + (t.file || t.sourceURL) + ': ' + t.line + (t.function ? ' (in function ' + t.function + ')' : ''));
            });
        }
        console.error(msgStack.join('\n'));
        phantom.exit(1);
    };

    startingAddress = system.args[1];

    var argsLength = system.args.length;
    if (argsLength === 3) {
        userAgentProfile = system.args[2];
    }

    renderAndMeasurePage(startingAddress);
}
