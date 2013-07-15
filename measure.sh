#!/bin/bash

APPCONFIG=$(cat settings.json)
phantomjs hosts_genhar_uas.js $1 "${APPCONFIG}"