import React, { useState, useEffect } from 'react'
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'

// Mock DEMPLAR token mint address - replace with actual token mint
const DEMPLAR_MINT = new PublicKey('11111111111111111111111111111111')
const SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com'

function App() {
  const [connection] = useState(new Connection(SOLANA_RPC_URL))
  const [wallet, setWallet] = useState(null)
  const [balance, setBalance] = useState(0)
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

  // Calculate price based on area
  const calculatePrice = (area) => {
    return (area - 1) * 0.1 + 0.1 // Area 8 = 0.8 SOL, Area 9 = 0.9 SOL, etc.
  }

  const currentPrice = calculatePrice(landData.currentArea)

  // Connect wallet
  const connectWallet = async () => {
    try {
      if (!window.solana) {
        alert('Please install Phantom wallet!')
        return
      }

      const response = await window.solana.connect()
      setWallet(response.publicKey)
      
      // Get balance
      const balance = await connection.getBalance(response.publicKey)
      setBalance(balance / LAMPORTS_PER_SOL)
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
    }
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

      let transaction
      
      if (paymentMethod === 'SOL') {
        // SOL payment
        const lamports = currentPrice * LAMPORTS_PER_SOL
        
        if (balance < currentPrice) {
          alert(`Insufficient SOL balance! Need ${currentPrice} SOL`)
          return
        }

        transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: wallet,
            toPubkey: new PublicKey('YourTreasuryWalletAddressHere'), // Replace with your treasury
            lamports: lamports
          })
        )
      } else {
        // DEMPLAR token payment - would need SPL token transfer
        alert('DEMPLAR token payments coming soon!')
        setLoading(false)
        return
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

      // Update balance
      const newBalance = await connection.getBalance(wallet)
      setBalance(newBalance / LAMPORTS_PER_SOL)

      alert(`Successfully purchased plot ${plotId}!`)
      
    } catch (error) {
      console.error('Transaction failed:', error)
      alert('Transaction failed! Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Auto-connect wallet on page load if previously connected
  useEffect(() => {
    const autoConnect = async () => {
      if (window.solana && window.solana.isConnected) {
        try {
          const response = await window.solana.connect({ onlyIfTrusted: true })
          setWallet(response.publicKey)
          const balance = await connection.getBalance(response.publicKey)
          setBalance(balance / LAMPORTS_PER_SOL)
        } catch (error) {
          console.log('Auto-connect failed:', error)
        }
      }
    }
    autoConnect()
  }, [connection])

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', color: 'white' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '10px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
            🏞️ Solana Land Marketplace
          </h1>
          <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
            Own virtual land on the Solana blockchain
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
                <p><strong>Balance:</strong> {balance.toFixed(4)} SOL</p>
              </div>
            ) : (
              <p>Connect your wallet to purchase land</p>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
              <option value="DEMPLAR" style={{ color: 'black' }}>Pay with DEMPLAR (Soon)</option>
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
          <p style={{ fontSize: '1.1rem', margin: '5px 0' }}>
            Price per plot: <strong>{currentPrice} SOL</strong>
            {paymentMethod === 'DEMPLAR' && ' (or equivalent in DEMPLAR)'}
          </p>
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
                    <strong>{currentPrice} SOL</strong>
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
                    {loading ? '⏳ Processing...' : '🛒 Purchase'}
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
            🪙 Pay with SOL now, DEMPLAR token support coming soon!
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
