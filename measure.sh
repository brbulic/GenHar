#!/bin/bash

APPCONFIG=$(cat settings.json)
phantomjs GenHarElite.js $1 "${APPCONFIG}"