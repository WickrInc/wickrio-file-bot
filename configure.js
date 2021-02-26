const fs = require('fs');
const prompt = require('prompt');
const { execSync } = require('child_process');
const processes = require('./processes.json');

const dataStringify = JSON.stringify(processes);
const dataParsed = JSON.parse(dataStringify);

prompt.colors = false;

process.stdin.resume(); // so the program will not close instantly

function exitHandler (options, err) {
  try {
    if (err) {
      process.kill(process.pid);
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
process.on('SIGINT', exitHandler.bind(null, { exit: true }));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, { pid: true }));
process.on('SIGUSR2', exitHandler.bind(null, { pid: true }));

// catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {
  exit: true,
  reason: 'uncaughtException',
}));

async function main () {
  try {
    execSync('cp processes.json processes_backup.json');
    let newName;

    if (process.env.WICKRIO_BOT_NAME !== undefined) {
      newName = `WickrIO-File-Bot_${process.env.WICKRIO_BOT_NAME}`;
    } else {
      newName = 'WickrIO-File-Bot';
    }

    // var assign = Object.assign(dataParsed.apps[0].name, newName);
    dataParsed.apps[0].name = newName;

    fs.writeFileSync('./processes.json', JSON.stringify(dataParsed, null, 2));
  } catch (err) {
    console.log(err);
  }
  process.exit();
}

main();
