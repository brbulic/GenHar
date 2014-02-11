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

exports.filenameMapper = filenameMapper;