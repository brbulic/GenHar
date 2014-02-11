var attachPreviousEntries = function (currentEntries, newEntries) {
    'use strict';

    if (!(currentEntries instanceof Array)) {
        return;
    }

    newEntries.forEach(function (obj) {
        currentEntries.push(obj);
    });
};

var isUrlStringValidUrl = function (requestUrl) {
    return (requestUrl.indexOf("http://") === 0 || requestUrl.indexOf("https://") === 0);
};

var marlinHeadersSetup = function (userAppConfig) {
    "use strict";
    var finish = [];

    if (userAppConfig.appOS !== undefined) {
        finish.push(userAppConfig.appOS, ' ');
    }
    if (userAppConfig.appVersion !== undefined) {
        finish.push(userAppConfig.appVersion, ' ');
    }
    if (userAppConfig.appDate !== undefined) {
        finish.push(userAppConfig.appDate, ' ');
    }

    return finish.join('').trim();
};

var createStatusFromResponse = function (response) {
    'use strict';

    if (response === null) {
        return {
            status: 0,
            statusText: "Unfinished"
        };
    }

    var isError = response.errorCode !== undefined,
        status = response.status || '',
        statusText = response.statusText || '';

    if (isError) {
        console.log("Simun petar");
        status = response.errorCode;
        statusText = response.errorString;
    }

    return {
        status: status,
        statusText: statusText
    };
};

exports.attachPreviousEntries = attachPreviousEntries;
exports.isUrlStringValidUrl = isUrlStringValidUrl;
exports.marlinHeadersSetup = marlinHeadersSetup;
exports.createStatusFromResponse = createStatusFromResponse;