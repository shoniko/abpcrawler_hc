const abpcontroller = require("./api/controllers/abpcontroller")
let opt = require("./options");

const express = require('express'),
    app = express(),
    port = process.env.PORT || 3001;

let options = {};
options.output = "serverresults/"
options = opt.loadFromSettingsFile(options);

app.use(express.json());
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.post('/', function (req, res) {
    abpcontroller(req, res, options);
})
app.listen(port);

console.log('ABP crawler service started on: ' + port);
