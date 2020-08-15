#!/bin/sh
if [ ! -d "files" ]; then
  mkdir files
fi
npm install
npm run build