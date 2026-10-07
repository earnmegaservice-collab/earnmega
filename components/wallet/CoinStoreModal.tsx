'use client';

import React from 'react';

type CoinPackage = {
  id: string;
  coins: number;
  bonus?: number;
  priceNGN: number;
  isPopular?: boolean;
};

const COIN_PACKAGES: CoinPackage[] = [
  { id: 'pkg_small', coins: 500, priceNGN: 500 },
  { id: 'pkg_medium', coins: 1250, bonus: 250, priceNGN: 1000, isPopular: true },
  { id: 'pkg_large', coins: 5000, bonus: 1500, priceNGN: 3500 },
];

type CoinStoreModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CoinStoreModal({ isOpen, onClose }: CoinStoreModalProps) {
  if (!isOpen) return null;

  const handlePurchase = (pkg: CoinPackage) => {
    // Scaffold for future Paystack integration
    console.log(`Initiating Paystack checkout for package: ${pkg.id} - ₦${pkg.priceNGN}`);
    alert(`Checkout initialized for ${pkg.coins} Coins!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm sm:items-center font-sans">

      {/* Modal Container */}
      <div
        className="relative w-full max-w-sm bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800 bg-gray-900/90">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🛍️</span>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Coin Store</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors focus:outline-none"
            title="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto bg-gray-950 flex-1 space-y-4">
          <p className="text-sm text-gray-400 font-medium mb-2">
            Select a package to top up your Earnmega balance instantly.
          </p>

          <div className="space-y-3">
            {COIN_PACKAGES.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => handlePurchase(pkg)}
                className={`w-full group relative flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-950 ${
                  pkg.isPopular
                    ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-amber-500/50 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-900/20'
                    : 'bg-gray-900 border-gray-800 hover:border-gray-600 hover:bg-gray-800/80'
                }`}
              >
                {/* Popular Badge */}
                {pkg.isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-amber-950 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                    Most Popular
                  </span>
                )}

                <div className="flex flex-col items-start">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl drop-shadow-md">🪙</span>
                    <span className="text-xl font-black text-white">{pkg.coins.toLocaleString()}</span>
                  </div>
                  {pkg.bonus && (
                    <span className="text-xs font-bold text-emerald-400 mt-0.5 ml-8">
                      + {pkg.bonus} Bonus Coins
                    </span>
                  )}
                </div>

                <div className="flex flex-col items-end justify-center">
                   <div className="bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-emerald-950 font-bold px-3 py-1.5 rounded-lg transition-colors border border-emerald-500/20 group-hover:border-emerald-500">
                     ₦{pkg.priceNGN.toLocaleString()}
                   </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-4 bg-gray-900 border-t border-gray-800 text-center">
           <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold flex items-center justify-center">
              Secured by Paystack
              <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
           </p>
        </div>
      </div>

    </div>
  );
}
