// eslint-disable-next-line import/no-unresolved
const WickrIOAPI = require('wickrio_addon');
const WickrIOBotAPI = require('wickrio-bot-api');
const fs = require('fs');

module.exports = WickrIOAPI;
process.stdin.resume(); // so the program will not close instantly
let bot;

async function exitHandler (options, err) {
  try {
    const closed = await bot.close();
    console.log(closed);
    if (err) {
      console.log('Exit Error:', err);
      process.exit();
    }
    if (options.exit) {
      process.exit();
    } else if (options.pid) {
      process.kill(process.pid);
    }
  } catch (error) {
    console.log(error);
  }
}

// catches ctrl+c and stop.sh events
process.on('SIGINT', exitHandler.bind(null, {
  exit: true,
}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {
  pid: true,
}));
process.on('SIGUSR2', exitHandler.bind(null, {
  pid: true,
}));

// catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {
  exit: true,
}));

async function main () {
  try {
    let status;
    if (process.argv[2] === undefined) {
      let botUsername = fs.readFileSync('client_bot_username.txt', 'utf-8');
      botUsername = botUsername.trim();
      bot = new WickrIOBotAPI.WickrIOBot();
      status = await bot.start(botUsername);
    } else {
      bot = new WickrIOBotAPI.WickrIOBot();
      status = await bot.start(process.argv[2]);
    }
    if (!status) {
      exitHandler(null, {
        exit: true,
        reason: 'Client not able to start',
      });
    }
    // Passes a callback function that will receive incoming messages into the bot client
    await bot.startListening(listen);
  } catch (err) {
    console.log(err);
  }
}

// eslint-disable-next-line consistent-return
async function listen (rMessage) {
  rMessage = JSON.parse(rMessage);
  const { sender, vgroupid: vGroupID } = rMessage;
  const userArr = [];
  let prevMessage;
  userArr.push(sender);
  if (rMessage.message) {
    const request = rMessage.message;
    let command = '';
    let argument = '';
    const parsedData = request.match(/(\/[a-zA-Z]+)(@[a-zA-Z0-9_-]+)?(\s+)?(.*)$/);
    if (parsedData !== null) {
      [, command] = parsedData;
      if (parsedData[4] !== '') {
        [,,,, argument] = parsedData;
      }
    }
    if (command === '/list') {
      let fileArr = [];
      fileArr.push('List of files in the given directory:');
      fs.readdirSync('files/').forEach((file) => {
        fileArr.push(file.toString());
      });
      fileArr = fileArr.join('\n');
      try {
        const sMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, fileArr);
        console.log(sMessage);
      } catch (err) {
        console.log(err);
      }
    } else if (command === '/get') {
      const attachment = argument;
      if (attachment === '') {
        const msg = 'Command missing an argument. Proper format: /get FILE_NAME';
        return WickrIOAPI.cmdSendRoomMessage(vGroupID, msg);
      }
      if (!findFile(argument)) {
        const msg = `${attachment} does not exist in the file directory`;
        console.error(msg);
        return console.log(WickrIOAPI.cmdSendRoomMessage(vGroupID, msg));
      }
      try {
        // eslint-disable-next-line no-bitwise
        fs.accessSync(`files/${attachment}`, fs.constants.R_OK | fs.constants.W_OK);
        const response = WickrIOAPI.cmdSendRoomAttachment(vGroupID, `${__dirname}/files/${attachment}`, attachment);
        console.log(response);
      } catch (err) {
        if (err instanceof TypeError || err instanceof ReferenceError) {
          console.log(err);
        } else {
          const msg = `${attachment} does not exist in the file directory`;
          console.error(msg);
          return console.log(WickrIOAPI.cmdSendRoomMessage(vGroupID, msg));
        }
      }
    } else if (command === '/delete') {
      const attachment = argument;
      try {
        if (attachment === '') {
          const msg = 'Command missing an argument. Proper format: /delete FILE_NAME';
          return WickrIOAPI.cmdSendRoomMessage(vGroupID, msg);
        }
        if (attachment === '*') {
          const msg = 'Sorry, I\'m not allowed to delete all the files in the directory.';
          const sMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, msg);
          console.log(sMessage);
          return null;
        }
        if (!findFile(argument)) {
          const msg = `${attachment} does not exist in the file directory`;
          console.error(msg);
          return console.log(WickrIOAPI.cmdSendRoomMessage(vGroupID, msg));
        }
        fs.statSync(`files/${attachment}`);
      } catch (err) {
        if (err instanceof TypeError || err instanceof ReferenceError) {
          console.log(err);
        } else {
          const msg = `${attachment} does not exist in the file directory`;
          console.error(msg);
          const sMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, msg);
          console.log(sMessage);
          return null;
        }
      }
      try {
        fs.unlinkSync(`files/${attachment}`);
        const msg = `File named: ${attachment} was deleted successfully!`;
        const sMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, msg);
        console.log(sMessage);
      } catch (err) {
        const msg = `Unable to delete file named: ${attachment}`;
        WickrIOAPI.cmdSendRoomMessage(vGroupID, msg);
        return console.log(err);
      }
    } else if (command === '/help') {
      const help = '/help - List all available commands\n'
        + '/list - Lists all available files\n'
        + '/get FILE_NAME - Retrieve the specified file\n'
        + '/delete FILE_NAME - Deletes the specified file\n';
      const sMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, help);
      console.log(sMessage);
    }
  } else if (rMessage.file && JSON.stringify(rMessage) !== JSON.stringify(prevMessage)) {
    fs.copyFileSync(rMessage.file.localfilename.toString(), `files/${rMessage.file.filename.toString()}`);
    const msg = `File named: '${rMessage.file.filename}' successfully saved to directory!`;
    const sMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, msg);
    prevMessage = rMessage;
    console.log(sMessage);
  } else {
    console.log(rMessage);
  }
}

function findFile (argument) {
  const fileArr = [];
  fs.readdirSync('files/').forEach((file) => {
    fileArr.push(file.toString());
  });
  let found = false;
  // eslint-disable-next-line no-restricted-syntax
  for (const file of fileArr) {
    if (file === argument) {
      found = true;
    }
  }
  return found;
}

main();
