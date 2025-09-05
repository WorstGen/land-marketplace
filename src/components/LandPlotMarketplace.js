import React, { useState, useEffect, useCallback } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

const LandPlotMarketplace = () => {
  // State management
  const [currentArea, setCurrentArea] = useState(8);
  const [basePrice, setBasePrice] = useState(0.8);
  const [plots, setPlots] = useState([]);
  const [solPrice, setSolPrice] = useState(200); // USD price of SOL
  const [tokenPrice, setTokenPrice] = useState(0.001); // USD price of SPL token
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [monitoring, setMonitoring] = useState(false);
  
  // Solana configuration
  const WALLET_ADDRESS = 'FKFeSgtKAmgkKwxiXMD8woCWUh1ERyzAZARoFtJi2p9c';
  const SPL_TOKEN_MINT = '4kU3B6hvnMEWNZadKWkQatky8fBgDLt7R9HwoysVpump';
  const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
  
  // Initialize plots for current area
  const initializePlots = useCallback(() => {
    const newPlots = [];
    for (let i = 1; i <= 10; i++) {
      newPlots.push({
        id: `${currentArea}-${i}`,
        number: i,
        status: (currentArea === 8 && i === 1) ? 'sold' : 'available',
        owner: (currentArea === 8 && i === 1) ? 'Previous Owner' : null,
        paymentType: null
      });
    }
    return newPlots;
  }, [currentArea]);

  // Initialize plots on component mount or area change
  useEffect(() => {
    setPlots(initializePlots());
  }, [initializePlots]);

  // Fetch SOL and token prices
  const fetchPrices = async () => {
    try {
      // Fetch SOL price from CoinGecko
      const solResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      const solData = await solResponse.json();
      if (solData.solana?.usd) {
        setSolPrice(solData.solana.usd);
      }
      
      // For SPL token, you'd need to implement price fetching from DEX APIs
      // This is a placeholder - you'd integrate with Jupiter, Raydium, etc.
      // setTokenPrice(fetchedTokenPrice);
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
  };

  // Calculate token equivalent
  const calculateTokenAmount = () => {
    const usdValue = basePrice * solPrice;
    return Math.ceil(usdValue / tokenPrice);
  };

  // Monitor transactions
  const monitorTransactions = useCallback(async () => {
    if (!monitoring) return;

    try {
      const publicKey = new PublicKey(WALLET_ADDRESS);
      
      // Get recent SOL transactions
      const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 10 });
      
      for (const signatureInfo of signatures) {
        if (recentTransactions.some(tx => tx.signature === signatureInfo.signature)) {
          continue; // Already processed
        }

        const transaction = await connection.getTransaction(signatureInfo.signature, {
          commitment: 'confirmed'
        });

        if (transaction) {
          await processTransaction(transaction, signatureInfo.signature);
        }
      }
    } catch (error) {
      console.error('Error monitoring transactions:', error);
    }
  }, [monitoring, recentTransactions, connection]);

  // Process individual transaction
  const processTransaction = async (transaction, signature) => {
    try {
      const { meta, transaction: txData } = transaction;
      
      if (!meta || meta.err) return;

      // Check for SOL transfers
      const preBalance = meta.preBalances[0] || 0;
      const postBalance = meta.postBalances[0] || 0;
      const solTransferred = (postBalance - preBalance) / 1000000000; // Convert lamports to SOL

      // Check for SPL token transfers
      let tokenTransferred = 0;
      if (meta.preTokenBalances && meta.postTokenBalances) {
        const tokenBalanceChanges = meta.postTokenBalances.filter(
          balance => balance.mint === SPL_TOKEN_MINT
        );
        
        if (tokenBalanceChanges.length > 0) {
          // Calculate token transfer amount
          tokenTransferred = calculateTokenTransfer(meta.preTokenBalances, meta.postTokenBalances);
        }
      }

      // Determine if this is a valid purchase
      const expectedTokenAmount = calculateTokenAmount();
      const isValidSOL = Math.abs(solTransferred - basePrice) < 0.001;
      const isValidToken = Math.abs(tokenTransferred - expectedTokenAmount) < expectedTokenAmount * 0.02; // 2% tolerance

      if (isValidSOL || isValidToken) {
        const senderAddress = txData.message.accountKeys[0].toBase58();
        assignNextPlot(senderAddress, isValidSOL ? 'SOL' : 'TOKEN', signature);
      }
    } catch (error) {
      console.error('Error processing transaction:', error);
    }
  };

  // Calculate token transfer amount
  const calculateTokenTransfer = (preBalances, postBalances) => {
    const tokenMint = SPL_TOKEN_MINT;
    
    // Find token account changes for our specific mint
    const preBalance = preBalances.find(balance => balance.mint === tokenMint);
    const postBalance = postBalances.find(balance => balance.mint === tokenMint);
    
    if (!preBalance || !postBalance) return 0;
    
    const preAmount = parseFloat(preBalance.uiTokenAmount.uiAmount || 0);
    const postAmount = parseFloat(postBalance.uiTokenAmount.uiAmount || 0);
    
    return Math.abs(postAmount - preAmount);
  };

  // Assign next available plot
  const assignNextPlot = (ownerAddress, paymentType, signature) => {
    setPlots(prevPlots => {
      const nextAvailable = prevPlots.find(plot => plot.status === 'available');
      if (!nextAvailable) {
        // All plots sold, move to next area
        setTimeout(moveToNextArea, 2000);
        return prevPlots;
      }

      const updatedPlots = prevPlots.map(plot =>
        plot.id === nextAvailable.id
          ? { ...plot, status: 'sold', owner: ownerAddress, paymentType }
          : plot
      );

      // Add to recent transactions
      addRecentTransaction(ownerAddress, paymentType, nextAvailable.id, signature);

      return updatedPlots;
    });
  };

  // Add transaction to recent list
  const addRecentTransaction = (address, paymentType, plotId, signature) => {
    const newTransaction = {
      signature,
      address: shortenAddress(address),
      paymentType,
      plotId,
      timestamp: new Date(),
      amount: paymentType === 'SOL' ? basePrice : calculateTokenAmount()
    };

    setRecentTransactions(prev => [newTransaction, ...prev.slice(0, 9)]);
  };

  // Move to next area
  const moveToNextArea = () => {
    setCurrentArea(prev => prev + 1);
    setBasePrice(prev => Math.round((prev + 0.1) * 10) / 10);
    showAreaTransition();
  };

  // Show area transition notification
  const showAreaTransition = () => {
    // This would typically show a modal or toast notification
    alert(`Area ${currentArea + 1} Now Available!`);
  };

  // Start/stop monitoring
  const toggleMonitoring = () => {
    setMonitoring(prev => !prev);
  };

  // Monitor transactions periodically
  useEffect(() => {
    let interval;
    if (monitoring) {
      fetchPrices(); // Fetch prices when starting
      interval = setInterval(monitorTransactions, 10000); // Check every 10 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [monitoring, monitorTransactions]);

  // Utility function to shorten addresses
  const shortenAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Copy wallet address
  const copyWalletAddress = async () => {
    try {
      await navigator.clipboard.writeText(WALLET_ADDRESS);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  // Calculate statistics
  const soldCount = plots.filter(plot => plot.status === 'sold').length;
  const availableCount = 10 - soldCount;
  const progressPercent = (soldCount / 10) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-purple-800 text-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            Virtual Land Marketplace
          </h1>
          <p className="text-xl opacity-80">Secure your piece of the virtual world with SOL or SPL tokens</p>
        </div>

        {/* Area Information */}
        <div className="flex flex-col lg:flex-row justify-between items-center bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20">
          <div className="text-left mb-4 lg:mb-0">
            <div className="text-3xl font-bold text-yellow-400 mb-2">Area {currentArea}</div>
            <div className="text-xl mb-2">{basePrice} SOL per plot</div>
            <div className="text-lg opacity-80">≈ {calculateTokenAmount().toLocaleString()} SPL tokens</div>
            <div className="text-md opacity-70">{availableCount} plots remaining</div>
          </div>
          <div className="w-full lg:w-80">
            <div className="w-full h-6 bg-white/20 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="text-center text-sm">
              {soldCount} / 10 sold
            </div>
          </div>
        </div>

        {/* Plots Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {plots.map(plot => (
            <div
              key={plot.id}
              className={`
                aspect-square border-2 rounded-xl flex flex-col justify-center items-center p-4 transition-all duration-300 backdrop-blur-md
                ${plot.status === 'available' 
                  ? 'bg-green-500/20 border-green-400 hover:bg-green-500/30 hover:-translate-y-1 hover:shadow-lg hover:shadow-green-500/25 cursor-pointer' 
                  : plot.status === 'sold'
                  ? 'bg-red-500/20 border-red-400'
                  : 'bg-yellow-500/20 border-yellow-400 animate-pulse'
                }
              `}
            >
              <div className="text-lg font-bold mb-1">{plot.id}</div>
              <div className="text-sm opacity-80 capitalize mb-1">{plot.status}</div>
              {plot.owner && (
                <>
                  <div className="text-xs opacity-60 text-center">{shortenAddress(plot.owner)}</div>
                  {plot.paymentType && (
                    <div className="text-xs font-semibold mt-1 px-2 py-1 bg-white/20 rounded">
                      {plot.paymentType}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Payment Information */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20">
          <h3 className="text-2xl font-bold mb-4">Payment Options:</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* SOL Payment */}
            <div className="bg-white/5 rounded-xl p-4">
              <h4 className="text-lg font-semibold mb-3 text-blue-400">Pay with SOL</h4>
              <div className="text-sm opacity-80 mb-2">Send exactly:</div>
              <div className="text-2xl font-bold mb-3">{basePrice} SOL</div>
              <div className="bg-black/30 p-3 rounded-lg font-mono text-sm break-all border border-white/20">
                {WALLET_ADDRESS}
                <button 
                  onClick={copyWalletAddress}
                  className="ml-2 px-3 py-1 bg-blue-500 hover:bg-blue-600 rounded text-xs transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>

            {/* SPL Token Payment */}
            <div className="bg-white/5 rounded-xl p-4">
              <h4 className="text-lg font-semibold mb-3 text-green-400">Pay with SPL Token</h4>
              <div className="text-sm opacity-80 mb-2">Send approximately:</div>
              <div className="text-2xl font-bold mb-3">{calculateTokenAmount().toLocaleString()} tokens</div>
              <div className="bg-black/30 p-3 rounded-lg font-mono text-sm break-all border border-white/20">
                {WALLET_ADDRESS}
                <button 
                  onClick={copyWalletAddress}
                  className="ml-2 px-3 py-1 bg-green-500 hover:bg-green-600 rounded text-xs transition-colors"
                >
                  Copy
                </button>
              </div>
              <div className="text-xs opacity-60 mt-2">
                Token: {shortenAddress(SPL_TOKEN_MINT)}
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-yellow-500/20 border border-yellow-400/50 rounded-lg">
            <p className="text-sm">
              ⚠️ <strong>Important:</strong> Send the exact SOL amount or equivalent SPL tokens. 
              Transactions are processed automatically in order received.
            </p>
          </div>
        </div>

        {/* Transaction Monitor */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Transaction Monitor</h3>
            <button
              onClick={toggleMonitoring}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                monitoring 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {monitoring ? 'Stop Monitoring' : 'Start Monitoring'}
            </button>
          </div>

          {monitoring && (
            <div className="text-center py-4 mb-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-green-400 mr-2"></div>
              Monitoring blockchain for new transactions...
            </div>
          )}

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8 opacity-60">
                No recent transactions detected
              </div>
            ) : (
              recentTransactions.map((tx, index) => (
                <div key={index} className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-semibold text-green-400">Plot {tx.plotId} Sold!</div>
                    <div className="text-xs opacity-60">
                      {tx.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="text-sm opacity-80">From: {tx.address}</div>
                  <div className="text-sm opacity-80">
                    Amount: {tx.amount} {tx.paymentType === 'SOL' ? 'SOL' : 'Tokens'}
                  </div>
                  <div className="text-xs opacity-60 font-mono">
                    {shortenAddress(tx.signature)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandPlotMarketplace;
