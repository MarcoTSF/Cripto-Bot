/**
 * ===========================================================
 * Binance Futures Trader (Testnet)
 * -----------------------------------------------------------
 * Suporte a ordens LONG/SHORT com autenticação HMAC SHA256.
 * Usa o ambiente de teste oficial da Binance Futures:
 * https://testnet.binancefuture.com
 * ===========================================================
 */

const axios = require("axios");
const crypto = require("crypto");
const { log } = require("../../utils");
const config = require("../config/config");

// ============================================================
// CONFIGURAÇÕES GERAIS
// ============================================================
const BASE_URL = config.USE_TESTNET
    ? "https://testnet.binancefuture.com"
    : "https://fapi.binance.com";

const API_KEY = config.API_KEY;
const SECRET_KEY = config.SECRET_KEY;

function sign(queryString) {
    return crypto.createHmac("sha256", SECRET_KEY)
        .update(queryString)
        .digest("hex");
}

// ============================================================
// EXECUTAR ORDEM FUTURES (LONG/SHORT)
// ============================================================
async function newOrder(symbol, quantity, side, positionSide = "LONG") {
    try {
        const order = {
            symbol: symbol,
            side: side.toUpperCase(),         // BUY ou SELL
            positionSide: positionSide,       // LONG ou SHORT
            type: "MARKET",
            quantity: quantity,
            recvWindow: 5000,
            timestamp: Date.now()
        };

        const queryString = new URLSearchParams(order).toString();
        const signature = sign(queryString);

        const { data } = await axios.post(
            `${BASE_URL}/fapi/v1/order?${queryString}&signature=${signature}`,
            null,
            { headers: { "X-MBX-APIKEY": API_KEY } }
        );

        log(`✅ [${positionSide}] Ordem ${side.toUpperCase()} executada com sucesso | ID: ${data.orderId}`);
        return data;
    } catch (err) {
        if (err.response) {
            log(`❌ Erro na ordem Futures: ${JSON.stringify(err.response.data)}`);
        } else {
            log(`❌ Erro inesperado (ordem Futures): ${err.message}`);
        }
        return null;
    }
}

// ============================================================
// PEGAR CANDLES (para estratégia)
// ============================================================
async function getCandles(symbol, interval = "15m", limit = 100) {
    try {
        const { data } = await axios.get(
            `${BASE_URL}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
        );
        return data;
    } catch (err) {
        log(`⚠️ Erro ao buscar candles Futures: ${err.message}`);
        return [];
    }
}

// ============================================================
// CONSULTAR POSIÇÕES ATUAIS
// ============================================================
async function getPositions(symbol) {
    try {
        const params = {
            timestamp: Date.now()
        };
        const queryString = new URLSearchParams(params).toString();
        const signature = sign(queryString);

        const { data } = await axios.get(
            `${BASE_URL}/fapi/v2/positionRisk?${queryString}&signature=${signature}`,
            { headers: { "X-MBX-APIKEY": API_KEY } }
        );

        return data.filter(pos => pos.symbol === symbol);
    } catch (err) {
        log(`⚠️ Erro ao consultar posições Futures: ${err.message}`);
        return [];
    }
}

module.exports = {
    newOrder,
    getCandles,
    getPositions
};