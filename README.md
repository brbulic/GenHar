## GenHar

### GenHar for PhantomJS

To use: `phantomjs hosts_genhar_uas.js <some URL> [SETTINGS]`
Or you can use the included measure script called `measure.sh` by invoking `./measure.sh <some url>` on \*nix based systems. 

The script will generate the hosts array, HAR file (.json) and the HTML (.html) page for the finished measurement.

For iOS usage use the iphone branch since that script has been adapted to be used with the iphone version of PhantomJS which has it's own special API.

### Configure current PhantomJS

The phantomjs script uses a phantomjs script which requires a certain config. For example:

    {
        appVersion: "v1.71 DEBUG HAR .info",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 6_1 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Mobile/10B141",
        appOS: "iOS",
        appDate: "2000-12-27 13:37:59 +0000"
    }

Just fill these elements with the required data and the script will create custom headers (`HTTP_X_MARLIN_MOBILE`) with App Version, App OS and App Date. The userAgent will be used for setting the custom user agent.

After setting up the config, give the raw JSON (not the settings.json file) as the command line argument if you intend to run it without using `measure.sh` script. On non \*nix based systems you can create a command line script (`runme.cmd` for example) to easily measure URL-s.