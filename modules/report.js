const fs = require("fs");
const path = require("path");
const { log } = require("./utils");

const TRADES_FILE = path.join(__dirname, "../trades.json");
const SUMMARY_TXT = path.join(__dirname, "../report_summary.txt");
const SUMMARY_JSON = path.join(__dirname, "../report_summary.json");

function loadTrades() {
    try {
        if (!fs.existsSync(TRADES_FILE)) {
            fs.writeFileSync(TRADES_FILE, JSON.stringify([]));
            return [];
        }

        const content = fs.readFileSync(TRADES_FILE, "utf8").trim();
        if (!content) {
            fs.writeFileSync(TRADES_FILE, JSON.stringify([]));
            return [];
        }

        const data = JSON.parse(content);
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error("⚠️ Erro ao carregar trades.json:", err.message);
        fs.writeFileSync(TRADES_FILE, JSON.stringify([]));
        return [];
    }
}

function buildReportData(trades) {
    const totalTrades = trades.length;
    const profitableTrades = trades.filter(t => t.result === "PROFIT").length;
    const losingTrades = totalTrades - profitableTrades;

    const totalPnL = trades.reduce((acc, t) => acc + (t.pnlValue || 0), 0);
    const avgPnL = totalTrades ? totalPnL / totalTrades : 0;

    const avgPnLPercent = totalTrades ? trades.reduce((s, t) => s + (t.pnlPercent || 0), 0) / totalTrades : 0;

    const winRate = totalTrades ? (profitableTrades / totalTrades) * 100 : 0;

    const pnlValues = trades.map(t => t.pnlValue || 0);
    const biggestWin = pnlValues.length ? Math.max(...pnlValues) : 0;
    const biggestLoss = pnlValues.length ? Math.min(...pnlValues) : 0;

    const bestTrade = trades.find(t => (t.pnlValue || 0) === biggestWin) || null;
    const worstTrade = trades.find(t => (t.pnlValue || 0) === biggestLoss) || null;

    let balance = 0;
    const balanceHistory = trades.map((t, i) => {
        balance += (t.pnlValue || 0);
        return {
            index: i + 1,
            timestamp: t.timestamp || null,
            balance: parseFloat(balance.toFixed(8))
        };
    });

    const lastUpdate = trades.length ? trades[trades.length - 1].timestamp : null;

    return {
        totalTrades,
        profitableTrades,
        losingTrades,
        winRate: parseFloat(winRate.toFixed(2)),
        totalPnL: parseFloat(totalPnL.toFixed(8)),
        avgPnL: parseFloat(avgPnL.toFixed(8)),
        avgPnLPercent: parseFloat(avgPnLPercent.toFixed(4)),
        biggestWin: parseFloat(biggestWin.toFixed(8)),
        biggestLoss: parseFloat(biggestLoss.toFixed(8)),
        bestTrade,
        worstTrade,
        balanceHistory,
        lastUpdate
    };
}

function printReport(report) {
    console.clear();
    console.log("==============================================");
    console.log("📊 RELATÓRIO DE PERFORMANCE DO BOT DE TRADING");
    console.log("==============================================");
    console.log(`🧾 Total de operações: ${report.totalTrades}`);
    console.log(`✅ Trades lucrativos: ${report.profitableTrades}`);
    console.log(`❌ Trades perdedores: ${report.losingTrades}`);
    console.log(`🏁 Taxa de acerto: ${report.winRate.toFixed(2)}%`);
    console.log("----------------------------------------------");
    console.log(`💰 Lucro/Prejuízo total: ${report.totalPnL.toFixed(8)} USDT`);
    console.log(`📈 Lucro médio por trade: ${report.avgPnL.toFixed(8)} USDT`);
    console.log(`📊 Média PnL (% por trade): ${report.avgPnLPercent.toFixed(4)}%`);
    console.log(`⭐ Maior lucro: +${report.biggestWin.toFixed(8)} USDT`);
    console.log(`⚠️ Maior perda: ${report.biggestLoss.toFixed(8)} USDT`);
    console.log("----------------------------------------------");
    if (report.bestTrade) {
        console.log(`📅 Melhor operação: ${report.bestTrade.side} ${report.bestTrade.symbol} (${report.bestTrade.pnlPercent}%)`);
        console.log(`   Entrada: ${report.bestTrade.entryPrice} | Saída: ${report.bestTrade.exitPrice}`);
        console.log(`   Timestamp: ${report.bestTrade.timestamp || "N/A"}`);
    }
    if (report.worstTrade) {
        console.log(`📅 Pior operação: ${report.worstTrade.side} ${report.worstTrade.symbol} (${report.worstTrade.pnlPercent}%)`);
        console.log(`   Entrada: ${report.worstTrade.entryPrice} | Saída: ${report.worstTrade.exitPrice}`);
        console.log(`   Timestamp: ${report.worstTrade.timestamp || "N/A"}`);
    }
    console.log("----------------------------------------------");
    console.log("📈 Evolução do saldo (acumulado por operação):");
    report.balanceHistory.forEach(b => {
        const symbol = b.balance >= 0 ? "🟢" : "🔴";
        console.log(`${symbol} Trade #${b.index}${b.timestamp ? " (" + b.timestamp + ")" : ""}: ${b.balance.toFixed(8)} USDT`);
    });
    console.log("==============================================");
}

function saveTxt(report) {
    const lines = [];
    lines.push("===== 📊 RELATÓRIO DE PERFORMANCE =====");
    lines.push(`Total de trades: ${report.totalTrades}`);
    lines.push(`Vitórias: ${report.profitableTrades} | Derrotas: ${report.losingTrades}`);
    lines.push(`Taxa de acerto: ${report.winRate.toFixed(2)}%`);
    lines.push(`Lucro total (USDT): ${report.totalPnL.toFixed(8)}`);
    lines.push(`Lucro médio por trade (USDT): ${report.avgPnL.toFixed(8)}`);
    lines.push(`Média PnL (% por trade): ${report.avgPnLPercent.toFixed(4)}%`);
    lines.push(`Maior lucro: +${report.biggestWin.toFixed(8)} USDT`);
    lines.push(`Maior perda: ${report.biggestLoss.toFixed(8)} USDT`);
    if (report.bestTrade) {
        lines.push(`Melhor operação: ${report.bestTrade.side} ${report.bestTrade.symbol} (${report.bestTrade.pnlPercent}%) - Entrada: ${report.bestTrade.entryPrice} Saída: ${report.bestTrade.exitPrice} (${report.bestTrade.timestamp || "N/A"})`);
    }
    if (report.worstTrade) {
        lines.push(`Pior operação: ${report.worstTrade.side} ${report.worstTrade.symbol} (${report.worstTrade.pnlPercent}%) - Entrada: ${report.worstTrade.entryPrice} Saída: ${report.worstTrade.exitPrice} (${report.worstTrade.timestamp || "N/A"})`);
    }
    lines.push("Evolução do saldo (cumulativo):");
    report.balanceHistory.forEach(b => {
        lines.push(`Trade #${b.index}${b.timestamp ? " (" + b.timestamp + ")" : ""}: ${b.balance.toFixed(8)} USDT`);
    });
    lines.push("===== FIM DO RELATÓRIO =====");
    fs.writeFileSync(SUMMARY_TXT, lines.join("\n"));
}

function saveJson(report) {
    const out = {
        generatedAt: new Date().toISOString(),
        summary: {
            totalTrades: report.totalTrades,
            winningTrades: report.profitableTrades,
            losingTrades: report.losingTrades,
            winRate: report.winRate,
            totalPnL: report.totalPnL,
            avgPnL: report.avgPnL,
            avgPnLPercent: report.avgPnLPercent,
            biggestWin: report.biggestWin,
            biggestLoss: report.biggestLoss,
            lastUpdate: report.lastUpdate
        },
        bestTrade: report.bestTrade,
        worstTrade: report.worstTrade,
        balanceHistory: report.balanceHistory
    };
    fs.writeFileSync(SUMMARY_JSON, JSON.stringify(out, null, 2));
}

function generateReport() {
    const trades = loadTrades();
    if (!trades || trades.length === 0) {
        log("⚠️ Nenhuma operação registrada em trades.json.");
        return null;
    }

    const report = buildReportData(trades);
    printReport(report);
    return report;
}

function main() {
    const shouldSave = process.argv.includes("--save");
    const report = generateReport();
    if (!report) return;
    if (shouldSave) {
        try {
            saveTxt(report);
            saveJson(report);
            console.log(`💾 Resumo salvo: ${SUMMARY_TXT} / ${SUMMARY_JSON}`);
        } catch (err) {
            console.error("❌ Erro ao salvar resumo:", err.message);
        }
    }
}

if (require.main === module) {
    main();
}

module.exports = { generateReport, buildReportData, loadTrades };