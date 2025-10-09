const axios = require("axios");
const crypto = require("crypto");
const { log } = require("./utils");
const { API_URL, API_KEY, SECRET_KEY } = require("./config");

// ===== FUNÇÃO PARA EXECUTAR ORDEM =====
async function newOrder(symbol, quantity, side) {
    try {
        const order = {
            symbol: symbol,
            side: side.toUpperCase(),
            type: "MARKET",
            quantity: quantity,
            timestamp: Date.now(),
        };

        const queryString = new URLSearchParams(order).toString();
        const signature = crypto
        .createHmac("sha256", SECRET_KEY)
        .update(queryString)
        .digest("hex");

        const { data } = await axios.post(
        `${API_URL}/api/v3/order?${queryString}&signature=${signature}`,
        null,
        { headers: { "X-MBX-APIKEY": API_KEY } }
        );

        log(`✅ Ordem ${side.toUpperCase()} executada com sucesso: ${data.orderId}`);
        return data;
    } catch (err) {
        if (err.response) {
            log(`❌ Erro na ordem: ${JSON.stringify(err.response.data)}`);
        } else {
            log(`❌ Erro inesperado: ${err.message}`);
        }
    }
}

// ===== FUNÇÃO PARA PEGAR CANDLES =====
async function getCandles(symbol, interval, limit) {
    const { data } = await axios.get(
        `${API_URL}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );
    return data;
}

module.exports = { newOrder, getCandles };