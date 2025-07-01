const path = require("path");
const express = require("express");
const app = express();

app.use(express.static("./static"));
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "static", "predict.html"));
});

module.exports = app;