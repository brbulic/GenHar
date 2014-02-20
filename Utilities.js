var attachPreviousEntries = function (currentEntries, newEntries) {
    "use strict";

    if (!(currentEntries instanceof Array)) {
        return;
    }

    newEntries.forEach(function (obj) {
        currentEntries.push(obj);
    });
};

// Make sure that the Element has a valid, fetchable URL
var isUrlStringValidUrl = function (requestUrl) {
    "use strict";
    return (requestUrl.indexOf("://") === 0);
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
    "use strict";

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
        console.log("Response doesn't have an error code");
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