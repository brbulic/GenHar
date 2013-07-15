#!/bin/bash

echo {$1}
APPCONFIG=$(cat settings.json)
phantomjs hosts_genhar_uas.js $1 "${APPCONFIG}"