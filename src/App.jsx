import React, { useState, useEffect, useRef } from 'react'

// Network configuration
const NETWORK = 'devnet'
const RPC_URLS = {
  mainnet: 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com'
}

// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api'

// Token and treasury configuration
const TOKEN_MINTS = {
  mainnet: '4kU3B6hvnMEWNZadKWkQatky8fBgDLt7R9HwoysVpump',
  devnet: 'So11111111111111111111111111111111111111112'
}

const TREASURY_WALLETS = {
  mainnet: '11111111111111111111111111111112',
  devnet: '11111111111111111111111111111112'
}

// Climate themes for different areas
const CLIMATE_THEMES = {
  8: {
    name: "Temperate Forests",
    emoji: "🌲",
    background: "linear-gradient(135deg, #2d5016 0%, #4a7c59 50%, #6b8e23 100%)",
    accent: "#4a7c59",
    description: "Lush green forests with towering pines"
  },
  9: {
    name: "Desert Oasis", 
    emoji: "🏜️",
    background: "linear-gradient(135deg, #daa520 0%, #cd853f 50%, #f4a460 100%)",
    accent: "#cd853f",
    description: "Golden sands with hidden water sources"
  },
  10: {
    name: "Arctic Tundra",
    emoji: "❄️", 
    background: "linear-gradient(135deg, #87ceeb 0%, #b0e0e6 50%, #f0f8ff 100%)",
    accent: "#87ceeb",
    description: "Frozen landscapes with crystal formations"
  },
  11: {
    name: "Volcanic Peaks",
    emoji: "🌋",
    background: "linear-gradient(135deg, #8b0000 0%, #ff4500 50%, #ff6347 100%)", 
    accent: "#ff4500",
    description: "Fiery mountains with lava flows"
  }
}

function App() {
  const [connection, setConnection] = useState(null)
  const [wallet, setWallet] = useState(null)
  const [balance, setBalance] = useState(0)
  const [demplarBalance, setDemplarBalance] = useState(0)
  const [solToUsd, setSolToUsd] = useState(0)
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('SOL')
  const [animatingNewArea, setAnimatingNewArea] = useState(false)
  const [solanaLoaded, setSolanaLoaded] = useState(false)
  const [landData, setLandData] = useState({
    areas: {},
    currentArea: 8,
    maxAreaReached: 8
  })
  const [purchaseHistory, setPurchaseHistory] = useState([])
  const [apiError, setApiError] = useState(null)
  
  const newAreaRef = useRef(null)

  // API Helper Functions
  const fetchLandData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/land-data`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setLandData(data)
      setApiError(null)
    } catch (error) {
      console.error('Error fetching land data:', error)
      setApiError('Failed to load land data from server')
    }
  }

  const fetchPurchaseHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-history`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setPurchaseHistory(data)
    } catch (error) {
      console.error('Error fetching purchase history:', error)
    }
  }

  // Load Solana Web3.js dynamically
  useEffect(() => {
    const loadSolana = async () => {
      try {
        // Load Solana Web3.js from CDN
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js'
        script.onload = () => {
          setSolanaLoaded(true)
          // Initialize connection after Solana is loaded
          const conn = new window.solanaWeb3.Connection(RPC_URLS[NETWORK])
          setConnection(conn)
        }
        script.onerror = (error) => {
          console.error('Failed to load Solana Web3.js:', error)
        }
        document.head.appendChild(script)
      } catch (error) {
        console.error('Error loading Solana:', error)
      }
    }
    
    loadSolana()
  }, [])

  // Load initial data from server
  useEffect(() => {
    fetchLandData()
    fetchPurchaseHistory()
    fetchSolPrice()
  }, [])

  // Calculate price based on area
  const calculatePrice = (area) => {
    const basePrice = (area - 1) * 0.1 + 0.1
    return NETWORK === 'devnet' ? basePrice * 0.01 : basePrice
  }

  // Fetch SOL price
  const fetchSolPrice = async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
      const data = await response.json()
      setSolToUsd(data.solana?.usd || 100)
    } catch (error) {
      console.error('Failed to fetch SOL price:', error)
      setSolToUsd(100)
    }
  }

  // Get DEMPLAR token balance
  const getDemplarBalance = async (walletAddress) => {
    if (!solanaLoaded || !connection) return 0
    
    try {
      // This is a simplified version - in reality you'd need SPL Token imports
      // For now, return 0 as we're focusing on SOL transactions
      return 0
    } catch (error) {
      return 0
    }
  }

  // Connect wallet
  const connectWallet = async () => {
    try {
      if (!window.solana) {
        alert('Please install Phantom wallet!')
        return
      }

      const response = await window.solana.connect()
      setWallet(response.publicKey)
      
      if (connection) {
        const balance = await connection.getBalance(response.publicKey)
        setBalance(balance / window.solanaWeb3.LAMPORTS_PER_SOL)

        const demplarBal = await getDemplarBalance(response.publicKey)
        setDemplarBalance(demplarBal)
      }
      
    } catch (error) {
      console.error('Wallet connection failed:', error)
    }
  }

  // Disconnect wallet
  const disconnectWallet = () => {
    if (window.solana) {
      window.solana.disconnect()
      setWallet(null)
      setBalance(0)
      setDemplarBalance(0)
    }
  }

  // Request airdrop for devnet
  const requestAirdrop = async () => {
    if (NETWORK !== 'devnet' || !wallet || !connection || !solanaLoaded) {
      alert('Airdrop only available on devnet!')
      return
    }

    try {
      setLoading(true)
      const signature = await connection.requestAirdrop(wallet, 1 * window.solanaWeb3.LAMPORTS_PER_SOL)
      await connection.confirmTransaction(signature, 'confirmed')
      
      const newBalance = await connection.getBalance(wallet)
      setBalance(newBalance / window.solanaWeb3.LAMPORTS_PER_SOL)
      
      alert('Airdropped 1 SOL for testing!')
    } catch (error) {
      console.error('Airdrop failed:', error)
      alert('Airdrop failed. You may have reached the rate limit.')
    } finally {
      setLoading(false)
    }
  }

  // Calculate DEMPLAR equivalent
  const calculateDemplarAmount = (solAmount) => {
    const usdAmount = solAmount * solToUsd
    return usdAmount
  }

  // Purchase land plot - now with server-side validation
  const purchaseLand = async (plotId) => {
    if (!wallet) {
      alert('Please connect your wallet first!')
      return
    }

    if (!solanaLoaded || !connection) {
      alert('Solana is still loading, please wait...')
      return
    }

    const [areaStr, plotStr] = plotId.split('-')
    const area = parseInt(areaStr)
    
    setLoading(true)
    try {
      const currentPrice = calculatePrice(area)
      
      if (paymentMethod === 'SOL') {
        const lamports = currentPrice * window.solanaWeb3.LAMPORTS_PER_SOL
        
        if (balance < currentPrice) {
          alert(`Insufficient SOL balance! Need ${currentPrice} SOL`)
          setLoading(false)
          return
        }

        const TREASURY_WALLET = new window.solanaWeb3.PublicKey(TREASURY_WALLETS[NETWORK])
        
        let transaction = new window.solanaWeb3.Transaction()
        transaction.add(
          window.solanaWeb3.SystemProgram.transfer({
            fromPubkey: wallet,
            toPubkey: TREASURY_WALLET,
            lamports: lamports
          })
        )

        const { blockhash } = await connection.getLatestBlockhash()
        transaction.recentBlockhash = blockhash
        transaction.feePayer = wallet

        const signedTransaction = await window.solana.signTransaction(transaction)
        const signature = await connection.sendRawTransaction(signedTransaction.serialize())
        
        await connection.confirmTransaction(signature, 'confirmed')

        // Submit purchase to server
        const purchaseResponse = await fetch(`${API_BASE_URL}/purchase-plot`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            plotId,
            ownerAddress: wallet.toString(),
            transactionSignature: signature,
            price: currentPrice,
            paymentMethod: paymentMethod
          })
        })

        const purchaseResult = await purchaseResponse.json()

        if (!purchaseResponse.ok) {
          throw new Error(purchaseResult.error || 'Server error')
        }

        // Refresh data from server
        await fetchLandData()
        await fetchPurchaseHistory()

        // Update balance
        const newBalance = await connection.getBalance(wallet)
        setBalance(newBalance / window.solanaWeb3.LAMPORTS_PER_SOL)

        if (purchaseResult.newAreaCreated) {
          setAnimatingNewArea(true)
          setTimeout(() => {
            setAnimatingNewArea(false)
            // Scroll to new area
            setTimeout(() => {
              if (newAreaRef.current) {
                newAreaRef.current.scrollIntoView({ behavior: 'smooth' })
              }
            }, 100)
          }, 2000)
        }

        alert(`Successfully purchased plot ${plotId}! Transaction: ${signature}`)
        
      } else {
        alert('DEMPLAR payments not yet implemented in this version. Please use SOL.')
      }
      
    } catch (error) {
      console.error('Transaction failed:', error)
      alert(`Transaction failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Auto-connect wallet on load
  useEffect(() => {
    const autoConnect = async () => {
      if (window.solana && window.solana.isConnected && connection) {
        try {
          const response = await window.solana.connect({ onlyIfTrusted: true })
          setWallet(response.publicKey)
          const balance = await connection.getBalance(response.publicKey)
          setBalance(balance / window.solanaWeb3.LAMPORTS_PER_SOL)
          
          const demplarBal = await getDemplarBalance(response.publicKey)
          setDemplarBalance(demplarBal)
        } catch (error) {
          console.log('Auto-connect failed:', error)
        }
      }
    }
    
    if (solanaLoaded && connection) {
      autoConnect()
    }
  }, [connection, solanaLoaded])

  // Get current theme
  const getCurrentTheme = () => {
    return CLIMATE_THEMES[landData.currentArea] || CLIMATE_THEMES[8]
  }

  const currentTheme = getCurrentTheme()

  // Show loading screen while Solana is loading
  if (!solanaLoaded) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #2d5016 0%, #4a7c59 50%, #6b8e23 100%)',
        color: 'white',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🏞️</div>
          <h2>Loading Sequential Land Empire...</h2>
          <p>Initializing Solana connection...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: currentTheme.background,
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      transition: 'background 3s ease-in-out'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', color: 'white' }}>
        
        {/* API Error Banner */}
        {apiError && (
          <div style={{
            background: 'rgba(255, 0, 0, 0.3)',
            border: '2px solid #ff4757',
            borderRadius: '15px',
            padding: '15px',
            textAlign: 'center',
            marginBottom: '20px',
            backdropFilter: 'blur(10px)'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#ff4757' }}>⚠️ Server Connection Error</h3>
            <p style={{ margin: '0', opacity: 0.9 }}>{apiError}</p>
            <button 
              onClick={() => window.location.reload()}
              style={{
                background: '#ff4757',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              Reload Page
            </button>
          </div>
        )}
        
        {/* Network Banner */}
        <div style={{ 
          background: NETWORK === 'devnet' ? 'rgba(255, 152, 0, 0.3)' : 'rgba(0, 0, 0, 0.2)', 
          padding: '15px', 
          borderRadius: '15px', 
          textAlign: 'center', 
          marginBottom: '30px',
          border: `2px solid ${currentTheme.accent}`,
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.5rem' }}>
            {currentTheme.emoji} {currentTheme.name} - {NETWORK.toUpperCase()}
          </h3>
          <p style={{ margin: '8px 0', fontSize: '1rem', opacity: 0.9 }}>
            {currentTheme.description}
          </p>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ 
            fontSize: '3.5rem', 
            marginBottom: '15px', 
            textShadow: '3px 3px 6px rgba(0,0,0,0.5)',
            color: 'white'
          }}>
            🏞️ Sequential Land Empire
          </h1>
          <p style={{ fontSize: '1.3rem', opacity: 0.9, marginBottom: '10px' }}>
            Build your empire one plot at a time - Forever ownership guaranteed!
          </p>
          <p style={{ fontSize: '1rem', opacity: 0.7 }}>
            SOL: ${solToUsd.toFixed(2)} USD
          </p>
        </div>

        {/* Wallet Section */}
        <div style={{ 
          background: 'rgba(255,255,255,0.15)', 
          backdropFilter: 'blur(15px)',
          borderRadius: '20px', 
          padding: '25px', 
          marginBottom: '40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div>
            {wallet ? (
              <div>
                <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>
                  <strong>Connected:</strong> {wallet.toString().slice(0, 8)}...{wallet.toString().slice(-8)}
                </p>
                <p style={{ margin: '5px 0' }}><strong>SOL:</strong> {balance.toFixed(4)} SOL</p>
                <p style={{ margin: '5px 0' }}><strong>DEMPLAR:</strong> {demplarBalance.toFixed(2)} DEMPLAR</p>
              </div>
            ) : (
              <p style={{ fontSize: '1.1rem' }}>Connect your wallet to start building your empire</p>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {NETWORK === 'devnet' && wallet && (
              <button 
                onClick={requestAirdrop}
                disabled={loading}
                style={{
                  background: loading ? 'rgba(255,255,255,0.3)' : '#ff9800',
                  color: 'white',
                  border: 'none',
                  padding: '14px 20px',
                  borderRadius: '10px',
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
                padding: '12px 15px',
                borderRadius: '10px',
                border: 'none',
                background: 'rgba(255,255,255,0.25)',
                color: 'white',
                fontSize: '14px'
              }}
            >
              <option value="SOL" style={{ color: 'black' }}>Pay with SOL</option>
              <option value="DEMPLAR" style={{ color: 'black' }}>Pay with DEMPLAR (Coming Soon)</option>
            </select>
            
            {wallet ? (
              <button 
                onClick={disconnectWallet}
                style={{
                  background: '#ff4757',
                  color: 'white',
                  border: 'none',
                  padding: '14px 22px',
                  borderRadius: '10px',
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
                  background: '#2ed573',
                  color: 'white',
                  border: 'none',
                  padding: '14px 22px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                Connect Phantom
              </button>
            )}
          </div>
        </div>

        {/* Render all areas - REVERSE ORDER so new areas appear at top */}
        {Object.entries(landData.areas)
          .sort(([a], [b]) => parseInt(b) - parseInt(a)) // Sort descending (newest first)
          .map(([areaNumber, areaData], index) => {
            const areaNum = parseInt(areaNumber)
            const theme = CLIMATE_THEMES[areaNum] || CLIMATE_THEMES[8]
            const price = calculatePrice(areaNum)
            const demplarPrice = calculateDemplarAmount(price)
            const isCurrentArea = areaNum === landData.currentArea
            const nextPlot = areaData.plots[areaData.nextAvailablePlot]
            const isNewestArea = index === 0 // First in reversed list = newest area

            return (
              <div 
                key={areaNumber}
                ref={isCurrentArea ? newAreaRef : null}
                style={{ 
                  marginBottom: '50px',
                  opacity: 1,
                  transform: 'translateY(0)',
                  order: isNewestArea ? -1 : 0 // Ensure newest stays at top
                }}
              >
                {/* Area Divider */}
                {index < Object.keys(landData.areas).length - 1 && (
                  <div style={{
                    height: '4px',
                    background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`,
                    marginBottom: '30px',
                    borderRadius: '2px'
                  }} />
                )}

                {/* Area Header */}
                <div style={{ 
                  background: `rgba(255,255,255,0.15)`,
                  backdropFilter: 'blur(10px)',
                  borderRadius: '20px', 
                  padding: '25px', 
                  marginBottom: '30px',
                  textAlign: 'center',
                  border: `2px solid ${theme.accent}`,
                  position: 'relative'
                }}>
                  {areaData.completed && (
                    <div style={{
                      position: 'absolute',
                      top: '15px',
                      right: '20px',
                      background: '#2ed573',
                      padding: '8px 15px',
                      borderRadius: '20px',
                      fontSize: '0.9rem',
                      fontWeight: 'bold'
                    }}>
                      ✅ COMPLETED
                    </div>
                  )}
                  
                  {isCurrentArea && (
                    <div style={{
                      position: 'absolute',
                      top: '15px',
                      left: '20px',
                      background: '#ffeb3b',
                      color: '#000',
                      padding: '8px 15px',
                      borderRadius: '20px',
                      fontSize: '0.9rem',
                      fontWeight: 'bold'
                    }}>
                      🎯 CURRENT
                    </div>
                  )}
                  
                  <h2 style={{ margin: '0 0 15px 0', fontSize: '2.2rem' }}>
                    {theme.emoji} Area {areaNumber} - {theme.name}
                  </h2>
                  <p style={{ fontSize: '1.1rem', opacity: 0.9, marginBottom: '15px' }}>
                    {theme.description}
                  </p>
                  
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
                    <p style={{ fontSize: '1.1rem', margin: '5px 0' }}>
                      <strong>SOL Price:</strong> {price.toFixed(4)} SOL
                    </p>
                    <p style={{ fontSize: '1.1rem', margin: '5px 0' }}>
                      <strong>DEMPLAR Price:</strong> {demplarPrice.toFixed(2)} DEMPLAR
                    </p>
                  </div>
                  
                  <div style={{ marginTop: '15px' }}>
                    <p style={{ opacity: 0.9 }}>
                      Plots owned: {areaData.plots.filter(p => p.owned).length} / {areaData.plots.length}
                    </p>
                    {!areaData.completed && nextPlot && (
                      <p style={{ fontSize: '1rem', color: '#ffeb3b', fontWeight: 'bold', marginTop: '8px' }}>
                        🎯 Next available: Plot {nextPlot.id}
                      </p>
                    )}
                  </div>
                </div>

                {/* Land Grid */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '20px',
                  marginBottom: '30px'
                }}>
                  {areaData.plots.map((plot, plotIndex) => {
                    const isNextAvailable = plotIndex === areaData.nextAvailablePlot && !areaData.completed
                    const canPurchase = isNextAvailable && !plot.owned && wallet && !loading
                    
                    return (
                      <div 
                        key={plot.id}
                        style={{
                          background: plot.owned 
                            ? 'rgba(255, 87, 87, 0.3)' 
                            : isNextAvailable
                              ? 'rgba(46, 213, 115, 0.3)'
                              : 'rgba(128, 128, 128, 0.2)',
                          border: plot.owned 
                            ? '3px solid #ff5757' 
                            : isNextAvailable
                              ? `3px solid #2ed573`
                              : '2px solid rgba(255,255,255,0.3)',
                          borderRadius: '15px',
                          padding: '20px',
                          textAlign: 'center',
                          backdropFilter: 'blur(10px)',
                          transition: 'all 0.3s ease',
                          cursor: canPurchase ? 'pointer' : 'default',
                          position: 'relative'
                        }}
                      >
                        {isNextAvailable && (
                          <div style={{
                            position: 'absolute',
                            top: '-10px',
                            right: '-10px',
                            background: '#ffeb3b',
                            color: '#000',
                            borderRadius: '50%',
                            width: '30px',
                            height: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            fontWeight: 'bold'
                          }}>
                            🎯
                          </div>
                        )}
                        
                        <h3 style={{ margin: '0 0 15px 0', fontSize: '1.4rem' }}>
                          {theme.emoji} Plot {plot.id}
                        </h3>
                        
                        {plot.owned ? (
                          <div>
                            <p style={{ color: '#ff6b6b', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '10px' }}>
                              OWNED FOREVER
                            </p>
                            <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '8px' }}>
                              Owner: {plot.owner?.slice(0, 6)}...{plot.owner?.slice(-4)}
                            </p>
                            <p style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '5px' }}>
                              Price: {plot.price?.toFixed(4)} {plot.paymentMethod}
                            </p>
                            <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                              {plot.purchaseTimestamp ? new Date(plot.purchaseTimestamp).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                        ) : isNextAvailable ? (
                          <div>
                            <p style={{ marginBottom: '15px', fontSize: '1.1rem' }}>
                              <strong style={{ color: '#2ed573' }}>NEXT AVAILABLE</strong>
                            </p>
                            <p style={{ marginBottom: '15px', fontSize: '1rem' }}>
                              <strong>
                                {paymentMethod === 'SOL' 
                                  ? `${price.toFixed(4)} SOL` 
                                  : `${demplarPrice.toFixed(2)} DEMPLAR`}
                              </strong>
                            </p>
                            <button
                              onClick={() => purchaseLand(plot.id)}
                              disabled={!canPurchase}
                              style={{
                                background: canPurchase 
                                  ? 'linear-gradient(45deg, #2ed573, #26d068)' 
                                  : 'rgba(255,255,255,0.3)',
                                color: 'white',
                                border: 'none',
                                padding: '14px 24px',
                                borderRadius: '10px',
                                cursor: canPurchase ? 'pointer' : 'not-allowed',
                                fontSize: '15px',
                                fontWeight: 'bold',
                                width: '100%',
                                transition: 'all 0.2s'
                              }}
                            >
                              {loading ? '⏳ Processing...' : `🛒 Buy Forever`}
                            </button>
                          </div>
                        ) : (
                          <div>
                            <p style={{ color: '#888', fontWeight: 'bold', fontSize: '1rem', marginBottom: '10px' }}>
                              LOCKED
                            </p>
                            <p style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '15px' }}>
                              Purchase previous plots first
                            </p>
                            <button
                              disabled={true}
                              style={{
                                background: 'rgba(255,255,255,0.1)',
                                color: 'rgba(255,255,255,0.5)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                padding: '14px 24px',
                                borderRadius: '10px',
                                cursor: 'not-allowed',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                width: '100%'
                              }}
                            >
                              🔒 Locked
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

        {/* New Area Animation */}
        {animatingNewArea && (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            marginBottom: '30px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '20px',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>
              🎉
            </div>
            <h2 style={{ marginBottom: '15px', color: '#2ed573' }}>
              Area Completed!
            </h2>
            <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
              New climate zone unlocking...
            </p>
            <div style={{
              width: '200px',
              height: '4px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '2px',
              margin: '20px auto',
              overflow: 'hidden'
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, #2ed573, #26d068)',
                borderRadius: '2px'
              }} />
            </div>
          </div>
        )}

        {/* Info Section */}
        <div style={{ 
          background: 'rgba(255,255,255,0.15)', 
          borderRadius: '20px', 
          padding: '30px',
          textAlign: 'center',
          backdropFilter: 'blur(15px)',
          border: `2px solid ${currentTheme.accent}40`
        }}>
          <h3 style={{ fontSize: '1.8rem', marginBottom: '20px' }}>🏗️ How Sequential Land Empire Works</h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '25px',
            marginBottom: '25px'
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '20px',
              borderRadius: '15px',
              border: `1px solid ${currentTheme.accent}30`
            }}>
              <h4 style={{ marginBottom: '10px' }}>🎯 Sequential Purchasing</h4>
              <p style={{ fontSize: '0.95rem', opacity: 0.9 }}>
                You must purchase plots in order - no skipping ahead! This ensures fair progression for all players globally.
              </p>
            </div>
            
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '20px',
              borderRadius: '15px',
              border: `1px solid ${currentTheme.accent}30`
            }}>
              <h4 style={{ marginBottom: '10px' }}>🌍 Climate Progression</h4>
              <p style={{ fontSize: '0.95rem', opacity: 0.9 }}>
                Each completed area unlocks a new climate zone with unique themes, from forests to arctic tundra.
              </p>
            </div>
            
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '20px',
              borderRadius: '15px',
              border: `1px solid ${currentTheme.accent}30`
            }}>
              <h4 style={{ marginBottom: '10px' }}>🔒 Forever Ownership</h4>
              <p style={{ fontSize: '0.95rem', opacity: 0.9 }}>
                Each plot can only be purchased once by one person forever. All ownership is recorded on Solana blockchain permanently.
              </p>
            </div>
          </div>

          <div style={{
            background: 'rgba(46, 213, 115, 0.2)',
            border: '2px solid #2ed573',
            borderRadius: '15px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h4 style={{ color: '#2ed573', marginBottom: '10px' }}>🚀 Server-Side Persistence</h4>
            <p style={{ fontSize: '0.95rem', opacity: 0.9', marginBottom: '8px' }}>
              • All land ownership is stored on our secure servers
            </p>
            <p style={{ fontSize: '0.95rem', opacity: 0.9', marginBottom: '8px' }}>
              • Every purchase is verified on Solana blockchain
            </p>
            <p style={{ fontSize: '0.95rem', opacity: 0.9', marginBottom: '8px' }}>
              • Global state shared by all players - no local storage
            </p>
            <p style={{ fontSize: '0.95rem', opacity: 0.9' }}>
              • Once someone owns a plot anywhere in the world, it's theirs forever!
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '1rem', marginBottom: '8px' }}>
              💰 Current Area {landData.currentArea} Price: {calculatePrice(landData.currentArea).toFixed(4)} SOL
            </p>
            <p style={{ fontSize: '0.95rem', marginBottom: '8px' }}>
              🪙 Pay with SOL or DEMPLAR tokens at current USD rates
            </p>
            <p style={{ fontSize: '0.95rem', marginBottom: '8px' }}>
              🔄 Complete areas to unlock new climate zones automatically
            </p>
          </div>

          {NETWORK === 'devnet' && (
            <div style={{
              background: 'rgba(255, 235, 59, 0.2)',
              border: '2px solid #ffeb3b',
              borderRadius: '15px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <p style={{ fontSize: '1rem', color: '#ffeb3b', fontWeight: 'bold', marginBottom: '10px' }}>
                🧪 DEVNET TESTING MODE
              </p>
              <p style={{ fontSize: '0.95rem', opacity: 0.9 }}>
                Prices are 1% of mainnet for easy testing. Use "Get Test SOL" for free devnet SOL!
                All transactions are on Solana devnet and have no real value. Server persistence is fully functional.
              </p>
            </div>
          )}
          
          <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '20px' }}>
            <p style={{ marginBottom: '5px' }}>
              Token: {TOKEN_MINTS[NETWORK].slice(0, 8)}...{TOKEN_MINTS[NETWORK].slice(-8)}
            </p>
            <p style={{ margin: 0 }}>
              Treasury: {TREASURY_WALLETS[NETWORK].slice(0, 8)}...{TREASURY_WALLETS[NETWORK].slice(-8)}
            </p>
          </div>
        </div>

        {/* Purchase History */}
        {purchaseHistory.length > 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '25px',
            marginTop: '30px',
            backdropFilter: 'blur(10px)'
          }}>
            <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>📜 Global Purchase History</h3>
            <div style={{
              maxHeight: '300px',
              overflowY: 'auto',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '10px',
              padding: '15px'
            }}>
              {purchaseHistory
                .slice(0, 50) // Show last 50 purchases
                .map((record, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: index < Math.min(purchaseHistory.length, 50) - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                    fontSize: '0.9rem'
                  }}>
                    <span>Plot {record.plotId}</span>
                    <span>{record.owner.slice(0, 6)}...{record.owner.slice(-4)}</span>
                    <span>{record.price?.toFixed(4)} {record.paymentMethod}</span>
                    <span style={{ opacity: 0.7 }}>
                      {new Date(record.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))}
            </div>
            <p style={{ textAlign: 'center', opacity: 0.7, fontSize: '0.9rem', marginTop: '10px' }}>
              Showing latest {Math.min(purchaseHistory.length, 50)} purchases from all players globally
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
