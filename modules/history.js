const fs = require("fs");
const path = require("path");

const TRADES_FILE = path.join(__dirname, "../trades.json");

function loadTrades() {
    if (!fs.existsSync(TRADES_FILE)) {
        fs.writeFileSync(TRADES_FILE, JSON.stringify([]));
    }

    let data;
    try {
        data = fs.readFileSync(TRADES_FILE, "utf8");
        if (!data) data = "[]"; // se o arquivo estiver vazio
        return JSON.parse(data);
    } catch (err) {
        console.error("Arquivo trades.json corrompido, recriando...");
        fs.writeFileSync(TRADES_FILE, JSON.stringify([]));
        return [];
    }
}

function saveTrade(trade) {
    const trades = loadTrades();
    trades.push(trade);
    fs.writeFileSync(TRADES_FILE, JSON.stringify(trades, null, 2));
    console.log(`💾 Trade salvo: ${trade.side} ${trade.symbol} | ${trade.result} (${trade.pnlPercent}%)`);
}

module.exports = { loadTrades, saveTrade };