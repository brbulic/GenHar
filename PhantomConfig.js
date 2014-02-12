/**
 * Created by brbulic on 12/02/14.
 */

var ExitModule = function () {
    "use strict";

    var ExitPhantom = function (number) {
        number = number || 0;
        phantom.exit(number);
    };

    return {
        ExitPhantom : ExitPhantom
    }
};

var SaveModule = require("./SaveModuleDesktop");
var exitModule = new ExitModule();

exports.Config = {
    SaveModule : SaveModule,
    ExitModule : exitModule
};