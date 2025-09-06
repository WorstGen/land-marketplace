import React, { useState, useEffect } from 'react'
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token'

// Network configuration
const NETWORK = import.meta.env.VITE_NETWORK || 'devnet' // 'mainnet' or 'devnet'
const RPC_URLS = {
  mainnet: 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com'
}

// DEMPLAR token mint - use different addresses for different networks
const TOKEN_MINTS = {
  mainnet: import.meta.env.VITE_MAINNET_TOKEN_MINT || '4kU3B6hvnMEWNZadKWkQatky8fBgDLt7R9HwoysVpump',
  devnet: import.meta.env.VITE_DEVNET_TOKEN_MINT || 'So11111111111111111111111111111111111111112' // Wrapped SOL for testing
}

// Treasury wallets for different networks
const TREASURY_WALLETS = {
  mainnet: import.meta.env.VITE_MAINNET_TREASURY || 'YourMainnetTreasuryWalletHere',
  devnet: import.meta.env.VITE_DEVNET_TREASURY || 'YourDevnetTreasuryWalletHere'
}

const DEMPLAR_MINT = new PublicKey(TOKEN_MINTS[NETWORK])
const TREASURY_WALLET = new PublicKey(TREASURY_WALLETS[NETWORK])
const SOLANA_RPC_URL = RPC_URLS[NETWORK]

function App() {
  const [connection] = useState(new Connection(SOLANA_RPC_URL))
  const [wallet, setWallet] = useState(null)
  const [balance, setBalance] = useState(0)
  const [demplarBalance, setDemplarBalance] = useState(0)
  const [solToUsd, setSolToUsd] = useState(0)
  const [landData, setLandData] = useState({
    currentArea: 8,
    availablePlots: Array.from({length: 9}, (_, i) => ({ 
      area: 8, 
      plot: i + 2, 
      id: `8-${i + 2}`,
      owned: false,
      owner: null
    }))
  })
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('SOL')

  // Calculate price based on area (much lower for devnet testing)
  const calculatePrice = (area) => {
    const basePrice = (area - 1) * 0.1 + 0.1 // Area 8 = 0.8 SOL, Area 9 = 0.9 SOL, etc.
    // Use much smaller amounts for devnet testing
    return NETWORK === 'devnet' ? basePrice * 0.01 : basePrice // 0.008 SOL for devnet Area 8
  }

  const currentPrice = calculatePrice(landData.currentArea)

  // Airdrop SOL for devnet testing
  const requestAirdrop = async () => {
    if (NETWORK !== 'devnet' || !wallet) {
      alert('Airdrop only available on devnet!')
      return
    }

    try {
      setLoading(true)
      const signature = await connection.requestAirdrop(wallet, 1 * LAMPORTS_PER_SOL)
      await connection.confirmTransaction(signature, 'confirmed')
      
      // Update balance
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

  // Fetch SOL to USD price
  const fetchSolPrice = async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
      const data = await response.json()
      setSolToUsd(data.solana.usd)
    } catch (error) {
      console.error('Failed to fetch SOL price:', error)
      setSolToUsd(100) // Fallback price
    }
  }

  // Get DEMPLAR token balance
  const getDemplarBalance = async (walletAddress) => {
    try {
      const associatedTokenAddress = await getAssociatedTokenAddress(
        DEMPLAR_MINT,
        walletAddress
      )
      
      const tokenAccount = await connection.getTokenAccountBalance(associatedTokenAddress)
      return tokenAccount.value.uiAmount || 0
    } catch (error) {
      console.log('No DEMPLAR token account found or error:', error)
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
      
      // Get SOL balance
      const balance = await connection.getBalance(response.publicKey)
      setBalance(balance / LAMPORTS_PER_SOL)

      // Get DEMPLAR balance
      const demplarBal = await getDemplarBalance(response.publicKey)
      setDemplarBalance(demplarBal)
      
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

  // Calculate DEMPLAR equivalent
  const calculateDemplarAmount = (solAmount) => {
    const usdAmount = solAmount * solToUsd
    // For devnet testing, use 1:1 ratio (1 DEMPLAR = 1 USD)
    return usdAmount
  }

  // Purchase land plot
  const purchaseLand = async (plotId) => {
    if (!wallet) {
      alert('Please connect your wallet first!')
      return
    }

    setLoading(true)
    try {
      const plot = landData.availablePlots.find(p => p.id === plotId)
      if (!plot || plot.owned) {
        alert('Plot not available!')
        return
      }

      let transaction = new Transaction()
      
      if (paymentMethod === 'SOL') {
        // SOL payment
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
        // DEMPLAR token payment
        const demplarAmount = calculateDemplarAmount(currentPrice)
        
        if (demplarBalance < demplarAmount) {
          alert(`Insufficient DEMPLAR balance! Need ${demplarAmount.toFixed(2)} DEMPLAR`)
          setLoading(false)
          return
        }

        try {
          // Get user's DEMPLAR token account
          const userTokenAccount = await getAssociatedTokenAddress(
            DEMPLAR_MINT,
            wallet
          )

          // Get treasury's DEMPLAR token account
          const treasuryTokenAccount = await getAssociatedTokenAddress(
            DEMPLAR_MINT,
            TREASURY_WALLET
          )

          // Convert DEMPLAR amount to token units (assuming 9 decimals for wrapped SOL on devnet)
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

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = wallet

      // Sign and send transaction
      const signedTransaction = await window.solana.signTransaction(transaction)
      const signature = await connection.sendRawTransaction(signedTransaction.serialize())
      
      // Confirm transaction
      await connection.confirmTransaction(signature, 'confirmed')

      // Update land data
      setLandData(prev => {
        const newAvailablePlots = prev.availablePlots.map(p => 
          p.id === plotId 
            ? { ...p, owned: true, owner: wallet.toString() }
            : p
        )
        
        // Check if area is complete
        const allOwned = newAvailablePlots.every(p => p.owned)
        let updatedData = { ...prev, availablePlots: newAvailablePlots }
        
        if (allOwned) {
          // Move to next area
          const nextArea = prev.currentArea + 1
          updatedData = {
            currentArea: nextArea,
            availablePlots: Array.from({length: 10}, (_, i) => ({
              area: nextArea,
              plot: i + 1,
              id: `${nextArea}-${i + 1}`,
              owned: false,
              owner: null
            }))
          }
        }
        
        return updatedData
      })

      // Update balances
      if (paymentMethod === 'SOL') {
        const newBalance = await connection.getBalance(wallet)
        setBalance(newBalance / LAMPORTS_PER_SOL)
      } else {
        const newDemplarBalance = await getDemplarBalance(wallet)
        setDemplarBalance(newDemplarBalance)
      }

      alert(`Successfully purchased plot ${plotId} with ${paymentMethod}! Transaction: ${signature}`)
      
    } catch (error) {
      console.error('Transaction failed:', error)
      alert(`Transaction failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Auto-connect wallet and fetch price on page load
  useEffect(() => {
    fetchSolPrice()
    
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

  const demplarEquivalent = calculateDemplarAmount(currentPrice)

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: NETWORK === 'devnet' 
        ? 'linear-gradient(135deg, #ff9a56 0%, #ff6b95 100%)' 
        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', color: 'white' }}>
        
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
            {NETWORK === 'devnet' 
              ? 'Safe testing environment with free SOL airdrops' 
              : 'Live Solana mainnet - real transactions'}
          </p>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '10px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
            🏞️ Solana Land Marketplace
          </h1>
          <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
            Own virtual land on the Solana blockchain
          </p>
          <p style={{ fontSize: '1rem', opacity: 0.7 }}>
            SOL Price: ${solToUsd.toFixed(2)} USD | Network: {NETWORK.toUpperCase()}
          </p>
        </div>

        {/* Wallet Section */}
        <div style={{ 
          background: 'rgba(255,255,255,0.1)', 
          backdropFilter: 'blur(10px)',
          borderRadius: '15px', 
          padding: '20px', 
          marginBottom: '30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
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
            
            {wallet ? (
              <button 
                onClick={disconnectWallet}
                style={{
                  background: '#ff4757',
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
                  background: '#2ed573',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '8px',
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

        {/* Current Area Info */}
        <div style={{ 
          background: 'rgba(255,255,255,0.15)', 
          borderRadius: '15px', 
          padding: '20px', 
          marginBottom: '30px',
          textAlign: 'center'
        }}>
          <h2 style={{ margin: '0 0 10px 0' }}>Current Area: {landData.currentArea}</h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
            <p style={{ fontSize: '1.1rem', margin: '5px 0' }}>
              <strong>SOL Price:</strong> {currentPrice} SOL
              {NETWORK === 'devnet' && <span style={{ fontSize: '0.8rem' }}> (1% of mainnet)</span>}
            </p>
            <p style={{ fontSize: '1.1rem', margin: '5px 0' }}>
              <strong>DEMPLAR Price:</strong> {demplarEquivalent.toFixed(2)} DEMPLAR
            </p>
          </div>
          <p style={{ opacity: 0.8 }}>
            Available plots: {landData.availablePlots.filter(p => !p.owned).length} / {landData.availablePlots.length}
          </p>
        </div>

        {/* Land Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}>
          {landData.availablePlots.map(plot => (
            <div 
              key={plot.id}
              style={{
                background: plot.owned 
                  ? 'rgba(255, 87, 87, 0.2)' 
                  : 'rgba(46, 213, 115, 0.2)',
                border: plot.owned 
                  ? '2px solid #ff5757' 
                  : '2px solid #2ed573',
                borderRadius: '15px',
                padding: '20px',
                textAlign: 'center',
                backdropFilter: 'blur(5px)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: plot.owned ? 'not-allowed' : 'pointer'
              }}
              onMouseEnter={(e) => {
                if (!plot.owned) {
                  e.target.style.transform = 'translateY(-5px)'
                  e.target.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)'
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = 'none'
              }}
            >
              <h3 style={{ margin: '0 0 15px 0', fontSize: '1.4rem' }}>
                📍 Plot {plot.id}
              </h3>
              
              {plot.owned ? (
                <div>
                  <p style={{ color: '#ff6b6b', fontWeight: 'bold' }}>OWNED</p>
                  <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                    Owner: {plot.owner?.slice(0, 6)}...{plot.owner?.slice(-4)}
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{ marginBottom: '15px' }}>
                    <strong>
                      {paymentMethod === 'SOL' 
                        ? `${currentPrice} SOL` 
                        : `${demplarEquivalent.toFixed(2)} DEMPLAR`}
                    </strong>
                  </p>
                  <button
                    onClick={() => purchaseLand(plot.id)}
                    disabled={loading || !wallet}
                    style={{
                      background: loading || !wallet 
                        ? 'rgba(255,255,255,0.3)' 
                        : '#3742fa',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      cursor: loading || !wallet ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      width: '100%',
                      transition: 'background 0.2s'
                    }}
                  >
                    {loading ? '⏳ Processing...' : `🛒 Buy with ${paymentMethod}`}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Info Section */}
        <div style={{ 
          background: 'rgba(255,255,255,0.1)', 
          borderRadius: '15px', 
          padding: '20px',
          textAlign: 'center'
        }}>
          <h3>How It Works</h3>
          <p>
            🏗️ Start in Area {landData.currentArea} with plots {landData.currentArea}-2 through {landData.currentArea}-{landData.currentArea + 2}
          </p>
          <p>
            💰 Each area increases in price by 0.1 SOL (Area {landData.currentArea} = {currentPrice} SOL)
          </p>
          <p>
            🔄 Once all plots in an area are purchased, the next area opens automatically
          </p>
          <p>
            🪙 Pay with SOL or DEMPLAR tokens at USD equivalent rates
          </p>
          {NETWORK === 'devnet' && (
            <p style={{ fontSize: '0.9rem', opacity: 0.8, color: '#ffeb3b' }}>
              🧪 DEVNET: Prices are 1% of mainnet for easy testing. Use "Get Test SOL" for free devnet SOL!
            </p>
          )}
          <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
            Token: {DEMPLAR_MINT.toString()}<br/>
            Network: {NETWORK} | Treasury: {TREASURY_WALLET.toString().slice(0, 8)}...
          </p>
        </div>
      </div>
    </div>
  )
}

export default App;
