#!/bin/sh
if [ ! -d "files" ]; then
  mkdir files
fi

if [ -f "/usr/local/nvm/nvm.sh" ]; then
  . /usr/local/nvm/nvm.sh
  nvm use 12.20.2
fi

npm install
