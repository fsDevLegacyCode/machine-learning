'use client';
import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

  useEffect(() => {
    async function fetchDbData() {
      try {
        const res = await fetch('/api/bitcoin');
        const data = await res.json();
        setDbData(data);
      } catch (error) {
        console.error('Failed to fetch DB data:', error);
      }
    }

    fetchDbData();
  }, []);

  async function savePredictedPrice(value) {
    try {
      const res = await fetch('/api/bitcoin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: Number(value) }),
      });
      if (!res.ok) throw new Error('Failed to save predicted price');
      const saved = await res.json();
      console.log('Saved to DB:', saved);
      // Optionally update state if needed
    } catch (error) {
      console.error(error);
    }
  }




const Home = () => {
  const [prices, setPrices] = useState({});
  const [chartData, setChartData] = useState(null);
  const [predictedPrice, setPredictedPrice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBitcoinData() {
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily'
        );
        const data = await response.json();

        const priceData = data.prices.map(([timestamp, price]) => ({
          date: new Date(timestamp).toLocaleDateString(),
          price,
        }));

        const startOfMonth = priceData[0]?.price;
        const midMonth = priceData[Math.floor(priceData.length / 2)]?.price;
        const yesterday = priceData[priceData.length - 2]?.price;
        const today = priceData[priceData.length - 1]?.price;

        setPrices({ startOfMonth, midMonth, yesterday, today });

        const minPrice = Math.min(...priceData.map((p) => p.price));
        const maxPrice = Math.max(...priceData.map((p) => p.price));
        const normalizedPrices = priceData.map((p) => (p.price - minPrice) / (maxPrice - minPrice));

        let trainingData = [];
        for (let i = 0; i < normalizedPrices.length - 3; i++) {
          trainingData.push({
            input: [normalizedPrices[i], normalizedPrices[i + 1], normalizedPrices[i + 2]],
            output: [normalizedPrices[i + 3]],
          });
        }

        const labels = priceData.map((p) => p.date);
        const pricesOnly = priceData.map((p) => p.price);

        if (window.brain) {
          const net = new window.brain.NeuralNetwork({ hiddenLayers: [5, 5] });
          net.train(trainingData, { iterations: 1000, log: false });

          const last3Days = normalizedPrices.slice(-3);
          const normalizedPrediction = net.run(last3Days);
          const predicted = normalizedPrediction[0] * (maxPrice - minPrice) + minPrice;
          setPredictedPrice(predicted.toFixed(2));
          setData(predicted.toFixed(2));
          labels.push('Amanhã');

          setChartData({
            labels,
            datasets: [
              {
                label: 'Preço BTC (USD)',
                data: [...pricesOnly, null], // manter espaço para amanhã
                borderColor: 'rgba(75,192,192,1)',
                backgroundColor: 'rgba(75,192,192,0.2)',
                tension: 0.3,
                fill: true,
              },
              {
                label: '🔮 Previsão',
                data: Array(pricesOnly.length).fill(null).concat(predicted),
                borderColor: 'red',
                backgroundColor: 'red',
                pointRadius: 6,
                pointHoverRadius: 8,
                showLine: false,
              },
            ],
          });
        } else {
          // fallback sem previsão
          setChartData({
            labels,
            datasets: [
              {
                label: 'Preço BTC (USD)',
                data: pricesOnly,
                borderColor: 'rgba(75,192,192,1)',
                backgroundColor: 'rgba(75,192,192,0.2)',
                tension: 0.3,
                fill: true,
              },
            ],
          });
        }
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
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
        <>
          <div className="row justify-content-center mb-4">
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
                    <td>
                      <strong style={{ color: predictedPrice > prices.today ? 'green' : 'red' }}>
                        ${predictedPrice}
                      </strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="row justify-content-center">
            <div className="col-md-10">
              {chartData && (
                <Line
                  data={chartData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { position: 'top' },
                      title: { display: true, text: 'Histórico de Preço do Bitcoin (30 dias)' },
                    },
                  }}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Home;
