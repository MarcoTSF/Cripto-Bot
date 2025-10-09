const fs = require("fs");

function log(msg) {
    const timestamp = new Date().toLocaleString();
    console.log(`[${timestamp}] ${msg}`);
}

function calcSMA(data) {
    if (!data || data.length === 0) return 0;
    const closes = data.map(candle => parseFloat(candle[4]));
    const sum = closes.reduce((a, b) => a + b, 0);
    return sum / closes.length;
}

function saveState(state) {
    fs.writeFileSync("state.json", JSON.stringify(state, null, 2));
}

function loadState(defaultState) {
    if (fs.existsSync("state.json")) {
        try {
            const saved = JSON.parse(fs.readFileSync("state.json", "utf8"));
            return { ...defaultState, ...saved };
        } catch (err) {
            log("Erro ao carregar estado salvo: " + err.message);
        }
    }
    return defaultState;
}

module.exports = { log, calcSMA, saveState, loadState };