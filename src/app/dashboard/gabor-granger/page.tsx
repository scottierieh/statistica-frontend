'use client';

import React, { useState } from 'react';
import { TrendingUp, DollarSign, Package, BarChart3, ChevronRight, Settings, Save } from 'lucide-react';

export default function GaborGrangerSurvey() {
  const [currentProduct, setCurrentProduct] = useState(0);
  const [currentPriceIndex, setCurrentPriceIndex] = useState<{ [key: string]: number }>({});
  const [responses, setResponses] = useState<{ [key: string]: { price: number; willBuy: boolean }[] }>({});
  const [isComplete, setIsComplete] = useState(false);

  const products = [
    {
      id: 'product1',
      name: '프리미엄 무선 이어폰',
      image: '🎧',
      description: '노이즈 캔슬링 기능이 있는 고급 무선 이어폰',
      prices: [50000, 80000, 100000, 120000, 150000, 180000, 200000]
    },
    {
      id: 'product2',
      name: '스마트 워치',
      image: '⌚',
      description: '건강 추적 및 알림 기능이 있는 스마트 워치',
      prices: [100000, 150000, 200000, 250000, 300000, 350000, 400000]
    },
    {
      id: 'product3',
      name: '휴대용 블루투스 스피커',
      image: '🔊',
      description: '방수 기능이 있는 고음질 블루투스 스피커',
      prices: [30000, 50000, 70000, 90000, 110000, 130000, 150000]
    }
  ];

  const handlePurchaseIntent = (productId: string, price: number, willBuy: boolean) => {
    const newResponses = { ...responses };
    if (!newResponses[productId]) {
      newResponses[productId] = [];
    }
    
    newResponses[productId].push({
      price: price,
      willBuy: willBuy
    });
    
    setResponses(newResponses);

    const product = products[currentProduct];
    const currentIndex = currentPriceIndex[productId] || 0;
    
    if (willBuy && currentIndex < product.prices.length - 1) {
      const newIndex = { ...currentPriceIndex };
      newIndex[productId] = currentIndex + 1;
      setCurrentPriceIndex(newIndex);
    } else {
      moveToNextProduct();
    }
  };

  const moveToNextProduct = () => {
    if (currentProduct < products.length - 1) {
      setCurrentProduct(currentProduct + 1);
    } else {
      calculateResults();
    }
  };

  const calculateResults = () => {
    setIsComplete(true);
  };

  const getOptimalPrice = (productId: string) => {
    const productResponses = responses[productId] || [];
    if (productResponses.length === 0) return null;

    const yesResponses = productResponses.filter(r => r.willBuy);
    if (yesResponses.length === 0) return null;
    
    return Math.max(...yesResponses.map(r => r.price));
  };

  const calculateDemandCurve = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return [];
    const productResponses = responses[productId] || [];
    
    return product.prices.map(price => {
      const response = productResponses.find(r => r.price === price);
      return {
        price: price,
        willBuy: response ? response.willBuy : null
      };
    });
  };

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-green-600" />
              <h1 className="text-3xl font-bold text-gray-800 mb-2">가격 민감도 분석 결과</h1>
              <p className="text-gray-600">Gabor-Granger 방법론에 따른 최적 가격 분석</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {products.map((product) => {
                const optimalPrice = getOptimalPrice(product.id);
                const demandCurve = calculateDemandCurve(product.id);
                
                return (
                  <div key={product.id} className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border-2 border-gray-200 hover:shadow-lg transition-all">
                    <div className="text-center mb-4">
                      <div className="text-6xl mb-3">{product.image}</div>
                      <h3 className="font-bold text-lg text-gray-800 mb-2">{product.name}</h3>
                    </div>

                    <div className="bg-green-50 rounded-xl p-4 mb-4 border border-green-200">
                      <p className="text-sm text-green-700 font-semibold mb-1">최적 가격</p>
                      <p className="text-3xl font-bold text-green-600">
                        {optimalPrice ? `₩${optimalPrice.toLocaleString()}` : '데이터 없음'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-600 mb-2">가격별 구매 의향</p>
                      {demandCurve.map((point, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">₩{point.price.toLocaleString()}</span>
                          {point.willBuy === null ? (
                            <span className="text-gray-400">-</span>
                          ) : point.willBuy ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">구매 O</span>
                          ) : (
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">구매 X</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200 mb-6">
              <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                <TrendingUp size={20} />
                분석 방법: Gabor-Granger
              </h3>
              <p className="text-sm text-blue-800 mb-2">
                Gabor-Granger 기법은 소비자에게 순차적으로 다른 가격을 제시하고 각 가격에서의 구매 의향을 측정합니다.
              </p>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>응답자가 "예"라고 답하면 더 높은 가격 제시</li>
                <li>"아니오"라고 답하면 조사 종료</li>
                <li>최적 가격은 응답자가 마지막으로 구매 의향을 보인 가격</li>
              </ul>
            </div>

            <button
              onClick={() => {
                setCurrentProduct(0);
                setCurrentPriceIndex({});
                setResponses({});
                setIsComplete(false);
              }}
              className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-green-700 hover:to-blue-700 transition-all shadow-lg"
            >
              다시 시작하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  const product = products[currentProduct];
  const currentIndex = currentPriceIndex[product.id] || 0;
  const currentPrice = product.prices[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">
              제품 {currentProduct + 1} / {products.length}
            </span>
            <span className="text-sm font-semibold text-green-600">
              {Math.round(((currentProduct) / products.length) * 100)}%
            </span>
          </div>
          <div className="h-3 bg-white rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500 rounded-full"
              style={{ width: `${((currentProduct) / products.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-block px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold mb-4">
              제품 {currentProduct + 1}
            </div>
            <div className="text-8xl mb-4">{product.image}</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">{product.name}</h2>
            <p className="text-gray-600">{product.description}</p>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 mb-8 border-2 border-blue-200">
            <div className="flex items-center justify-center gap-3 mb-4">
              <DollarSign className="text-blue-600" size={32} />
              <p className="text-lg text-gray-700 font-medium">
                이 제품의 가격이 다음과 같다면,
              </p>
            </div>
            <div className="text-center">
              <p className="text-5xl font-bold text-blue-600 mb-2">
                ₩{currentPrice.toLocaleString()}
              </p>
              <p className="text-lg text-gray-700 font-medium">
                구매하시겠습니까?
              </p>
            </div>
          </div>

          <div className="mb-8 p-4 bg-gray-50 rounded-xl">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <div className="text-center">
                <p className="font-semibold mb-1">최저가</p>
                <p className="text-lg font-bold text-gray-800">₩{Math.min(...product.prices).toLocaleString()}</p>
              </div>
              <div className="text-center px-4">
                <p className="font-semibold mb-1">현재 제시가</p>
                <p className="text-lg font-bold text-blue-600">₩{currentPrice.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="font-semibold mb-1">최고가</p>
                <p className="text-lg font-bold text-gray-800">₩{Math.max(...product.prices).toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-400 to-red-400 transition-all"
                style={{ 
                  width: `${((currentPrice - Math.min(...product.prices)) / (Math.max(...product.prices) - Math.min(...product.prices) || 1)) * 100}%` 
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handlePurchaseIntent(product.id, currentPrice, false)}
              className="px-8 py-6 bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 text-red-700 rounded-2xl font-bold text-xl hover:from-red-100 hover:to-red-200 transition-all shadow-md hover:shadow-lg"
            >
              <div className="text-4xl mb-2">❌</div>
              아니오
            </button>
            <button
              onClick={() => handlePurchaseIntent(product.id, currentPrice, true)}
              className="px-8 py-6 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 text-green-700 rounded-2xl font-bold text-xl hover:from-green-100 hover:to-green-200 transition-all shadow-md hover:shadow-lg"
            >
              <div className="text-4xl mb-2">✅</div>
              예
            </button>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
            <p className="text-sm text-yellow-800 text-center">
              💡 "예"를 선택하면 더 높은 가격을 제시합니다. "아니오"를 선택하면 다음 제품으로 넘어갑니다.
            </p>
          </div>
        </div>

        <div className="flex justify-center gap-3 mt-6">
          {products.map((_, index) => (
            <div
              key={index}
              className={`h-3 rounded-full transition-all ${
                index === currentProduct 
                  ? 'bg-green-600 w-8' 
                  : index < currentProduct
                  ? 'bg-blue-400 w-3' 
                  : 'bg-gray-300 w-3'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
