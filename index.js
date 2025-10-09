const { loadState } = require("./modules/utils");
const { runStrategy } = require("./modules/strategy");
const { CHECK_INTERVAL } = require("./modules/config");

let state = loadState({ isOpened: false, entryPrice: 0 });

setInterval(() => runStrategy(state), CHECK_INTERVAL);
runStrategy(state);