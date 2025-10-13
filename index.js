/**
 * ===========================================================
 * index.js — Inicializador principal do bot
 * -----------------------------------------------------------
 * Permite escolher entre:
 *  (1) Modo SPOT (mercado à vista)
 *  (2) Modo FUTURES (contratos perpétuos)
 * ===========================================================
 */

const readline = require("readline");
const { loadState } = require("./modules/utils");
const { CHECK_INTERVAL } = require("./modules/bot/config/config");
require("dotenv").config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Estado inicial
let state = loadState({
    isOpened: false,
    entryPrice: 0,
    positionSide: null,
    movedStopToZero: false,
    movedStopToPartial: false,
    lastTradeTime: 0
});

// Pergunta interativa
console.clear();
console.log("===============================================");
console.log("🤖 CRIPTO BOT — Sistema de Operações Automáticas");
console.log("===============================================");
console.log("Escolha o modo de operação:\n");
console.log("1️⃣  SPOT  — Mercado à vista (apenas LONG)");
console.log("2️⃣  FUTURES  — Contratos perpétuos (LONG + SHORT)");
console.log("-----------------------------------------------");

rl.question("👉 Digite 1 ou 2 e pressione [Enter]: ", async (answer) => {
    rl.close();

    let runStrategy;

    if (answer === "1") {
        console.log("\n🚀 Iniciando em modo SPOT...");
        process.env.DEFAULT_MODE = "spot";
        const { runStrategy: spotStrategy } = require("./modules/bot/strategy");
        runStrategy = spotStrategy;
    } else if (answer === "2") {
        console.log("\n🧪 Iniciando em modo FUTURES...");
        process.env.DEFAULT_MODE = "futures";
        const { runStrategy: futuresStrategy } = require("./modules/bot/strategies/strategy_futures");
        runStrategy = futuresStrategy;
    } else {
        console.log("❌ Opção inválida. Encerrando execução.");
        process.exit(0);
    }

    // Execução contínua
    const execute = async () => {
        try {
            await runStrategy(state);
        } catch (err) {
            console.error("⚠️ Erro na execução da estratégia:", err.message);
        }
    };

    console.log("\n📡 Bot iniciado. Pressione Ctrl + C para encerrar.");
    console.log("===============================================\n");

    await execute();

    setInterval(execute, CHECK_INTERVAL);
});