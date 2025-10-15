# 🗺️ Roadmap de Desenvolvimento

### 🎯 Fase 1 — Estrutura e Fundamentos ✅
- [x] Estrutura modular do projeto (`modules/bot`, `utils`, `history`, `report`)
- [x] Suporte completo à **Binance Testnet**
- [x] Implementação da **estratégia SPOT (LONG)**
- [x] Implementação da **estratégia FUTURES (LONG + SHORT)**
- [x] Sistema de **log e persistência de estado (`state.json`)**
- [x] Registro de trades em **`trades.json`**
- [x] Alternância interativa entre modos (Spot / Futures)
- [x] Modo `USE_TESTNET` / `REAL` dinâmico via `.env`

---

### ⚙️ Fase 2 — Melhorias e Segurança 🧠
- [x] Validação de saldo antes da compra (Spot)
- [x] Proteção contra venda sem posição aberta (Spot)
- [x] Stop loss e take profit automáticos
- [x] Trailing stop dinâmico
- [x] Sistema de cooldown entre trades
- [ ] Verificação automática de **LOT_SIZE** mínima por par
- [ ] Requisições com **tratamento robusto de erros HTTP**
- [ ] Reconexão automática em caso de falhas de rede

---

### 📈 Fase 3 — Análise e Monitoramento 📊
- [ ] Dashboard web (React + Tailwind + API interna)
- [ ] Visualização de histórico e performance dos trades
- [ ] Geração automática de relatórios em `.pdf` e `.csv`
- [ ] Modo “headless” (execução sem logs de console)
- [ ] Sistema de **notificações (Telegram/Discord)**

---

### 🧮 Fase 4 — Estratégias Avançadas 💡
- [ ] Parametrização de estratégias via `strategy.json`
- [ ] Suporte a múltiplos pares de moedas simultâneos
- [ ] Estratégia de **Scalping** (micro operações curtas)
- [ ] Estratégia de **Swing Trade** (operações de médio prazo)
- [ ] Implementar **backtesting local** com dados históricos

---

### 🧠 Fase 5 — Inteligência e Expansão 🚀
- [ ] Módulo de **machine learning** para ajuste dinâmico de parâmetros
- [ ] Sistema de **risk management percentual** (alocação por % do capital)
- [ ] Conexão com **outros exchanges** (KuCoin, Bybit)
- [ ] Otimização para rodar em **ambiente cloud (AWS / Railway / VPS)**

---

### 🧹 Fase 6 — Documentação e Deploy 📘
- [ ] Documentação técnica detalhada (APIs, estratégias e arquitetura)
- [ ] Guia de instalação e uso em servidor Linux (CLI)
- [ ] Template de `.env.example` atualizado
- [ ] Script automatizado de instalação (`setup.js`)
- [ ] Publicação do projeto no GitHub com versão estável (`v1.0.0`)
