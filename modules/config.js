require("dotenv").config();

module.exports = {
    SYMBOL: "BTCUSDT",
    QUANTITY: "0.00015",
    INTERVAL: "15m",
    LIMIT: 21,
    BUY_THRESHOLD: 0.995,
    SELL_THRESHOLD: 1.005,
    STOP_LOSS: 0.98,
    TAKE_PROFIT: 1.05,
    CHECK_INTERVAL: 10000, // ms
    API_URL: process.env.API_URL,
    API_KEY: process.env.API_KEY,
    SECRET_KEY: process.env.SECRET_KEY,
};