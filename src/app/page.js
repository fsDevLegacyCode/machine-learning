'use client'
import React, { useState, useEffect } from "react";


const Home = () => {
  const [prices, setPrices] = useState({});
  const [predictedPrice, setPredictedPrice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBitcoinData() {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily"
        );
        const data = await response.json();

        // Extraindo preços
        const priceData = data.prices.map(([timestamp, price]) => ({
          date: new Date(timestamp).getDate(),
          price,
        }));

        // Encontrando valores específicos
        const startOfMonth = priceData[0]?.price;
        const midMonth = priceData[Math.floor(priceData.length / 2)]?.price;
        const yesterday = priceData[priceData.length - 2]?.price;
        const today = priceData[priceData.length - 1]?.price;

        setPrices({ startOfMonth, midMonth, yesterday, today });

        // Normalizar preços (escala 0-1)
        const minPrice = Math.min(...priceData.map((p) => p.price));
        const maxPrice = Math.max(...priceData.map((p) => p.price));
        const normalizedPrices = priceData.map((p) => (p.price - minPrice) / (maxPrice - minPrice));

        // Criar dados de treino
        let trainingData = [];
        for (let i = 0; i < normalizedPrices.length - 3; i++) {
          trainingData.push({
            input: [normalizedPrices[i], normalizedPrices[i + 1], normalizedPrices[i + 2]],
            output: [normalizedPrices[i + 3]],
          });
        }

        if (window.brain) {
          const net = new window.brain.NeuralNetwork({ hiddenLayers: [5, 5] });
          net.train(trainingData, { iterations: 1000, log: true });

          // Prever próximo preço
          const last3Days = normalizedPrices.slice(-3);
          const normalizedPrediction = net.run(last3Days);

          // Converter para valor real
          const predictedPrice = normalizedPrediction[0] * (maxPrice - minPrice) + minPrice;
          setPredictedPrice(predictedPrice.toFixed(2));
        }
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchBitcoinData();
  }, []);

  return (
    <div className="container mt-5">
      <h1 className="text-center mb-4">📈 Bitcoin Price Prediction</h1>

      {loading ? (
        <div className="text-center">
          <div className="spinner-border text-primary" role="status"></div>
          <p>Carregando dados...</p>
        </div>
      ) : (
        <div className="row justify-content-center">
          <div className="col-md-6">
            <table className="table table-bordered table-striped">
              <thead className="table-dark">
                <tr>
                  <th>Período</th>
                  <th>Preço (USD)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>📅 Início do Mês</td>
                  <td>${prices.startOfMonth?.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>📆 Meio do Mês</td>
                  <td>${prices.midMonth?.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>📉 Ontem</td>
                  <td>${prices.yesterday?.toFixed(2)}</td>
                </tr>
                <tr className="table-success">
                  <td>🔮 Previsão para Amanhã</td>
                  <td><strong>${predictedPrice}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
