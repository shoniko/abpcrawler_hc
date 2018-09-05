const express = require("express"),
    app = express(),
    port = process.env.PORT || 3000;

app.use(express.static("frontend"))

app.listen(port);

console.log('ABP crawler frontend started on: ' + port);
