
'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";

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

  if (isComplete) {
    return (
        <div>
            <h1>분석 완료</h1>
            {products.map(p => {
                const optimalPrice = getOptimalPrice(p.id);
                return (
                    <div key={p.id}>
                        <h2>{p.name}</h2>
                        <p>최적 가격: {optimalPrice ? `₩${optimalPrice.toLocaleString()}` : '데이터 없음'}</p>
                    </div>
                )
            })}
        </div>
    );
  }

  const product = products[currentProduct];
  const currentIndex = currentPriceIndex[product.id] || 0;
  const currentPrice = product.prices[currentIndex];

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <p>가격: ₩{currentPrice.toLocaleString()}</p>
      <p>이 가격에 구매하시겠습니까?</p>
      <Button onClick={() => handlePurchaseIntent(product.id, currentPrice, true)}>예</Button>
      <Button onClick={() => handlePurchaseIntent(product.id, currentPrice, false)}>아니오</Button>
    </div>
  );
}
