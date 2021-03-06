/**
 * Created by brbulic on 11/02/14.
 */
var SaveModule = function (page, HarFactory) {
    "use strict";
    var harString;

    if (HarFactory !== null && HarFactory !== undefined) {
        harString = HarFactory.harString();
    }

    var execute = function () {
        if (!harString) {
            phantom.emitData("FAILED");
        } else {
            phantom.emitData(harString);
        }
    };
    return {
        execute: execute
    };
}

exports.createNew = function (page, harFactory) {
    return new SaveModule(page, harFactory);
}