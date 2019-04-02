const WickrIOAPI = require('wickrio_addon');
const WickrIOBotAPI = require('wickrio-bot-api');
var fs = require('fs');

module.exports = WickrIOAPI;
process.stdin.resume(); //so the program will not close instantly
var bot;

async function exitHandler(options, err) {
  try {
    var closed = await bot.close();
    console.log(closed);
    if (err) {
      console.log("Exit Error:", err);
      process.exit();
    }
    if (options.exit) {
      process.exit();
    } else if (options.pid) {
      process.kill(process.pid);
    }
  } catch (err) {
    console.log(err);
  }
}

//catches ctrl+c and stop.sh events
process.on('SIGINT', exitHandler.bind(null, {
  exit: true
}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {
  pid: true
}));
process.on('SIGUSR2', exitHandler.bind(null, {
  pid: true
}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {
  exit: true
}));

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  try {
    var status;
    if (process.argv[2] === undefined) {
      var bot_username = fs.readFileSync('client_bot_username.txt', 'utf-8');
      bot_username = bot_username.trim();
      bot = new WickrIOBotAPI.WickrIOBot();
      status = await bot.start(bot_username)
    } else {
      bot = new WickrIOBotAPI.WickrIOBot();
      status = await bot.start(process.argv[2])
    }
    if (!status) {
      exitHandler(null, {
        exit: true,
        reason: 'Client not able to start'
      });
    }
    await bot.startListening(listen); //Passes a callback function that will receive incoming messages into the bot client
  } catch (err) {
    console.log(err);
  }
}


async function listen(rMessage) {
  rMessage = JSON.parse(rMessage);
  var sender = rMessage.sender;
  var vGroupID = rMessage.vgroupid;
  var userArr = [];
  userArr.push(sender);
  if (rMessage.message) {
    var request = rMessage.message;
    var command = '',
      argument = '';
    var parsedData = request.match(/(\/[a-zA-Z]+)(@[a-zA-Z0-9_-]+)?(\s+)?(.*)$/);
    if (parsedData !== null) {
      command = parsedData[1];
      if (parsedData[4] !== '') {
        argument = parsedData[4];
      }
    }
    if (command === '/list') {
      var fileArr = [];
      fileArr.push('List of files in the given directory:');
      var answer;
      fs.readdirSync('files/').forEach(file => {
        fileArr.push(file.toString());
      });
      fileArr = fileArr.join('\n');
      try {
        var sMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, fileArr);
        console.log(sMessage);
      } catch (err) {
        console.log(err);
      }
    } else if (command === '/get') {
      var attachment = argument;
      if (attachment === '') {
        var msg = "Command missing an argument. Proper format: /get FILE_NAME";
        return WickrIOAPI.cmdSendRoomMessage(vGroupID, msg);
      }
      try {
        var as = fs.accessSync('files/' + attachment, fs.constants.R_OK | fs.constants.W_OK);
        var response = WickrIOAPI.cmdSendRoomAttachment(vGroupID, __dirname + '/files/' + attachment, attachment);
        console.log(response)
      } catch (err) {
        if (err instanceof TypeError || err instanceof ReferenceError) {
          console.log(err);
        } else {
          var msg = attachment + ' does not exist!';
          console.error(msg);
          return console.log(WickrIOAPI.cmdSendRoomMessage(vGroupID, msg));
        }
      }
    } else if (command === '/delete') {
      try {
        var attachment = argument;
        if (attachment === '') {
          var msg = "Command missing an argument. Proper format: /delete FILE_NAME";
          return WickrIOAPI.cmdSendRoomMessage(vGroupID, msg);
        }
        if (attachment === '*') {
          var msg = "Sorry, I'm not allowed to delete all the files in the directory.";
          var sMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, msg);
          console.log(sMessage);
          return;
        }
        var os = fs.statSync('files/' + attachment);
      } catch (err) {
        if (err instanceof TypeError || err instanceof ReferenceError) {
          console.log(err);
        } else {
          var msg = attachment + ' does not exist!';
          console.error(msg);
          var sMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, msg);
          console.log(sMessage);
          return;
        }
      }
      try {
        var rm = fs.unlinkSync('files/' + attachment);
        var msg = "File named: " + attachment + " was deleted successfully!";
        var sMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, msg);
        console.log(sMessage);
      } catch (err) {
        var msg = "Unable to delete file named: " + attachment;
        var sMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, msg);
        return console.log(err);
      }

    } else if (command === '/help') {
      var help = "/help - List all available commands\n" +
        "/list - Lists all available files\n" +
        "/get FILE_NAME - Retrieve the specified file\n" +
        "/delete FILE_NAME - Deletes the specified file\n";
      var sMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, help);
      console.log(sMessage);
    }
  } else if (rMessage.file && JSON.stringify(rMessage) !== JSON.stringify(prevMessage)) {
    var cp = fs.copyFileSync(rMessage.file.localfilename.toString(), 'files/' + rMessage.file.filename.toString());
    var msg = "File named: '" + rMessage.file.filename + "' successfully saved to directory!";
    var sMessage = WickrIOAPI.cmdSendRoomMessage(vGroupID, msg);
    var prevMessage = rMessage;
    console.log(sMessage);
  } else {
    console.log(rMessage);
  }
}

main();
