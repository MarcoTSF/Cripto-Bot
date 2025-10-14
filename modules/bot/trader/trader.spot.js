/**
 * ===========================================================
 * trader_spot.js — Módulo de execução (Binance SPOT)
 * -----------------------------------------------------------
 * Responsável por:
 *  - Executar ordens BUY/SELL
 *  - Obter candles históricos
 *  - Operar em Testnet ou Produção automaticamente
 * ===========================================================
 */

require("dotenv").config();
const crypto = require("crypto");
const axios = require("axios");
const config = require("../config/config");
const { log } = require("../../utils");

// ============================================================
// 🔧 Configuração do ambiente
// ============================================================
const BASE_URL = config.API_URL;
const API_KEY = config.API_KEY;
const SECRET_KEY = config.SECRET_KEY;

// ============================================================
// 🕐 Timestamp + assinatura HMAC-SHA256
// ============================================================
function signQuery(params) {
    const query = new URLSearchParams(params).toString();
    const signature = crypto
        .createHmac("sha256", SECRET_KEY)
        .update(query)
        .digest("hex");
    return `${query}&signature=${signature}`;
}

// ============================================================
// 📊 Obter candles
// ============================================================
async function getCandles(symbol, interval = "15m", limit = 21) {
    try {
        const url = `${BASE_URL}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
        const response = await axios.get(url);
        return response.data;
    } catch (err) {
        log(`❌ Erro ao obter candles SPOT: ${err.response?.data?.msg || err.message}`);
        return [];
    }
}

// ============================================================
// 💰 Executar ordem (BUY / SELL)
// ============================================================
async function newOrder(symbol, quantity, side) {
    try {
        const timestamp = Date.now();
        const params = {
            symbol,
            side,
            type: "MARKET",
            quantity,
            timestamp
        };

        const query = signQuery(params);
        const url = `${BASE_URL}/api/v3/order?${query}`;

        const response = await axios.post(url, null, {
            headers: { "X-MBX-APIKEY": API_KEY }
        });

        const order = response.data;
        log(`✅ Ordem executada com sucesso [${side}] — preço: ${order.fills?.[0]?.price || "n/d"}`);

        return order;
    } catch (err) {
        const msg = err.response?.data?.msg || err.message;
        log(`❌ Erro ao executar ordem SPOT: ${msg}`);
        return null;
    }
}

// ============================================================
// 💵 Consultar saldo (opcional, útil para checagens de compra)
// ============================================================
async function getBalance(asset = "USDT") {
    try {
        const timestamp = Date.now();
        const params = { timestamp };
        const query = signQuery(params);

        const url = `${BASE_URL}/api/v3/account?${query}`;
        const response = await axios.get(url, {
            headers: { "X-MBX-APIKEY": API_KEY }
        });

        const balance = response.data.balances.find(b => b.asset === asset);
        return balance ? parseFloat(balance.free) : 0;
    } catch (err) {
        log(`⚠️ Erro ao consultar saldo: ${err.response?.data?.msg || err.message}`);
        return 0;
    }
}

module.exports = {
    getCandles,
    newOrder,
    getBalance
};