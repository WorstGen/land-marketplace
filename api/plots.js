// Simple in-memory storage (use database in production)
let plotsData = {
  currentArea: 8,
  basePrice: 0.8,
  plots: Array.from({ length: 10 }, (_, i) => ({
    id: `8-${i + 1}`,
    number: i + 1,
    status: i === 0 ? 'sold' : 'available',
    owner: i === 0 ? 'Previous Owner' : null,
    paymentType: i === 0 ? 'SOL' : null
  }))
};

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
    res.status(200).json(plotsData);
  } else if (req.method === 'POST') {
    const { plotId, owner, paymentType } = req.body;
    
    // Update plot
    const plot = plotsData.plots.find(p => p.id === plotId);
    if (plot && plot.status === 'available') {
      plot.status = 'sold';
      plot.owner = owner;
      plot.paymentType = paymentType;
      
      // Check if area is complete
      const availablePlots = plotsData.plots.filter(p => p.status === 'available');
      if (availablePlots.length === 0) {
        // Move to next area
        plotsData.currentArea += 1;
        plotsData.basePrice = Math.round((plotsData.basePrice + 0.1) * 10) / 10;
        plotsData.plots = Array.from({ length: 10 }, (_, i) => ({
          id: `${plotsData.currentArea}-${i + 1}`,
          number: i + 1,
          status: 'available',
          owner: null,
          paymentType: null
        }));
      }
    }
    
    res.status(200).json(plotsData);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
