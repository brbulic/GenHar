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
    userConfig = null,
    PhantomConfig = require("./PhantomConfig"),
    PageLoaderProto = require("./PageLoader");


if (system.args.length === 1) {
    console.log('Usage: genhar.js <some URL> [UAS]');
    PhantomConfig.Config.ExitModule.ExitPhantom(1);
}

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
    PhantomConfig.Config.ExitModule.ExitPhantom(1);
};

var startingAddress = system.args[1];

var argsLength = system.args.length;
if (argsLength === 3) {
    userConfig = JSON.parse(system.args[2]);
} else {
    userConfig = {
        fullHeader: true,
        fullSpeed: true
    };
}

var HarFactory = require("./HarFactory").createNew(userConfig);

var doMeasure = function (address) {
    "use strict";
    var PageLoader = PageLoaderProto.buildLoader(address, userConfig);

    PageLoader.onError = function (result) {
        console.log(result.message);

        var saveModule = PhantomConfig.Config.SaveModule.createNew(PageLoader.page, null);
        saveModule.execute();

        PhantomConfig.Config.ExitModule.ExitPhantom();
    };

    PageLoader.onRedirect = function (result) {
        console.log(result.message);

        HarFactory.populateFromWebPage(PageLoader.page);

        doMeasure(result.data.redirectURL);
    };

    PageLoader.onFinished = function (result) {
        console.log(result.message + " " + result.status);
        HarFactory.populateFromWebPage(PageLoader.page);

        var saveModule = PhantomConfig.Config.SaveModule.createNew(PageLoader.page, HarFactory);
        saveModule.execute();

        PhantomConfig.Config.ExitModule.ExitPhantom();
    };

    PageLoader.startMeasurement();
};

doMeasure(startingAddress);




