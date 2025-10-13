const { newOrder, getCandles } = require("./trader");
const { log, calcSMA, saveState } = require("./utils");
const { saveTrade } = require("./history");
const config = require("./config");

const COOLDOWN_PERIOD = 3 * 60 * 1000; // 3 minutos

// ===============================
// Cálculo da EMA
// ===============================
function calcEMA(values, period) {
    const k = 2 / (period + 1);
    let ema = [values[0]];
    for (let i = 1; i < values.length; i++) {
        ema.push(values[i] * k + ema[i - 1] * (1 - k));
    }
    return ema;
}

// ===============================
// Cálculo do RSI
// ===============================
function calcRSI(values, period = 14) {
    if (values.length < period + 1) return null;

    const deltas = [];
    for (let i = 1; i < values.length; i++) {
        deltas.push(values[i] - values[i - 1]);
    }

    let gains = 0, losses = 0;
    for (let i = 0; i < period; i++) {
        if (deltas[i] > 0) gains += deltas[i];
        else losses -= deltas[i];
    }

    gains /= period;
    losses /= period;
    let rs = losses === 0 ? 100 : gains / losses;
    let rsi = [100 - 100 / (1 + rs)];

    for (let i = period; i < deltas.length; i++) {
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

// ===============================
// Logs de cruzamento de EMA
// ===============================
let lastTrend = null;
function checkEMACross(emaShort, emaLong) {
    const prevShort = emaShort[emaShort.length - 2];
    const prevLong = emaLong[emaLong.length - 2];
    const currentShort = emaShort[emaShort.length - 1];
    const currentLong = emaLong[emaLong.length - 1];

    if (prevShort < prevLong && currentShort > currentLong && lastTrend !== "bullish") {
        log("🔄 Cruzamento de ALTA detectado (EMA12 cruzou acima da EMA26)");
        lastTrend = "bullish";
    } else if (prevShort > prevLong && currentShort < currentLong && lastTrend !== "bearish") {
        log("🔄 Cruzamento de BAIXA detectado (EMA12 cruzou abaixo da EMA26)");
        lastTrend = "bearish";
    }
}

// ===============================
// Registro de trades (trades.json)
// ===============================
function recordTrade(side, entryPrice, exitPrice, quantity, symbol) {
    const pnlPercent = ((exitPrice / entryPrice - 1) * 100 * (side === "SELL" ? 1 : -1)).toFixed(2);
    const pnlValue = ((exitPrice - entryPrice) * quantity * (side === "SELL" ? 1 : -1)).toFixed(2);
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
        result: pnlPercent > 0 ? "PROFIT" : "LOSS"
    };

    saveTrade(trade);
}

// ===============================
// Estratégia principal
// ===============================
async function runStrategy(state) {
    const candles = await getCandles(config.SYMBOL, config.INTERVAL, config.LIMIT);
    const closes = candles.map(c => parseFloat(c[4]));
    const lastCandle = candles[candles.length - 1];
    const price = parseFloat(lastCandle[4]);
    const sma = calcSMA(candles);

    const emaShort = calcEMA(closes, 12);
    const emaLong = calcEMA(closes, 26);
    const rsiArr = calcRSI(closes, 14);

    const lastEMAshort = emaShort[emaShort.length - 1];
    const lastEMAlong = emaLong[emaLong.length - 1];
    const lastRSI = rsiArr ? rsiArr[rsiArr.length - 1] : null;

    checkEMACross(emaShort, emaLong);

    console.clear();
    log(`Preço: ${price.toFixed(2)} | SMA: ${sma.toFixed(2)} | EMA12: ${lastEMAshort.toFixed(2)} | EMA26: ${lastEMAlong.toFixed(2)} | RSI: ${lastRSI ? lastRSI.toFixed(2) : "N/A"}`);
    log(`Posição aberta: ${state.isOpened ? "SIM" : "NÃO"}`);
    if (state.entryPrice) {
        log(`Entrada: ${state.entryPrice.toFixed(2)}`);

        // Previsão de saída
        const takeProfitPrice = state.entryPrice * config.TAKE_PROFIT;
        const stopLossPrice = state.entryPrice * config.STOP_LOSS;

        log(`Saída prevista para TAKE PROFIT: ${takeProfitPrice.toFixed(2)}`);
        log(`Saída prevista para STOP LOSS: ${stopLossPrice.toFixed(2)}`);
    }

    const now = Date.now();
    if (state.lastTradeTime && now - state.lastTradeTime < COOLDOWN_PERIOD) {
        const remaining = ((COOLDOWN_PERIOD - (now - state.lastTradeTime)) / 1000).toFixed(0);
        log(`⏳ Cooldown ativo — aguardando ${remaining}s...`);
        return;
    }

    // ===== SINAL DE COMPRA =====
    if (!state.isOpened) {
        const bullish = lastEMAshort > lastEMAlong && lastRSI && lastRSI < 70 && price <= sma * config.BUY_THRESHOLD;
        if (bullish) {
            log("📈 Sinal de COMPRA confirmado (EMA + RSI + SMA)");
            await newOrder(config.SYMBOL, config.QUANTITY, "BUY");
            state.isOpened = true;
            state.entryPrice = price;
            state.lastTradeTime = now;
            saveState(state);
            return;
        }
    }

    // ===== SINAL DE VENDA =====
    if (state.isOpened) {
        const gain = price / state.entryPrice;
        const bearish = lastEMAshort < lastEMAlong && lastRSI && lastRSI > 30;

        if (gain <= config.STOP_LOSS) {
            log(`❌ STOP LOSS atingido (${(gain * 100 - 100).toFixed(2)}%)`);
            await newOrder(config.SYMBOL, config.QUANTITY, "SELL");
            recordTrade("SELL", state.entryPrice, price, parseFloat(config.QUANTITY), config.SYMBOL);
            state.isOpened = false;
            state.entryPrice = 0;
            state.lastTradeTime = now;
            saveState(state);
        } else if (gain >= config.TAKE_PROFIT) {
            log(`✅ TAKE PROFIT atingido (${(gain * 100 - 100).toFixed(2)}%)`);
            await newOrder(config.SYMBOL, config.QUANTITY, "SELL");
            recordTrade("SELL", state.entryPrice, price, parseFloat(config.QUANTITY), config.SYMBOL);
            state.isOpened = false;
            state.entryPrice = 0;
            state.lastTradeTime = now;
            saveState(state);
        } else if (bearish && price >= sma * config.SELL_THRESHOLD) {
            log("📉 Sinal de VENDA confirmado (EMA + RSI + SMA)");
            await newOrder(config.SYMBOL, config.QUANTITY, "SELL");
            recordTrade("SELL", state.entryPrice, price, parseFloat(config.QUANTITY), config.SYMBOL);
            state.isOpened = false;
            state.entryPrice = 0;
            state.lastTradeTime = now;
            saveState(state);
        } else {
            log("⏳ Aguardando sinal de venda ou take profit...");
        }
    }
}

module.exports = { runStrategy };