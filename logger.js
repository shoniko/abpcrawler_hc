var winston = require('winston');
var path = require('path');

// Set this to whatever, by default the path of the script.
var logPath = __dirname;

function createLogger(){
    return winston.createLogger({
        transports: [
            new winston.transports.File({
                filename: path.join(logPath, 'filterhits.log'),
                level: 'info'
            })
        ]
    });
}   

let filterHitsLog = createLogger();

const setLogPath = (newLogPath) => {
    logPath = newLogPath;
    module.exports.filterHitsLog = createLogger();
} 

module.exports = {
    filterHitsLog: filterHitsLog,
    setLogPath: setLogPath
};