const { newOrder, getCandles } = require("./trader");
const { log, calcSMA, saveState } = require("./utils");
const config = require("./config");

async function runStrategy(state) {
    const candles = await getCandles(config.SYMBOL, config.INTERVAL, config.LIMIT);
    const lastCandle = candles[candles.length - 1];
    const price = parseFloat(lastCandle[4]);
    const sma = calcSMA(candles);

    console.clear();
    log(`Preço atual: ${price.toFixed(2)} | SMA(${config.LIMIT}): ${sma.toFixed(2)}`);
    log(`Posição aberta: ${state.isOpened ? "SIM" : "NÃO"}`);
    if (state.entryPrice) log(`Preço de entrada: ${state.entryPrice.toFixed(2)}`);

    // --- Compra ---
    if (!state.isOpened && price <= sma * config.BUY_THRESHOLD) {
        log("📈 Sinal de COMPRA detectado!");
        await newOrder(config.SYMBOL, config.QUANTITY, "BUY");
        state.isOpened = true;
        state.entryPrice = price;
        saveState(state);
        return;
    }

    // --- Venda ---
    if (state.isOpened) {
        const gain = price / state.entryPrice;

        if (gain <= config.STOP_LOSS) {
            log(`❌ STOP LOSS atingido (${(gain * 100 - 100).toFixed(2)}%)`);
            await newOrder(config.SYMBOL, config.QUANTITY, "SELL");
            state.isOpened = false;
            state.entryPrice = 0;
            saveState(state);
        } else if (gain >= config.TAKE_PROFIT) {
            log(`✅ TAKE PROFIT atingido (${(gain * 100 - 100).toFixed(2)}%)`);
            await newOrder(config.SYMBOL, config.QUANTITY, "SELL");
            state.isOpened = false;
            state.entryPrice = 0;
            saveState(state);
        } else if (price >= sma * config.SELL_THRESHOLD) {
            log(`📉 Condição de VENDA atingida — preço acima da SMA (${price.toFixed(2)})`);
            await newOrder(config.SYMBOL, config.QUANTITY, "SELL");
            state.isOpened = false;
            state.entryPrice = 0;
            saveState(state);
        } else {
            log("⏳ Aguardando... preço dentro da zona neutra.");
        }
    } else {
            log("⏳ Aguardando sinal de compra...");
    }
}

module.exports = { runStrategy };