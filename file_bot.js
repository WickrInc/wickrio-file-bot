var addon = require('wickrio_addon');
var fs = require('fs');

process.title = "fileBot";
module.exports = addon;
process.stdin.resume(); //so the program will not close instantly

function exitHandler(options, err) {
  console.log(addon.cmdStopAsyncRecvMessages());
  console.log(addon.closeClient());
  if (err || options.exit) {
    console.log('Exit Error:', err.stack);
    process.exit();
  } else if (options.pid) {
    process.kill(process.pid);
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

return new Promise(async (resolve, reject) => {
  try {
    if (process.argv[2] === undefined) {
      var client = fs.readFileSync('client_bot_username.txt', 'utf-8');
      client = client.trim();
      var response = addon.clientInit(client);
      resolve(response);
    } else {
      var response = addon.clientInit(process.argv[2]);
      resolve(response);
    }
  } catch (err) {
    console.log(err);
    process.exit();
  }
}).then(async result => {
  console.log(result);
  try {
    addon.cmdStartAsyncRecvMessages(listen);
  } catch (err) {
    console.log(err);
    process.exit();
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
          var sMessage = addon.cmdSendRoomMessage(vGroupID, fileArr);
          console.log(sMessage);
        } catch (err) {
          console.log(err);
        }
      } else if (command === '/get') {
        var attachment = argument;
        try {
          var as = fs.accessSync('files/' + attachment, fs.constants.R_OK | fs.constants.W_OK);
          var response = addon.cmdSendRoomAttachment(vGroupID, __dirname + '/files/' + attachment, attachment);
          console.log(response)
        } catch (err) {
          if (err instanceof TypeError || err instanceof ReferenceError) {
            console.log(err);
          } else {
            var msg = attachment + ' does not exist!';
            console.error(msg);
            return console.log(addon.cmdSendRoomMessage(vGroupID, msg));
          }
        }
      } else if (command === '/delete') {
        try {
          var attachment = argument;
          if (attachment === '*') {
            var msg = "Sorry, I'm not allowed to delete all the files in the directory.";
            var sMessage = addon.cmdSendRoomMessage(vGroupID, msg);
            console.log(sMessage);
          }
          var os = fs.statSync('files/' + attachment);
        } catch (err) {
          if (err instanceof TypeError || err instanceof ReferenceError) {
            console.log(err);
          } else {
            var msg = attachment + ' does not exist!';
            console.error(msg);
            var sMessage = addon.cmdSendRoomMessage(vGroupID, msg);
            console.log(sMessage);
          }
        }
        try {
          var rm = fs.unlinkSync('files/' + attachment);
          var msg = "File named: '" + attachment + "' was deleted successfully!";
          var sMessage = addon.cmdSendRoomMessage(vGroupID, msg);
          console.log(sMessage);
        } catch (err) {
          if (err instanceof TypeError || err instanceof ReferenceError) {
            console.log(err);
          } else {
            console.log(err);
            var sMessage = addon.cmdSendRoomMessage(vGroupID, err);
            console.log(sMessage);
          }
        }

      } else if (command === '/help') {
        var help = "/help - List all available commands\n" +
          "/list - Lists all available files\n" +
          "/get FILE_NAME - Retrieve the specified file\n" +
          "/delete FILE_NAME - Deletes the specified file\n";
        var sMessage = addon.cmdSendRoomMessage(vGroupID, help);
        console.log(sMessage);
      }
    } else if (rMessage.file && JSON.stringify(rMessage) !== JSON.stringify(prevMessage)) {
      var cp = fs.copyFileSync(rMessage.file.localfilename.toString(), 'files/' + rMessage.file.filename.toString());
      var msg = "File named: '" + rMessage.file.filename + "' successfully saved to directory!";
      var sMessage = addon.cmdSendRoomMessage(vGroupID, msg);
      var prevMessage = rMessage;
      console.log(sMessage);
    } else {
      console.log(rMessage);
    }
  }
}).catch(error => {
  console.log('Error: ', error);
});
