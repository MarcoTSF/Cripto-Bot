# 🤖 Cripto Trading Bot (Binance Testnet)

Um bot simples para monitoramento e operação automática no mercado de criptomoedas, desenvolvido em **Node.js** com **Axios** e integração à **Binance Testnet API**.

> ⚠️ Este projeto é **apenas para fins educacionais e de teste**.  
> Não utilize este código em ambiente de produção sem implementar autenticação, gestão de risco e segurança adequadas.

---

## 🧩 Funcionalidades

- Conecta-se à **Binance Testnet** (`https://testnet.binance.vision`)
- Obtém candles de preço a cada 15 minutos (`interval=15m`)
- Calcula a **SMA (Simple Moving Average)** dos últimos 21 candles
- Simula operações automáticas de **compra e venda** com base em:
  - **Compra:** quando o preço atual ≤ 90% da média móvel  
  - **Venda:** quando o preço atual ≥ 110% da média móvel
- Atualiza as informações em tempo real a cada **3 segundos**

---

## 🧱 Estrutura de Pastas

```text
modules/
 ├── utils.js             # Funções auxiliares (log, saveState, etc.)
 ├── history.js           # Registro de operações
 ├── report.js            # Relatórios e estatísticas
 └── bot/
      ├── config/
      │    └── config.js              # Configuração dinâmica (SPOT/FUTURES)
      ├── trader/
      │    ├── trader.spot.js         # Execução de ordens no mercado à vista
      │    └── trader.futures.js      # Execução de ordens em contratos futuros
      └── strategies/
           ├── strategy_spot.js       # Estratégia para SPOT (apenas LONG)
           └── strategy_futures.js    # Estratégia para FUTURES (LONG + SHORT)

index.js                 # Inicializador interativo (seleção de modo)
.env                     # Configuração de chaves e ambiente
package.json             # Dependências do projeto
```

---

## ⚙️ Configuração do .env

```text
# ===============================
# 🔹 SPOT (mercado à vista)
# ===============================
API_KEY_SPOT=SUA KEY
SECRET_KEY_SPOT=SUA SECRET KEY
API_URL_SPOT_REAL=https://api.binance.com
API_URL_SPOT_TESTNET=https://testnet.binance.vision

# ===============================
# 🔸 FUTURES (contratos perpétuos)
# ===============================
API_KEY_FUTURES=SUA KEY
SECRET_KEY_FUTURES=SUA SECRET KEY
API_URL_FUTURES_REAL=https://fapi.binance.com
API_URL_FUTURES_TESTNET=https://testnet.binancefuture.com

# ===============================
# ⚙️ AMBIENTE E MODO PADRÃO
# ===============================
USE_TESTNET=true        # true = testnet / false = produção
DEFAULT_MODE=spot        # spot ou futures
```

---

## 🧠 Estratégias Técnicas
🔹 Indicadores utilizados

- EMA (Exponential Moving Average): tendência de curto e longo prazo.

- RSI (Relative Strength Index): força relativa (sobrecompra/sobrevenda).

- SMA (Simple Moving Average): referência de suporte/resistência.

| Situação                 | Ação              | Observação                        |
| ------------------------ | ----------------- | --------------------------------- |
| EMA12 > EMA26 e RSI < 75 | BUY               | Tendência de alta                 |
| EMA12 < EMA26 e RSI > 25 | SELL (no Futures) | Tendência de baixa                |
| Stop Loss                | SELL              | Fechamento automático de prejuízo |
| Take Profit              | SELL              | Realização de lucro               |
| Cooldown                 | Aguardar          | Evita operações muito frequentes  |

---

## 🛡️ Mecanismos de Segurança

🚫 Sem venda a descoberto no modo SPOT (impede short indevido).

💰 Verificação de saldo antes da compra (não compra acima do disponível).

🕒 Cooldown entre operações para evitar repetições.

💾 Persistência de estado e histórico local.

---

## 📚 Dependências principais

- [Axios](https://www.npmjs.com/package/axios)

- [dotenv](https://www.npmjs.com/package/dotenv)

- [crypto](https://nodejs.org/api/crypto.html)

---

## 🧾 Logs e Histórico

- Trades: trades.json

- Estado: state.json

- Logs: exibidos no terminal (console.log com timestamps)

---

## 🗺️ Roadmap de Desenvolvimento

O projeto está em constante evolução, com novas funcionalidades e melhorias sendo implementadas continuamente.

📦 **Principais frentes de trabalho:**
- Estrutura modular e suporte a Binance Spot/Futures  
- Estratégias baseadas em EMA, RSI e SMA  
- Sistema de logs, persistência e gestão de risco  
- Integração com Dashboard e relatórios automáticos  

🔗 **Veja o Roadmap completo:** [roadmap.md](./roadmap.md)

---

## 🧑‍💻 Autor

### [Marco Túlio Salvador Filho](https://github.com/MarcoTSF)
Desenvolvedor Front-End