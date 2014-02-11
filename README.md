## GenHar

### GenHar for PhantomJS

To use: `phantomjs hosts_genhar_uas.js <some URL> [SETTINGS]`
Or you can use the included measure script called `measure.sh` by invoking `./measure.sh <some url>` on \*nix based systems. 

The script will generate the hosts array, HAR file _SITE\_NAME-har.json_ and the HTML (.html) page for the finished measurement.

For iOS usage use the `iphone` branch since that script has been adapted to be used with the iOS version of PhantomJS which has it's own special API (thx Brian). Android support should be implemented soon.

### iphone branch specifics

The `iphone` branch script doesn't strip the `urlArray` from the resulting json because the list of all URLs is used to do DNS queries because of DNS timings and write IP addresses of those hosts to the HAR file, which PhantomJS cannot currently do but must be manually done using the iOS CocoaTouch/CoreFoundation frameworks.

### Android support

WIP

### Configure the PhantomJS script 

The PhantomJS script uses a PhantomJS script which requires a certain config. For example:

    {
        appVersion: "v1.71 DEBUG HAR .info",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 6_1 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Mobile/10B141",
        appOS: "iOS",
        appDate: "2000-12-27 13:37:59 +0000"
    }

Just fill these elements with the required data and the script will create the marlin custom header called `HTTP_X_MARLIN_MOBILE` with App Version, App OS and App Date. The `userAgent` will be used for setting the custom user agent.

After setting up the config, give the raw JSON (not the `settings.json` file path) as the command line argument if you intend to run it without using `measure.sh` script. On non \*nix based systems you can create a command line script (`runme.cmd` for example) to easily measure URL-s.

### Parsing the HAR file.

Easy and straightforward. Go to http://www.softwareishard.com/blog/har-viewer/ and paste the HAR file contents to the viewer. The HAR file generated by the `hosts_genhar_uas.js` should be valid.

### Conclusion

If you should find bugs in the measurement process, please create a ticket in the GitHub site and create a pull request if you figure out the solution. The script itself has a lot of PhantomJS workarounds which need to be used in order to create a valid HAR file.