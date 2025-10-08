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

## 🧠 Lógica do Bot

```text
SMA = Média dos últimos 21 fechamentos
Se preço atual <= (SMA * 0.9) → COMPRAR
Se preço atual >= (SMA * 1.1) → VENDER
Senão → AGUARDAR
