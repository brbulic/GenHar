/**
 * Created by brbulic on 11/02/14.
 */
var SaveModule = function (page, HarFactory) {
    var fs = require('fs');
    var FilenameMapper = require("./FilenameMapper");

    var urlForDns = HarFactory.harFile().urls_for_dns;
    var harString = HarFactory.harString();
    var urlForDnsString = JSON.stringify(urlForDns, undefined, 1);

    var execute = function () {
        fs.write(fs.workingDirectory + FilenameMapper.filenameMapper(page.title, 'har.json'), harString, 'w');
        fs.write(fs.workingDirectory + FilenameMapper.filenameMapper(page.title, 'hosts.json'), urlForDnsString, 'w');
        page.render(fs.workingDirectory + FilenameMapper.filenameMapper(page.title, 'screenshot.png'));
    };

    return {
        execute : execute
    };
}

exports.createNew = function (page, harFactory) {
    return new SaveModule(page, harFactory);
}