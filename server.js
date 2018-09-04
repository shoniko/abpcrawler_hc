const abpcontroller = require("./api/controllers/abpcontroller")
let opt = require("./options");

const express = require('express'),
    app = express(),
    port = process.env.PORT || 3000;

let options = {};
options.output = "serverresults/"
options = opt.loadFromSettingsFile(options);

app.use(express.json());
app.post('/', function (req, res) {
    abpcontroller(req, res, options);
})
app.listen(port);

console.log('ABP crawler service started on: ' + port);
