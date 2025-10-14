/**
 * ===========================================================
 * strategy_spot.js — Estratégia SPOT (mercado à vista)
 * -----------------------------------------------------------
 * Opera apenas em LONG (BUY -> SELL)
 * - Valida saldo antes de comprar
 * - Não permite vender sem posição aberta
 * - Stop loss dinâmico, take profit e cooldown
 * ===========================================================
 */

const { newOrder, getCandles, getBalance } = require("../trader/trader.spot");
const { log, calcSMA, saveState } = require("../../utils");
const { saveTrade } = require("../../history");
const config = require("../config/config");

const COOLDOWN_PERIOD = 3 * 60 * 1000; // 3 minutos

// ======================
// Helpers técnicos
// ======================
function calcEMA(values, period) {
const k = 2 / (period + 1);
let ema = [values[0]];
for (let i = 1; i < values.length; i++) {
    ema.push(values[i] * k + ema[i - 1] * (1 - k));
}
return ema;
}

function calcRSI(values, period = 14) {
if (values.length < period + 1) return null;
const deltas = values.map((v, i) => (i === 0 ? 0 : v - values[i - 1]));
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

function recordTrade(side, entryPrice, exitPrice, quantity, symbol) {
const pnlPercent = ((exitPrice / entryPrice - 1) * 100).toFixed(2);
const pnlValue = ((exitPrice - entryPrice) * quantity).toFixed(6);
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
    positionSide: "LONG",
    result: parseFloat(pnlPercent) > 0 ? "PROFIT" : "LOSS"
};

saveTrade(trade);
}

// ======================
// Estratégia SPOT
// ======================
async function runStrategy(state) {
// 1) Buscar candles e métricas
const candles = await getCandles(config.SYMBOL, config.INTERVAL, config.LIMIT);
if (!candles || candles.length === 0) {
    log("⚠️ Sem candles — pulando ciclo.");
    return;
}

const closes = candles.map(c => parseFloat(c[4]));
const price = closes.at(-1);
const sma = calcSMA(candles);
const emaShort = calcEMA(closes, 12);
const emaLong = calcEMA(closes, 26);
const rsiArr = calcRSI(closes, 14);

const lastEMAshort = emaShort.at(-1);
const lastEMAlong = emaLong.at(-1);
const lastRSI = rsiArr ? rsiArr.at(-1) : null;

console.clear();
log(`📊 [SPOT ${config.USE_TESTNET ? "TESTNET" : "REAL"}]`);
log(`Preço: ${price.toFixed(2)} | SMA: ${sma.toFixed(2)} | EMA12: ${lastEMAshort.toFixed(2)} | EMA26: ${lastEMAlong.toFixed(2)} | RSI: ${lastRSI?.toFixed(2) ?? "N/A"}`);
log(`Posição aberta: ${state.isOpened ? "SIM" : "NÃO"}`);
if (state.entryPrice) log(`Entrada: ${state.entryPrice.toFixed(2)}`);

// 2) Cooldown
const now = Date.now();
if (state.lastTradeTime && now - state.lastTradeTime < COOLDOWN_PERIOD) {
    const remaining = ((COOLDOWN_PERIOD - (now - state.lastTradeTime)) / 1000).toFixed(0);
    log(`⏳ Cooldown ativo — aguardando ${remaining}s...`);
    return;
}

// 3) Abertura de posição (BUY) — só se não houver posição aberta
if (!state.isOpened) {
    const bullish = lastEMAshort > lastEMAlong && lastRSI && lastRSI < 70 && price <= sma * config.BUY_THRESHOLD;
    if (bullish) {
    // valida saldo antes de comprar
    try {
        const balanceUSDT = await getBalance("USDT");
        const required = price * parseFloat(config.QUANTITY);
        // margem de segurança (ex: 0.5%) para fees/variação
        const safety = required * 0.005;
        if (balanceUSDT < required + safety) {
        log(`🚫 Saldo insuficiente para BUY — necessário ${ (required + safety).toFixed(6) } USDT, disponível ${balanceUSDT.toFixed(6)} USDT`);
        return;
        }
    } catch (err) {
        log(`⚠️ Não foi possível checar saldo antes da compra: ${err.message || err}`);
        return;
    }

    log("📈 Sinal de COMPRA detectado (LONG) — tentando executar ordem BUY...");
    const order = await newOrder(config.SYMBOL, config.QUANTITY, "BUY");
    if (!order) {
        log("❌ Ordem BUY falhou — abortando abertura de posição.");
        return;
    }

    Object.assign(state, {
        isOpened: true,
        entryPrice: price,
        lastTradeTime: now,
        movedStopToZero: false,
        movedStopToPartial: false,
        dynamicStop: null,
        positionSide: "LONG"
    });
    saveState(state);
    log(`✅ Posição LONG aberta a ${price.toFixed(2)}`);
    return;
    }

    log("⏳ Aguardando sinal de compra...");
    return;
}

// 4) Gerenciamento da posição — se não houver posição, não vende (proteção)
if (!state.isOpened) {
    log("🚫 Nenhuma posição aberta — não é possível vender no modo SPOT.");
    return;
}

// atualizar variáveis de gerenciamento
const entry = state.entryPrice;
const gain = price / entry;
const halfway = config.TAKE_PROFIT - (config.TAKE_PROFIT - 1) * 0.5; // 50% do alvo
const almostTarget = config.TAKE_PROFIT - (config.TAKE_PROFIT - 1) * 0.2; // 80% do alvo

// trailing stop dinâmico
if (!state.movedStopToZero && gain >= halfway) {
    state.dynamicStop = 1.0;
    state.movedStopToZero = true;
    log("🔁 Stop movido para o ZERO A ZERO (50% do alvo).");
} else if (!state.movedStopToPartial && gain >= almostTarget) {
    state.dynamicStop = 1 + (config.TAKE_PROFIT - 1) * 0.3; // +30% do alvo
    state.movedStopToPartial = true;
    log("🔁 Stop movido para +30% do alvo (80% do alvo atingido).");
}

const stopLoss = state.dynamicStop || config.STOP_LOSS;
const takeProfit = config.TAKE_PROFIT;

const stopHit = gain <= stopLoss;
const targetHit = gain >= takeProfit;

// sinal de venda baseado em indicadores (bearish)
const bearish = lastEMAshort < lastEMAlong && lastRSI && lastRSI > 30 && price >= sma * config.SELL_THRESHOLD;

// 5) Fechamento de posição
if (stopHit) {
    log(`❌ STOP LOSS atingido (${(gain * 100 - 100).toFixed(2)}%) — executando SELL...`);
    const order = await newOrder(config.SYMBOL, config.QUANTITY, "SELL");
    if (!order) {
    log("❌ Ordem SELL falhou no STOP — mantendo posição.");
    return;
    }
    recordTrade("SELL", entry, price, parseFloat(config.QUANTITY), config.SYMBOL);
    Object.assign(state, { isOpened: false, entryPrice: 0, lastTradeTime: now, positionSide: null });
    saveState(state);
    return;
}

if (targetHit) {
    log(`✅ TAKE PROFIT atingido (${(gain * 100 - 100).toFixed(2)}%) — executando SELL...`);
    const order = await newOrder(config.SYMBOL, config.QUANTITY, "SELL");
    if (!order) {
    log("❌ Ordem SELL falhou no TAKE PROFIT — mantendo posição.");
    return;
    }
    recordTrade("SELL", entry, price, parseFloat(config.QUANTITY), config.SYMBOL);
    Object.assign(state, { isOpened: false, entryPrice: 0, lastTradeTime: now, positionSide: null });
    saveState(state);
    return;
}

if (bearish) {
    log("📉 Sinal de VENDA (bearish) detectado — executando SELL...");
    const order = await newOrder(config.SYMBOL, config.QUANTITY, "SELL");
    if (!order) {
    log("❌ Ordem SELL falhou no sinal bearish — mantendo posição.");
    return;
    }
    recordTrade("SELL", entry, price, parseFloat(config.QUANTITY), config.SYMBOL);
    Object.assign(state, { isOpened: false, entryPrice: 0, lastTradeTime: now, positionSide: null });
    saveState(state);
    return;
}

log("⏳ Aguardando movimento favorável...");
}

module.exports = { runStrategy };