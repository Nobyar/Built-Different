#!/bin/sh
# Concatenate client scripts into one bundle (keeps the static site dependency-free)
cat river.js site-data.js tree.js app.js colin.js > bundle.js
