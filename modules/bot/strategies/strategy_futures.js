/**
 * ===========================================================
 * strategy_futures.js — Estratégia para Binance Futures (Testnet ou Real)
 * -----------------------------------------------------------
 * Suporte completo a LONG + SHORT
 * Com stop loss dinâmico, take profit e trailing inteligente.
 * ===========================================================
 */

const { newOrder, getCandles } = require("../trader/trader.futures");
const { log, calcSMA, saveState } = require("../../utils");
const { saveTrade } = require("../../history");
const config = require("../config/config");

const COOLDOWN_PERIOD = 3 * 60 * 1000; // 3 minutos

// ============================================================
// Cálculo da EMA
// ============================================================
function calcEMA(values, period) {
    const k = 2 / (period + 1);
    let ema = [values[0]];
    for (let i = 1; i < values.length; i++) {
        ema.push(values[i] * k + ema[i - 1] * (1 - k));
    }
    return ema;
}

// ============================================================
// Cálculo do RSI
// ============================================================
function calcRSI(values, period = 14) {
    if (values.length < period + 1) return null;
    const deltas = values.map((v, i) => i === 0 ? 0 : v - values[i - 1]);
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
        if (deltas[i] > 0) gains += deltas[i];
        else losses -= deltas[i];
    }

    gains /= period;
    losses /= period;

    let rs = losses === 0 ? 100 : gains / losses;
    let rsi = [100 - 100 / (1 + rs)];

    for (let i = period + 1; i < deltas.length; i++) {
        const delta = deltas[i];
        const gain = delta > 0 ? delta : 0;
        const loss = delta < 0 ? -delta : 0;
        gains = (gains * (period - 1) + gain) / period;
        losses = (losses * (period - 1) + loss) / period;
        rs = losses === 0 ? 100 : gains / losses;
        rsi.push(100 - 100 / (1 + rs));
    }

    return rsi;
}

// ============================================================
// Registro de trade no trades.json
// ============================================================
function recordTrade(side, entryPrice, exitPrice, quantity, symbol, positionSide) {
    const pnlPercent =
        positionSide === "LONG"
            ? ((exitPrice / entryPrice - 1) * 100).toFixed(2)
            : ((entryPrice / exitPrice - 1) * 100).toFixed(2);

    const pnlValue =
        positionSide === "LONG"
            ? ((exitPrice - entryPrice) * quantity).toFixed(6)
            : ((entryPrice - exitPrice) * quantity).toFixed(6);

    const timestamp = new Date().toISOString();

    const trade = {
        timestamp,
        symbol,
        side,
        entryPrice,
        exitPrice,
        quantity,
        pnlPercent: parseFloat(pnlPercent),
        pnlValue: parseFloat(pnlValue),
        positionSide,
        result: parseFloat(pnlPercent) > 0 ? "PROFIT" : "LOSS"
    };

    saveTrade(trade);
}

// ============================================================
// Lógica principal — Binance Futures
// ============================================================
async function runStrategy(state) {
    const candles = await getCandles(config.SYMBOL, config.INTERVAL, config.LIMIT);
    if (!candles || candles.length === 0) return;

    const closes = candles.map(c => parseFloat(c[4]));
    const price = closes[closes.length - 1];
    const sma = calcSMA(candles);

    const emaShort = calcEMA(closes, 12);
    const emaLong = calcEMA(closes, 26);
    const rsiArr = calcRSI(closes, 14);

    const lastEMAshort = emaShort.at(-1);
    const lastEMAlong = emaLong.at(-1);
    const lastRSI = rsiArr ? rsiArr.at(-1) : null;

    console.clear();
    log(`📊 [${config.MODE} ${config.USE_TESTNET ? "TESTNET" : "REAL"}]`);
    log(`Preço: ${price.toFixed(2)} | SMA: ${sma.toFixed(2)} | EMA12: ${lastEMAshort.toFixed(2)} | EMA26: ${lastEMAlong.toFixed(2)} | RSI: ${lastRSI?.toFixed(2) ?? "N/A"}`);
    log(`Posição aberta: ${state.isOpened ? state.positionSide : "NENHUMA"}`);
    if (state.isOpened) log(`Entrada: ${state.entryPrice.toFixed(2)}`);

    const now = Date.now();
    if (state.lastTradeTime && now - state.lastTradeTime < COOLDOWN_PERIOD) {
        const remaining = ((COOLDOWN_PERIOD - (now - state.lastTradeTime)) / 1000).toFixed(0);
        log(`⏳ Cooldown ativo — aguardando ${remaining}s...`);
        return;
    }

    // =======================
    // Abertura de posição
    // =======================
    if (!state.isOpened) {
        const bullish = lastEMAshort > lastEMAlong && lastRSI < 75 && price <= sma * config.BUY_THRESHOLD;
        const bearish = lastEMAshort < lastEMAlong && lastRSI > 25 && price >= sma * config.SELL_THRESHOLD;

        if (bullish) {
            log("📈 Sinal de COMPRA (LONG) detectado");
            await newOrder(config.SYMBOL, config.QUANTITY, "BUY", "LONG");
            Object.assign(state, {
                isOpened: true,
                entryPrice: price,
                positionSide: "LONG",
                movedStopToZero: false,
                movedStopToPartial: false,
                lastTradeTime: now
            });
            saveState(state);
            return;
        }

        if (bearish) {
            log("📉 Sinal de VENDA (SHORT) detectado");
            await newOrder(config.SYMBOL, config.QUANTITY, "SELL", "SHORT");
            Object.assign(state, {
                isOpened: true,
                entryPrice: price,
                positionSide: "SHORT",
                movedStopToZero: false,
                movedStopToPartial: false,
                lastTradeTime: now
            });
            saveState(state);
            return;
        }

        log("⏳ Aguardando sinal de entrada...");
        return;
    }

    // =======================
    // Gerenciamento da posição
    // =======================
    const { positionSide, entryPrice } = state;
    const gain = positionSide === "LONG" ? price / entryPrice : entryPrice / price;

    const halfway = config.TAKE_PROFIT - (config.TAKE_PROFIT - 1) * 0.5; // 50%
    const almostTarget = config.TAKE_PROFIT - (config.TAKE_PROFIT - 1) * 0.2; // 80%

    // Trailing Stop Dinâmico
    if (!state.movedStopToZero && gain >= halfway) {
        state.dynamicStop = 1.0;
        state.movedStopToZero = true;
        log("🔁 Stop movido para o ZERO A ZERO (50% do alvo).");
    } else if (!state.movedStopToPartial && gain >= almostTarget) {
        state.dynamicStop = 1 + (config.TAKE_PROFIT - 1) * 0.3;
        state.movedStopToPartial = true;
        log("🔁 Stop movido para +30% do alvo (80% atingido).");
    }

    const stopLoss = state.dynamicStop || config.STOP_LOSS;
    const takeProfit = config.TAKE_PROFIT;

    const stopHit = positionSide === "LONG" ? gain <= stopLoss : gain >= 1 / stopLoss;
    const targetHit = positionSide === "LONG" ? gain >= takeProfit : gain <= 1 / takeProfit;

    // =======================
    // Fechamento de posição
    // =======================
    if (stopHit) {
        log(`❌ STOP atingido (${(gain * 100 - 100).toFixed(2)}%)`);
        const exitSide = positionSide === "LONG" ? "SELL" : "BUY";
        await newOrder(config.SYMBOL, config.QUANTITY, exitSide, positionSide);
        recordTrade(exitSide, entryPrice, price, parseFloat(config.QUANTITY), config.SYMBOL, positionSide);
        Object.assign(state, { isOpened: false, entryPrice: 0, positionSide: null, lastTradeTime: now });
        saveState(state);
        return;
    }

    if (targetHit) {
        log(`✅ TAKE PROFIT atingido (${(gain * 100 - 100).toFixed(2)}%)`);
        const exitSide = positionSide === "LONG" ? "SELL" : "BUY";
        await newOrder(config.SYMBOL, config.QUANTITY, exitSide, positionSide);
        recordTrade(exitSide, entryPrice, price, parseFloat(config.QUANTITY), config.SYMBOL, positionSide);
        Object.assign(state, { isOpened: false, entryPrice: 0, positionSide: null, lastTradeTime: now });
        saveState(state);
        return;
    }

    log("📉 Aguardando movimento favorável...");
}

module.exports = { runStrategy };