/**
 * Created by brbulic on 11/02/14.
 */
var SaveModule = function (page, HarFactory) {
    var harString = HarFactory.harString();

    var execute = function () {
        phantom.emit(harString);
    };

    return {
        execute : execute
    };
}

exports.createNew = function (page, harFactory) {
    return new SaveModule(page, harFactory);
}