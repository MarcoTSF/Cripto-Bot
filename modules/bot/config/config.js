require("dotenv").config();

const MODE = process.env.DEFAULT_MODE || "spot"; // 'spot' ou 'futures'
const USE_TESTNET = process.env.USE_TESTNET === "true";

const common = {
    SYMBOL: "BTCUSDT",
    QUANTITY: "0.00015",
    INTERVAL: "15m",
    LIMIT: 21,
    BUY_THRESHOLD: 0.99,
    SELL_THRESHOLD: 1.01,
    STOP_LOSS: 0.99,
    TAKE_PROFIT: 1.03,
    CHECK_INTERVAL: 10000,
    USE_TESTNET
};

let modeConfig = {};

if (MODE === "spot") {
    modeConfig = {
        API_KEY: process.env.API_KEY_SPOT,
        SECRET_KEY: process.env.SECRET_KEY_SPOT,
        API_URL: USE_TESTNET
            ? process.env.API_URL_SPOT_TESTNET
            : process.env.API_URL_SPOT_REAL,
        MODE: "SPOT"
    };
} else if (MODE === "futures") {
    modeConfig = {
        API_KEY: process.env.API_KEY_FUTURES,
        SECRET_KEY: process.env.SECRET_KEY_FUTURES,
        API_URL: USE_TESTNET
            ? process.env.API_URL_FUTURES_TESTNET
            : process.env.API_URL_FUTURES_REAL,
        MODE: "FUTURES"
    };
}

if (!USE_TESTNET) {
    console.warn("⚠️  ATENÇÃO: O BOT ESTÁ OPERANDO NO MERCADO REAL!");
}

module.exports = { ...common, ...modeConfig };