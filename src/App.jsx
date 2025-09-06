import React, { useState, useEffect, useRef } from 'react'
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token'

// Network configuration
const NETWORK = import.meta.env.VITE_NETWORK || 'devnet'
const RPC_URLS = {
  mainnet: 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com'
}

const TOKEN_MINTS = {
  mainnet: import.meta.env.VITE_MAINNET_TOKEN_MINT || '4kU3B6hvnMEWNZadKWkQatky8fBgDLt7R9HwoysVpump',
  devnet: import.meta.env.VITE_DEVNET_TOKEN_MINT || 'So11111111111111111111111111111111111111112'
}

const TREASURY_WALLETS = {
  mainnet: import.meta.env.VITE_MAINNET_TREASURY || 'YourMainnetTreasuryWalletHere',
  devnet: import.meta.env.VITE_DEVNET_TREASURY || 'YourDevnetTreasuryWalletHere'
}

const DEMPLAR_MINT = new PublicKey(TOKEN_MINTS[NETWORK])
const TREASURY_WALLET = new PublicKey(TREASURY_WALLETS[NETWORK])
const SOLANA_RPC_URL = RPC_URLS[NETWORK]

// Area themes with different climates/landscapes
const AREA_THEMES = {
  8: { name: "Grasslands", bg: "linear-gradient(135deg, #4ade80 0%, #22c55e 100%)", emoji: "🌱", desc: "Rolling green meadows" },
  9: { name: "Desert Oasis", bg: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)", emoji: "🏜️", desc: "Sandy dunes with hidden springs" },
  10: { name: "Frozen Tundra", bg: "linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)", emoji: "🧊", desc: "Icy wilderness with aurora skies" },
  11: { name: "Volcanic Fields", bg: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", emoji: "🌋", desc: "Molten rock and lava flows" },
  12: { name: "Crystal Caves", bg: "linear-gradient(135deg, #a855f7 0%, #9333ea 100%)", emoji: "💎", desc: "Shimmering underground caverns" },
  13: { name: "Cloud Forest", bg: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)", emoji: "☁️", desc: "Misty highlands above the clouds" },
  14: { name: "Mystic Swamp", bg: "linear-gradient(135deg, #10b981 0%, #059669 100%)", emoji: "🐸", desc: "Ancient wetlands full of secrets" },
  15: { name: "Stellar Plains", bg: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)", emoji: "⭐", desc: "Cosmic fields under starlit skies" }
}

function App() {
  const [connection] = useState(new Connection(SOLANA_RPC_URL))
  const [wallet, setWallet] = useState(null)
  const [balance, setBalance] = useState(0)
  const [demplarBalance, setDemplarBalance] = useState(0)
  const [solToUsd, setSolToUsd] = useState(0)
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('SOL')
  const [newAreaAnimating, setNewAreaAnimating] = useState(false)
  
  // Enhanced land data structure
  const [landData, setLandData] = useState({
    areas: [
      {
        areaNumber: 8,
        theme: AREA_THEMES[8],
        plots: Array.from({length: 9}, (_, i) => ({
          area: 8,
          plotNumber: i + 2,
          id: `8-${i + 2}`,
          owned: false,
          owner: null,
          purchaseOrder: null,
          transactionSignature: null,
          purchaseTimestamp: null,
          price: null,
          paymentMethod: null
        })),
        isComplete: false,
        completedAt: null
      }
    ],
    currentArea: 8,
    nextPlotToPurchase: `8-2`, // Sequential purchasing
    totalPurchases: 0
  })

  const areaRefs = useRef({})

  const calculatePrice = (area) => {
    const basePrice = (area - 1) * 0.1 + 0.1
    return NETWORK === 'devnet' ? basePrice * 0.01 : basePrice
  }

  const calculateDemplarAmount = (solAmount) => {
    return solAmount * solToUsd
  }

  // Get current area data
  const getCurrentArea = () => {
    return landData.areas.find(area => area.areaNumber === landData.currentArea)
  }

  // Get next available plot for purchase
  const getNextAvailablePlot = () => {
    const currentArea = getCurrentArea()
    if (!currentArea) return null
    
    const nextPlot = currentArea.plots.find(plot => plot.id === landData.nextPlotToPurchase)
    return nextPlot && !nextPlot.owned ? nextPlot : null
  }

  // Persist data to localStorage (blockchain integration would replace this)
  const persistLandData = (data) => {
    try {
      // In a real implementation, this would sync with blockchain
      const persistData = {
        ...data,
        lastUpdated: Date.now(),
        network: NETWORK
      }
      // For now, just keep in memory (localStorage not available in artifacts)
      console.log('Land data persisted:', persistData)
    } catch (error) {
      console.error('Failed to persist land data:', error)
    }
  }

  // Load blockchain data (placeholder for real blockchain queries)
  const loadBlockchainData = async () => {
    try {
      // This would query the blockchain for existing land purchases
      // For now, return empty data
      console.log('Loading blockchain data...')
      return null
    } catch (error) {
      console.error('Failed to load blockchain data:', error)
      return null
    }
  }

  // Animate new area appearance
  const animateNewArea = (areaNumber) => {
    setNewAreaAnimating(true)
    
    setTimeout(() => {
      const areaElement = areaRefs.current[areaNumber]
      if (areaElement) {
        areaElement.style.opacity = '0'
        areaElement.style.transform = 'translateY(50px) scale(0.9)'
        areaElement.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
        
        setTimeout(() => {
          areaElement.style.opacity = '1'
          areaElement.style.transform = 'translateY(0) scale(1)'
        }, 100)
      }
      
      setTimeout(() => {
        setNewAreaAnimating(false)
      }, 1000)
    }, 500)
  }

  // Purchase land plot (sequential only)
  const purchaseLand = async () => {
    if (!wallet) {
      alert('Please connect your wallet first!')
      return
    }

    const nextPlot = getNextAvailablePlot()
    if (!nextPlot) {
      alert('No plots available for purchase in the current sequence!')
      return
    }

    const currentArea = getCurrentArea()
    const currentPrice = calculatePrice(currentArea.areaNumber)

    setLoading(true)
    try {
      let transaction = new Transaction()
      
      if (paymentMethod === 'SOL') {
        const lamports = currentPrice * LAMPORTS_PER_SOL
        
        if (balance < currentPrice) {
          alert(`Insufficient SOL balance! Need ${currentPrice} SOL`)
          setLoading(false)
          return
        }

        transaction.add(
          SystemProgram.transfer({
            fromPubkey: wallet,
            toPubkey: TREASURY_WALLET,
            lamports: lamports
          })
        )
      } else {
        const demplarAmount = calculateDemplarAmount(currentPrice)
        
        if (demplarBalance < demplarAmount) {
          alert(`Insufficient DEMPLAR balance! Need ${demplarAmount.toFixed(2)} DEMPLAR`)
          setLoading(false)
          return
        }

        try {
          const userTokenAccount = await getAssociatedTokenAddress(DEMPLAR_MINT, wallet)
          const treasuryTokenAccount = await getAssociatedTokenAddress(DEMPLAR_MINT, TREASURY_WALLET)
          const decimals = NETWORK === 'devnet' ? 9 : 6
          const tokenAmount = Math.floor(demplarAmount * Math.pow(10, decimals))

          transaction.add(
            createTransferInstruction(
              userTokenAccount,
              treasuryTokenAccount,
              wallet,
              tokenAmount,
              [],
              TOKEN_PROGRAM_ID
            )
          )
        } catch (error) {
          alert('Error setting up DEMPLAR payment. Make sure you have DEMPLAR tokens!')
          setLoading(false)
          return
        }
      }

      // Execute transaction
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = wallet

      const signedTransaction = await window.solana.signTransaction(transaction)
      const signature = await connection.sendRawTransaction(signedTransaction.serialize())
      await connection.confirmTransaction(signature, 'confirmed')

      // Update land data with purchase
      setLandData(prev => {
        const newData = { ...prev }
        const areaIndex = newData.areas.findIndex(a => a.areaNumber === currentArea.areaNumber)
        const plotIndex = newData.areas[areaIndex].plots.findIndex(p => p.id === nextPlot.id)
        
        // Update the purchased plot
        newData.areas[areaIndex].plots[plotIndex] = {
          ...nextPlot,
          owned: true,
          owner: wallet.toString(),
          purchaseOrder: newData.totalPurchases + 1,
          transactionSignature: signature,
          purchaseTimestamp: Date.now(),
          price: currentPrice,
          paymentMethod: paymentMethod
        }

        newData.totalPurchases += 1

        // Check if area is complete
        const areaPlots = newData.areas[areaIndex].plots
        const allOwned = areaPlots.every(p => p.owned)
        
        if (allOwned) {
          // Mark current area as complete
          newData.areas[areaIndex].isComplete = true
          newData.areas[areaIndex].completedAt = Date.now()
          
          // Create next area
          const nextAreaNumber = currentArea.areaNumber + 1
          const nextAreaTheme = AREA_THEMES[nextAreaNumber] || {
            name: `Area ${nextAreaNumber}`,
            bg: "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
            emoji: "🏔️",
            desc: "Uncharted territory"
          }

          newData.areas.push({
            areaNumber: nextAreaNumber,
            theme: nextAreaTheme,
            plots: Array.from({length: 10}, (_, i) => ({
              area: nextAreaNumber,
              plotNumber: i + 1,
              id: `${nextAreaNumber}-${i + 1}`,
              owned: false,
              owner: null,
              purchaseOrder: null,
              transactionSignature: null,
              purchaseTimestamp: null,
              price: null,
              paymentMethod: null
            })),
            isComplete: false,
            completedAt: null
          })

          newData.currentArea = nextAreaNumber
          newData.nextPlotToPurchase = `${nextAreaNumber}-1`
          
          // Trigger animation for new area
          setTimeout(() => animateNewArea(nextAreaNumber), 100)
        } else {
          // Set next plot in sequence
          const nextPlotIndex = plotIndex + 1
          if (nextPlotIndex < areaPlots.length) {
            newData.nextPlotToPurchase = areaPlots[nextPlotIndex].id
          }
        }

        persistLandData(newData)
        return newData
      })

      // Update balances
      if (paymentMethod === 'SOL') {
        const newBalance = await connection.getBalance(wallet)
        setBalance(newBalance / LAMPORTS_PER_SOL)
      } else {
        const newDemplarBalance = await getDemplarBalance(wallet)
        setDemplarBalance(newDemplarBalance)
      }

      alert(`Successfully purchased plot ${nextPlot.id} with ${paymentMethod}! Transaction: ${signature}`)
      
    } catch (error) {
      console.error('Transaction failed:', error)
      alert(`Transaction failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Wallet functions (same as before)
  const requestAirdrop = async () => {
    if (NETWORK !== 'devnet' || !wallet) {
      alert('Airdrop only available on devnet!')
      return
    }

    try {
      setLoading(true)
      const signature = await connection.requestAirdrop(wallet, 1 * LAMPORTS_PER_SOL)
      await connection.confirmTransaction(signature, 'confirmed')
      const newBalance = await connection.getBalance(wallet)
      setBalance(newBalance / LAMPORTS_PER_SOL)
      alert('Airdropped 1 SOL for testing!')
    } catch (error) {
      console.error('Airdrop failed:', error)
      alert('Airdrop failed. You may have reached the rate limit.')
    } finally {
      setLoading(false)
    }
  }

  const fetchSolPrice = async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
      const data = await response.json()
      setSolToUsd(data.solana.usd)
    } catch (error) {
      console.error('Failed to fetch SOL price:', error)
      setSolToUsd(100)
    }
  }

  const getDemplarBalance = async (walletAddress) => {
    try {
      const associatedTokenAddress = await getAssociatedTokenAddress(DEMPLAR_MINT, walletAddress)
      const tokenAccount = await connection.getTokenAccountBalance(associatedTokenAddress)
      return tokenAccount.value.uiAmount || 0
    } catch (error) {
      console.log('No DEMPLAR token account found or error:', error)
      return 0
    }
  }

  const connectWallet = async () => {
    try {
      if (!window.solana) {
        alert('Please install Phantom wallet!')
        return
      }

      const response = await window.solana.connect()
      setWallet(response.publicKey)
      
      const balance = await connection.getBalance(response.publicKey)
      setBalance(balance / LAMPORTS_PER_SOL)

      const demplarBal = await getDemplarBalance(response.publicKey)
      setDemplarBalance(demplarBal)
      
    } catch (error) {
      console.error('Wallet connection failed:', error)
    }
  }

  const disconnectWallet = () => {
    if (window.solana) {
      window.solana.disconnect()
      setWallet(null)
      setBalance(0)
      setDemplarBalance(0)
    }
  }

  useEffect(() => {
    fetchSolPrice()
    loadBlockchainData()
    
    const autoConnect = async () => {
      if (window.solana && window.solana.isConnected) {
        try {
          const response = await window.solana.connect({ onlyIfTrusted: true })
          setWallet(response.publicKey)
          const balance = await connection.getBalance(response.publicKey)
          setBalance(balance / LAMPORTS_PER_SOL)
          
          const demplarBal = await getDemplarBalance(response.publicKey)
          setDemplarBalance(demplarBal)
        } catch (error) {
          console.log('Auto-connect failed:', error)
        }
      }
    }
    autoConnect()
  }, [connection])

  const nextPlot = getNextAvailablePlot()
  const currentPrice = nextPlot ? calculatePrice(nextPlot.area) : 0
  const demplarEquivalent = calculateDemplarAmount(currentPrice)

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: NETWORK === 'devnet' 
        ? 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' 
        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      color: 'white'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Network Banner */}
        <div style={{ 
          background: NETWORK === 'devnet' ? 'rgba(255, 152, 0, 0.3)' : 'rgba(0, 0, 0, 0.2)', 
          padding: '10px', 
          borderRadius: '10px', 
          textAlign: 'center', 
          marginBottom: '20px',
          border: NETWORK === 'devnet' ? '2px solid #ff9800' : '2px solid rgba(255,255,255,0.2)'
        }}>
          <h3 style={{ margin: 0 }}>
            {NETWORK === 'devnet' ? '🧪 DEVNET - TESTING MODE' : '🌐 MAINNET - LIVE'}
          </h3>
          <p style={{ margin: '5px 0', fontSize: '0.9rem' }}>
            Sequential Land Purchasing • Total Purchases: {landData.totalPurchases}
          </p>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '10px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
            🗺️ Solana Land Expansion
          </h1>
          <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
            Sequential land ownership • Expanding blockchain territories
          </p>
        </div>

        {/* Wallet & Purchase Section */}
        <div style={{ 
          background: 'rgba(255,255,255,0.1)', 
          backdropFilter: 'blur(10px)',
          borderRadius: '15px', 
          padding: '20px', 
          marginBottom: '30px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              {wallet ? (
                <div>
                  <p><strong>Connected:</strong> {wallet.toString().slice(0, 8)}...{wallet.toString().slice(-8)}</p>
                  <p><strong>SOL Balance:</strong> {balance.toFixed(4)} SOL</p>
                  <p><strong>DEMPLAR Balance:</strong> {demplarBalance.toFixed(2)} DEMPLAR</p>
                </div>
              ) : (
                <p>Connect your wallet to purchase land</p>
              )}
            </div>
            
            {/* Next Purchase Info */}
            {nextPlot && (
              <div style={{ 
                background: 'rgba(34, 197, 94, 0.2)', 
                border: '2px solid #22c55e',
                borderRadius: '10px', 
                padding: '15px',
                textAlign: 'center',
                minWidth: '200px'
              }}>
                <h4 style={{ margin: '0 0 10px 0' }}>Next Purchase</h4>
                <p style={{ margin: '0', fontSize: '1.1rem', fontWeight: 'bold' }}>
                  Plot {nextPlot.id}
                </p>
                <p style={{ margin: '5px 0', fontSize: '0.9rem' }}>
                  {paymentMethod === 'SOL' 
                    ? `${currentPrice} SOL` 
                    : `${demplarEquivalent.toFixed(2)} DEMPLAR`}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {NETWORK === 'devnet' && wallet && (
                <button 
                  onClick={requestAirdrop}
                  disabled={loading}
                  style={{
                    background: '#ff9800',
                    color: 'white',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  {loading ? '⏳ Airdropping...' : '💰 Get Test SOL'}
                </button>
              )}
              
              <select 
                value={paymentMethod} 
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontSize: '14px'
                }}
              >
                <option value="SOL" style={{ color: 'black' }}>Pay with SOL</option>
                <option value="DEMPLAR" style={{ color: 'black' }}>Pay with DEMPLAR</option>
              </select>

              {/* Sequential Purchase Button */}
              <button
                onClick={purchaseLand}
                disabled={loading || !wallet || !nextPlot}
                style={{
                  background: loading || !wallet || !nextPlot
                    ? 'rgba(255,255,255,0.3)' 
                    : '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '15px 30px',
                  borderRadius: '8px',
                  cursor: loading || !wallet || !nextPlot ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                {loading ? '⏳ Processing...' : nextPlot ? `🛒 Buy Plot ${nextPlot.id}` : '✅ All Current Plots Owned'}
              </button>
              
              {wallet ? (
                <button 
                  onClick={disconnectWallet}
                  style={{
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  Disconnect
                </button>
              ) : (
                <button 
                  onClick={connectWallet}
                  style={{
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Expanding Land Map */}
        <div style={{ marginBottom: '30px' }}>
          {landData.areas.map((area, areaIndex) => (
            <div key={area.areaNumber}>
              {/* Area Separator Line (except for first area) */}
              {areaIndex > 0 && (
                <div style={{
                  height: '4px',
                  background: 'linear-gradient(90deg, transparent 0%, #ffffff 50%, transparent 100%)',
                  margin: '40px 0',
                  borderRadius: '2px',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-15px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(255,255,255,0.9)',
                    color: '#1f2937',
                    padding: '5px 15px',
                    borderRadius: '15px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    EXPANSION
                  </div>
                </div>
              )}

              {/* Area Header */}
              <div 
                ref={el => areaRefs.current[area.areaNumber] = el}
                style={{ 
                  background: area.theme.bg,
                  borderRadius: '15px 15px 0 0', 
                  padding: '20px', 
                  marginBottom: '0',
                  textAlign: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.3)',
                  zIndex: 1
                }}></div>
                <div style={{ position: 'relative', zIndex: 2 }}>
                  <h2 style={{ margin: '0 0 10px 0', fontSize: '2rem' }}>
                    {area.theme.emoji} {area.theme.name} - Area {area.areaNumber}
                  </h2>
                  <p style={{ margin: '0 0 15px 0', opacity: 0.9 }}>
                    {area.theme.desc}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
                    <p><strong>Price:</strong> {calculatePrice(area.areaNumber)} SOL</p>
                    <p><strong>Plots:</strong> {area.plots.filter(p => p.owned).length}/{area.plots.length}</p>
                    {area.isComplete && (
                      <p style={{ color: '#10b981' }}>
                        <strong>✅ COMPLETE</strong>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Area Plots Grid */}
              <div style={{ 
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '0 0 15px 15px',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '15px'
                }}>
                  {area.plots.map((plot, plotIndex) => {
                    const isNext = plot.id === landData.nextPlotToPurchase
                    const isOwned = plot.owned
                    const isAvailable = !isOwned && !isNext && plotIndex === 0 // Only first unowned plot is available
                    
                    return (
                      <div 
                        key={plot.id}
                        style={{
                          background: isOwned 
                            ? 'rgba(239, 68, 68, 0.3)' 
                            : isNext 
                              ? 'rgba(34, 197, 94, 0.3)'
                              : 'rgba(107, 114, 128, 0.3)',
                          border: isOwned 
                            ? '2px solid #ef4444' 
                            : isNext 
                              ? '3px solid #22c55e'
                              : '2px solid #6b7280',
                          borderRadius: '12px',
                          padding: '15px',
                          textAlign: 'center',
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          opacity: isNext ? 1 : isOwned ? 0.9 : 0.6
                        }}
                      >
                        {isNext && (
                          <div style={{
                            position: 'absolute',
                            top: '-5px',
                            right: '-5px',
                            background: '#22c55e',
                            color: 'white',
                            borderRadius: '50%',
                            width: '25px',
                            height: '25px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            animation: 'pulse 2s infinite'
                          }}>
                            ⚡
                          </div>
                        )}
                        
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '1.1rem' }}>
                          📍 Plot {plot.id}
                        </h4>
                        
                        {isOwned ? (
                          <div>
                            <p style={{ color: '#ef4444', fontWeight: 'bold', margin: '0 0 5px 0' }}>
                              OWNED #{plot.purchaseOrder}
                            </p>
                            <p style={{ fontSize: '0.7rem', opacity: 0.8, margin: '0' }}>
                              {plot.owner?.slice(0, 6)}...{plot.owner?.slice(-4)}
                            </p>
                            <p style={{ fontSize: '0.7rem', opacity: 0.6, margin: '5px 0 0 0' }}>
                              {plot.price} {plot.paymentMethod}
                            </p>
                          </div>
                        ) : isNext ? (
                          <div>
                            <p style={{ color: '#22c55e', fontWeight: 'bold', margin: '0 0 10px 0' }}>
                              NEXT TO PURCHASE
                            </p>
                            <p style={{ fontSize: '0.9rem', margin: '0' }}>
                              {paymentMethod === 'SOL' 
                                ? `${calculatePrice(plot.area)} SOL` 
                                : `${calculateDemplarAmount(calculatePrice(plot.area)).toFixed(2)} DEMPLAR`}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p style={{ color: '#6b7280', fontWeight: 'bold', margin: '0 0 10px 0' }}>
                              LOCKED
                            </p>
                            <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                              Purchase in sequence
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Purchase Progress */}
        <div style={{ 
          background: 'rgba(255,255,255,0.1)', 
          borderRadius: '15px', 
          padding: '20px',
          marginBottom: '30px'
        }}>
          <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>Purchase Progress</h3>
          
          {/* Progress Bar */}
          <div style={{ 
            background: 'rgba(0,0,0,0.3)', 
            borderRadius: '10px', 
            height: '20px',
            marginBottom: '15px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              background: 'linear-gradient(90deg, #10b981, #22c55e)',
              height: '100%',
              width: `${(landData.totalPurchases / (landData.areas.reduce((acc, area) => acc + area.plots.length, 0))) * 100}%`,
              transition: 'width 0.5s ease',
              borderRadius: '10px'
            }}></div>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '12px',
              fontWeight: 'bold',
              color: 'white',
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
            }}>
              {landData.totalPurchases} / {landData.areas.reduce((acc, area) => acc + area.plots.length, 0)} plots
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            {landData.areas.map(area => (
              <div key={area.areaNumber} style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '10px',
                padding: '15px',
                textAlign: 'center'
              }}>
                <h4 style={{ margin: '0 0 10px 0' }}>
                  {area.theme.emoji} Area {area.areaNumber}
                </h4>
                <div style={{
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '5px',
                  height: '10px',
                  overflow: 'hidden',
                  marginBottom: '10px'
                }}>
                  <div style={{
                    background: area.isComplete 
                      ? 'linear-gradient(90deg, #10b981, #22c55e)'
                      : area.areaNumber === landData.currentArea
                        ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                        : 'rgba(107, 114, 128, 0.5)',
                    height: '100%',
                    width: `${(area.plots.filter(p => p.owned).length / area.plots.length) * 100}%`,
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
                <p style={{ margin: '0', fontSize: '0.8rem' }}>
                  {area.plots.filter(p => p.owned).length}/{area.plots.length} plots
                </p>
                {area.isComplete && (
                  <p style={{ margin: '5px 0 0 0', fontSize: '0.7rem', color: '#10b981' }}>
                    ✅ Complete
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Blockchain Data Summary */}
        <div style={{ 
          background: 'rgba(255,255,255,0.1)', 
          borderRadius: '15px', 
          padding: '20px',
          marginBottom: '30px'
        }}>
          <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>Blockchain Land Registry</h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '15px',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {landData.areas.flatMap(area => 
              area.plots.filter(plot => plot.owned)
            ).sort((a, b) => a.purchaseOrder - b.purchaseOrder).map(plot => (
              <div key={plot.id} style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                padding: '12px',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h5 style={{ margin: '0', color: '#10b981' }}>
                    Plot {plot.id} #{plot.purchaseOrder}
                  </h5>
                  <span style={{ 
                    background: 'rgba(34, 197, 94, 0.2)',
                    color: '#10b981',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.7rem',
                    fontWeight: 'bold'
                  }}>
                    OWNED
                  </span>
                </div>
                <p style={{ margin: '5px 0', fontSize: '0.7rem', opacity: 0.8 }}>
                  Owner: {plot.owner?.slice(0, 8)}...{plot.owner?.slice(-8)}
                </p>
                <p style={{ margin: '5px 0', fontSize: '0.7rem', opacity: 0.8 }}>
                  Price: {plot.price} {plot.paymentMethod}
                </p>
                <p style={{ margin: '5px 0', fontSize: '0.7rem', opacity: 0.6 }}>
                  TX: {plot.transactionSignature?.slice(0, 8)}...{plot.transactionSignature?.slice(-8)}
                </p>
                <p style={{ margin: '5px 0 0 0', fontSize: '0.6rem', opacity: 0.5 }}>
                  {new Date(plot.purchaseTimestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          {landData.totalPurchases === 0 && (
            <p style={{ textAlign: 'center', opacity: 0.6, fontStyle: 'italic' }}>
              No land purchases yet. Connect your wallet and start building your territory!
            </p>
          )}
        </div>

        {/* How It Works */}
        <div style={{ 
          background: 'rgba(255,255,255,0.1)', 
          borderRadius: '15px', 
          padding: '20px',
          textAlign: 'center'
        }}>
          <h3>How Sequential Land Ownership Works</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '20px' }}>
            <div>
              <h4 style={{ color: '#22c55e' }}>🎯 Sequential Purchase</h4>
              <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                Land must be purchased in order. Only the next plot in sequence is available for purchase.
              </p>
            </div>
            <div>
              <h4 style={{ color: '#3b82f6' }}>⛓️ Blockchain Locked</h4>
              <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                Each purchase is permanently recorded on Solana with transaction signatures and timestamps.
              </p>
            </div>
            <div>
              <h4 style={{ color: '#f59e0b' }}>🗺️ Expanding World</h4>
              <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                Complete an area to unlock the next region with new themes and landscapes.
              </p>
            </div>
            <div>
              <h4 style={{ color: '#8b5cf6' }}>💰 Fair Pricing</h4>
              <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                Each area has a fixed price that increases as you explore new territories.
              </p>
            </div>
          </div>
          
          {NETWORK === 'devnet' && (
            <div style={{ 
              marginTop: '20px', 
              padding: '15px', 
              background: 'rgba(255, 152, 0, 0.2)', 
              borderRadius: '10px',
              border: '1px solid #ff9800'
            }}>
              <p style={{ margin: '0', fontSize: '0.9rem', color: '#ffeb3b' }}>
                🧪 DEVNET TESTING: Prices are 1% of mainnet values. Use "Get Test SOL" for free testing tokens!
              </p>
            </div>
          )}
          
          <div style={{ marginTop: '20px', fontSize: '0.8rem', opacity: 0.6 }}>
            <p style={{ margin: '5px 0' }}>
              DEMPLAR Token: {DEMPLAR_MINT.toString()}
            </p>
            <p style={{ margin: '5px 0' }}>
              Treasury: {TREASURY_WALLET.toString().slice(0, 16)}...{TREASURY_WALLET.toString().slice(-16)}
            </p>
            <p style={{ margin: '5px 0' }}>
              Network: {NETWORK.toUpperCase()} | Total Land Registry Entries: {landData.totalPurchases}
            </p>
          </div>
        </div>
      </div>

      {/* CSS Animation for pulse effect */}
      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default App;
