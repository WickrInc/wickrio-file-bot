#!/bin/sh

#
# If the input argument exists then check if it is a file
# if so it should contain a list of key=value entries.
#
if [ -n "$1" ]; then
  if [ -f "$1" ]; then
    . "$1"
  fi
fi

if [ -f "/usr/local/nvm/nvm.sh" ]; then
  . /usr/local/nvm/nvm.sh
  nvm use 12.20.2
fi

if [ -z "$CLIENT_NAME" ]; then
  echo "prompt: Please enter your client bot's username:"
  while [ -z "$input" ]
  do
    read  input
    if [ ! -z "$input" ]
    then
      echo ${input} >client_bot_username.txt
      WICKRIO_BOT_NAME=${input} node configure.js
    else
      echo "Cannot leave client bot's username empty! Please enter a value:"
    fi
  done
else
  echo $CLIENT_NAME >client_bot_username.txt
  WICKRIO_BOT_NAME=$CLIENT_NAME node configure.js
fi

