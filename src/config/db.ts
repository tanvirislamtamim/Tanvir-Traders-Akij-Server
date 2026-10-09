import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { syncTanvirTradersCatalog } from '../scripts/seed.js';

let cachedPromise: Promise<typeof mongoose> | null = null;
let lastDbError: string | null = null;
let isSeeded = false;

export const connectDB = async (): Promise<typeof mongoose> => {
  // 1. If already connected, reuse connection
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // 2. If connection is in progress, await existing promise
  if (mongoose.connection.readyState === 2 && cachedPromise) {
    return cachedPromise;
  }

  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tanvir_traders_akij';

  try {
    cachedPromise = mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
    });

    const conn = await cachedPromise;
    lastDbError = null;
    console.log(`[Database] MongoDB Connected: ${conn.connection.host} (${conn.connection.name})`);

    if (!isSeeded) {
      await autoSeedIfNecessary();
      isSeeded = true;
    }

    return conn;
  } catch (error: any) {
    cachedPromise = null;
    lastDbError = error.message;
    console.warn(`[Database] MongoDB connection failed: ${error.message}`);

    // Only attempt in-memory fallback in local environment, never on Vercel / production
    const isVercelOrProd = process.env.VERCEL || process.env.NODE_ENV === 'production';
    if (!isVercelOrProd) {
      try {
        console.log(`[Database] Starting in-memory MongoDB server for local development...`);
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        const conn = await mongoose.connect(uri);
        console.log(`[Database] In-Memory MongoDB Connected at: ${uri}`);
        if (!isSeeded) {
          await autoSeedIfNecessary();
          isSeeded = true;
        }
        return conn;
      } catch (memErr: any) {
        console.error('[Database] Failed to start in-memory MongoDB:', memErr.message);
        throw error;
      }
    }

    throw error;
  }
};

export const getDbStatus = () => {
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const hasUri = Boolean(process.env.MONGODB_URI);
  let maskedUri = 'NOT_SET';
  if (process.env.MONGODB_URI) {
    maskedUri = process.env.MONGODB_URI.replace(/:([^:@]+)@/, ':****@');
  }

  return {
    status: states[mongoose.connection.readyState] || 'unknown',
    readyState: mongoose.connection.readyState,
    hasMongoUri: hasUri,
    mongoUriConfigured: maskedUri,
    lastError: lastDbError,
  };
};

async function autoSeedIfNecessary() {
  try {
    const firstProduct = await Product.findOne();
    if (!firstProduct || firstProduct.sku.startsWith('FAN-')) {
      console.log(`[Catalog] Synchronizing Tanvir Traders' exact 59 Fantastic biscuit items...`);
      await syncTanvirTradersCatalog();
    } else {
      const count = await Product.countDocuments();
      console.log(`[Catalog] Found ${count} products in database ready for Tanvir Traders.`);
    }
  } catch (err: any) {
    console.error('[Seed Check Error]:', err.message);
  }
}

