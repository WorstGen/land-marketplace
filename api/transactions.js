export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    // Return recent transactions (mock data)
    const mockTransactions = [
      {
        id: 1,
        signature: '5j7K8m9N2p3Q4r5S6t7U8v9W1x2Y3z4A5b6C7d8E9f0G1h2I3j4K5l6M7n8P9q0R',
        amount: 0.8,
        type: 'SOL',
        plotId: '8-2',
        timestamp: new Date().toISOString(),
        sender: '7x8P2m4K9nQ1r5S6t7U8v9W1x2Y3z4A5b6C'
      }
    ];
    
    res.status(200).json(mockTransactions);
  } else if (req.method === 'POST') {
    // Process new transaction
    const { signature, amount, type, sender } = req.body;
    
    // In production, you would:
    // 1. Verify the transaction on Solana blockchain
    // 2. Save to database
    // 3. Assign plot to user
    
    res.status(200).json({
      success: true,
      message: 'Transaction processed',
      plotAssigned: '8-3'
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
