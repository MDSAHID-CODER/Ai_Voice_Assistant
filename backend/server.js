require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const prisma = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: '*', // In production, lock down to the React frontend domain
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Express configurations
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/credentials', require('./routes/credentials'));
app.use('/api/agents', require('./routes/agents'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/calls', require('./routes/calls'));
app.use('/api/crm', require('./routes/crm'));
app.use('/api/vapi-webhook', require('./routes/webhook'));

// Dashboard Stats endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const totalCalls = await prisma.call.count();
    
    // Count successful completed calls (status: completed or COMPLETED)
    const completedCalls = await prisma.call.count({
      where: {
        status: { in: ['completed', 'COMPLETED'] }
      }
    });

    const failedCalls = await prisma.call.count({
      where: {
        status: { in: ['failed', 'FAILED'] }
      }
    });

    // Sum of duration
    const callDurations = await prisma.call.aggregate({
      _sum: { duration: true }
    });
    const totalDurationSeconds = callDurations._sum.duration || 0;
    const totalDurationMinutes = Math.round(totalDurationSeconds / 60);

    // Sum of costs
    const callCosts = await prisma.call.aggregate({
      _sum: { cost: true }
    });
    const totalCost = callCosts._sum.cost || 0.0;

    // Get calls by day for chart representation (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentCalls = await prisma.call.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo }
      },
      select: {
        createdAt: true,
        status: true
      }
    });

    // Map counts by day
    const chartData = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      chartData[dateString] = { date: dateString, completed: 0, failed: 0 };
    }

    recentCalls.forEach(call => {
      const dateString = new Date(call.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (chartData[dateString]) {
        if (['completed', 'COMPLETED'].includes(call.status)) {
          chartData[dateString].completed += 1;
        } else if (['failed', 'FAILED'].includes(call.status)) {
          chartData[dateString].failed += 1;
        }
      }
    });

    // Success rate percentage
    const successRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;

    res.json({
      summary: {
        totalCalls,
        completedCalls,
        failedCalls,
        totalDurationMinutes,
        totalCost: parseFloat(totalCost.toFixed(2)),
        successRate
      },
      chartData: Object.values(chartData)
    });
  } catch (error) {
    console.error("Fetch dashboard stats error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Serve Frontend static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

// Start Server
app.listen(PORT, () => {
  console.log(`Backend Server running on port ${PORT}`);
});
