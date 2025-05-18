'use client'
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

const Home = () => {
  const [prices, setPrices] = useState({});
  const [chartData, setChartData] = useState(null);
  const [predictedPrice, setPredictedPrice] = useState(null);
  const [loading, setLoading] = useState(true);

  async function savePredictedPrice(value) {
    try {
      const res = await fetch('/api/bitcoin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });
      if (!res.ok) throw new Error('Failed to save predicted price');
      const saved = await res.json();
      console.log('Saved to DB:', saved);
    } catch (error) {
      console.error(error);
    }
  }

  async function getPredictedData() {
    try {
      const res = await fetch('/api/bitcoin', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to GET predicted price');
      const data = await res.json();
      return data;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  useEffect(() => {
    async function fetchBitcoinData() {
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily'
        );
        const data = await response.json();

        const priceData = data.prices.map(([timestamp, price]) => ({
          date: new Date(timestamp).toLocaleDateString('en-CA'),
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

        let predictedRounded = null;

        if (window.brain) {
          const net = new window.brain.NeuralNetwork({ hiddenLayers: [5, 5] });
          net.train(trainingData, { iterations: 1000, log: false });

          const last3Days = normalizedPrices.slice(-3);
          const normalizedPrediction = net.run(last3Days);
          const predicted = normalizedPrediction[0] * (maxPrice - minPrice) + minPrice;

          predictedRounded = Number(predicted.toFixed(2));
          setPredictedPrice(predictedRounded);
          savePredictedPrice(predictedRounded);
        }

        const savedPredictionsResponse = await getPredictedData();
        const savedPredictionsRaw = savedPredictionsResponse?.data || [];

        const savedPredictions = savedPredictionsRaw.map(({ created_at, value }) => ({
          date: new Date(created_at).toLocaleDateString('en-CA'),
          value,
        }));

        const allDatesSet = new Set(priceData.map(p => p.date));
        savedPredictions.forEach(p => allDatesSet.add(p.date));
        const allDates = Array.from(allDatesSet).sort();

        const priceMap = new Map(priceData.map(p => [p.date, p.price]));
        const savedMap = new Map(savedPredictions.map(p => [p.date, p.value]));

        const pricesAligned = allDates.map(date => priceMap.get(date) ?? null);
        const savedAligned = allDates.map(date => savedMap.get(date) ?? null);

        if (predictedRounded !== null) {
          allDates.push('Valor Previsto');
          pricesAligned.push(null);
          savedAligned.push(predictedRounded);
        }

        setChartData({
          labels: allDates,
          datasets: [
            {
              label: 'Preço BTC (USD)',
              data: pricesAligned,
              borderColor: 'rgba(75,192,192,1)',
              backgroundColor: 'rgba(75,192,192,0.2)',
              tension: 0.3,
              fill: true,
            },
            {
              label: '🔮 Previsões salvas',
              data: savedAligned,
              borderColor: 'red',
              backgroundColor: 'rgba(255,0,0,0.2)',
              pointRadius: 5,
              pointHoverRadius: 7,
              showLine: false,
            },
          ],
        });
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