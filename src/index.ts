import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { connectDB, getDbStatus } from './config/db.js';
import productRoutes from './routes/productRoutes.js';
import dailySaleRoutes from './routes/dailySaleRoutes.js';
import stockInwardRoutes from './routes/stockInwardRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import userRoutes from './routes/userRoutes.js';
import pendingRoutes from './routes/pendingRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initial connection attempt
connectDB().catch((err) => {
  console.warn('[Startup DB Notice]:', err.message);
});

// Middlewares
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Health check endpoint (always accessible without blocking)
app.get('/api/health', async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    try {
      await connectDB();
    } catch (e) {
      // allow returning diagnostic status
    }
  }

  res.json({
    status: mongoose.connection.readyState === 1 ? 'ok' : 'degraded',
    dealership: 'Tanvir Traders',
    company: 'Akij Bakers Limited (Fantastic)',
    db: getDbStatus(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Tanvir Traders - Akij Bakers Backend is running',
    db: getDbStatus(),
  });
});

// Middleware to ensure MongoDB is ready before hitting API routes
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: `Database connection failed: ${error.message}`,
      hint: 'Ensure MongoDB Atlas Network Access has 0.0.0.0/0 allowed, and MONGODB_URI is configured in Vercel Project Environment Variables.',
      db: getDbStatus(),
    });
  }
});

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/daily-sales', dailySaleRoutes);
app.use('/api/stock-inward', stockInwardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/pending', pendingRoutes);

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  TANVIR TRADERS - AKIJ BAKERS DEALERSHIP SYSTEM   `);
    console.log(`  Backend server running on http://localhost:${PORT}`);
    console.log(`====================================================`);
  });
}

export default app;

