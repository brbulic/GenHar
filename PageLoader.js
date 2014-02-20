/**
 * Created by brbulic on 12/02/14.
 */
var PageLoader = function (measuredUrl, userConfig) {
    'use strict';

    var page = require('webpage').create(),
        Utilities = require("./Utilities"),
        result = Utilities.marlinHeadersSetup(userConfig),
        timer = null;

    var currentlyLoadingElements = 0,
        lastElementCount = 0,
        deltasZeroCount = 0,
        isRedirect = false,
        redirectURL = null;


    page.address = measuredUrl;
    page.resources = [];
    page.rends = [];
    page.nrend = 0;

    page.settings.userAgent = userConfig.userAgent;

    var self = this;

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
            connected: null,
            endReply: null
        };
        var requestUrl = req.url;
        if (Utilities.isUrlStringValidUrl(requestUrl)) {
            currentlyLoadingElements = currentlyLoadingElements + 1;
        }
    };

    page.onResourceReceived = function (res) {
        var pageResource = page.resources[res.id];

        if (res.stage === 'connected') {
            pageResource.connected = res;
        }

        if (res.stage === 'end') {
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
            redirectURL = url;
        }
    };

    page.startTime = new Date();

    var startMeasurement = function () {
        page.startTime = new Date();

        page.open(measuredUrl, function (status) {
            if (status !== 'success') {
                if (isRedirect === false) {
                    console.log("FAILED loading of url: " + measuredUrl);

                    if (self.onError !== undefined && self.onError !== null) {
                        self.onError({
                            status: 'FAILED',
                            message: 'Measurement was not successful',
                            data: {}
                        });
                    }

                    page.close();

                } else {
                    console.log("This is a buggy redirect. Redirecting to page: " + redirectURL);

                    if (self.onRedirect !== undefined && self.onRedirect !== null) {
                        self.onRedirect({
                            status: 'REDIRECT',
                            message: 'Measurement was not successful since there is a nonstandard redirect in place.',
                            data: {
                                redirectURL: redirectURL
                            }
                        });
                    }

                    page.close();
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
                                if (self.onFinished !== undefined && self.onFinished !== null) {
                                    self.onFinished({
                                        status: 'SUCCESS',
                                        message: measuredUrl + " has been measured.",
                                        data: {}
                                    });
                                }
                                clearInterval(timer);

                                page.close();
                            }
                        }, 1000);
                    }, 2500);
                } else {
                    console.log("Loading done! Saving it all...");
                    if (self.onFinished !== undefined && self.onFinished !== null) {
                        self.onFinished({
                            status: 'SUCCESS',
                            message: measuredUrl + " has been measured.",
                            data: {}
                        });
                    }

                    page.close();
                }
            }
        });

        return page;
    };

    self = {
        onFinished: null,
        onError: null,
        onRedirect: null,
        page: page,
        startMeasurement: startMeasurement
    };

    return self;
};

exports.buildLoader = function (url, userConfig) {
    "use strict";
    return new PageLoader(url, userConfig);
};