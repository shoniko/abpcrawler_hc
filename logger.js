var winston = require('winston');
var path = require('path');

// Set this to whatever, by default the path of the script.
var logPath = __dirname;

const filterHitsLog = winston.createLogger({
    transports: [
        new winston.transports.File({
            filename: path.join(logPath, 'filterhits.log'),
            level: 'info'
        })
    ]
});

const setLogPath = (newLogPath) => logPath = newLogPath; 

module.exports = {
    filterHitsLog: filterHitsLog,
    setLogPath: setLogPath
};