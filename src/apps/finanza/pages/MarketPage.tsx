import React from 'react';
import { MarketIntel } from '../components/MarketIntel';

export const MarketPage: React.FC = () => {
  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-8 pb-32">
      <MarketIntel />
    </div>
  );
};
