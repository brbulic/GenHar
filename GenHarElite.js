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

/* Real application begins */

var system = require('system'),
    HarFactory,
    Utilities = require("./Utilities");

var startingAddress = null,
    redirectAddress = null,
    userConfig = null,
    isRedirect = null;

var currentlyLoadingElements = 0;
var lastElementCount = 0;
var deltasZeroCount = 0;

var renderAndMeasurePage = function (measuredUrl) {
    'use strict';

    var page = require('webpage').create(),
        result = Utilities.marlinHeadersSetup(userConfig),
        timer = null;

    isRedirect = false;

    page.address = measuredUrl;
    page.resources = [];
    page.rends = [];
    page.nrend = 0;

    if (result !== null && result.length > 0) {
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
        page.resources[resourceError.id].startReply = null;
        currentlyLoadingElements = currentlyLoadingElements - 1;
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

    page.onRenderingComplete = function (rend) {
        page.rends[page.nrend++] = rend;
    };

    page.onResourceRequested = function (req) {
        if (page.firstResource < page.startTime) {
            throw "First resource is not started BEFORE the browser start";
        }
        page.resources[req.id] = {
            request: req,
            startReply: req,
            endReply: null
        };
        var requestUrl = req.url;
        if (Utilities.isUrlStringValidUrl(requestUrl)) {
            currentlyLoadingElements = currentlyLoadingElements + 1;
        }
    };

    page.onResourceReceived = function (res) {

        var pageResource = page.resources[res.id];

        if (res.stage === 'start') {
            pageResource.startReply = res;
            if (page.firstResource === undefined) {
                page.firstResource = res.time;
            }
        }
        if (res.stage === 'received') {
            // only deduce elements if the resource has been received
            var currentRes = page.resources[res.id];
            currentRes.endReply = res;
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
        if (res.stage === 'end') {
            if (page.resources[res.id].endReply === null) {
                page.resources[res.id].endReply = res;
            }
            var url = page.resources[res.id].request.url;
            if (Utilities.isUrlStringValidUrl(url)) {
                currentlyLoadingElements = currentlyLoadingElements - 1;
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

    page.startTime = new Date();
    page.open(measuredUrl, function (status) {
        if (status !== 'success') {
            if (isRedirect === false) {
                console.log("FAILED loading of url: " + startingAddress);
                phantom.emitHar("FAILED");
            } else {
                console.log("This is a buggy redirect. Redirecting to page: " + redirectAddress);
                HarFactory.populateFromWebPage(page);
                page.close();
                renderAndMeasurePage(redirectAddress);
            }
        } else {
            page.endTime = new Date();
            page.title = page.evaluate(function () {
                return document.title;
            });

            if (userConfig.fullSpeed) {
                console.log("Loading done! Waiting for all elements to finish...");
                setTimeout(function () {
                    timer = setInterval(function () {
                        var lastDelta = lastElementCount - currentlyLoadingElements;
                        if (lastDelta === 0) {
                            deltasZeroCount = deltasZeroCount + 1;
                        } else {
                            deltasZeroCount = 0;
                        }

                        lastElementCount = currentlyLoadingElements;

                        console.log("Currently loading elements: " + currentlyLoadingElements);
                        console.log("Completed Delta: " + lastDelta);

                        if (currentlyLoadingElements <= 0 || deltasZeroCount > 30) {
                            clearInterval(timer);

                            HarFactory.populateFromWebPage(page);
                            page.close();

                            var SaveModule = require("./SaveModuleMobile").createNew(page, HarFactory);
                            SaveModule.execute();

                            console.log("All done! Thanks!");
                        }
                    }, 1000);
                }, 2500);
            } else {
                console.log("Loading done! Saving it all...");
                HarFactory.populateFromWebPage(page);
                page.close();

                var SaveModule = require("./SaveModuleMobile").createNew(page, HarFactory);
                SaveModule.execute();

                console.log("All done! Thanks!");
            }
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
    } else {
        userConfig = {
            fullHeader : true,
            fullSpeed: true
        };
    }

    console.log("Settings :\n" + JSON.stringify(userConfig, undefined, 1));

    HarFactory = require("./HarFactory").createNew(userConfig);
    renderAndMeasurePage(startingAddress);
}
