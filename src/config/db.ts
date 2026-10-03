import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { akijFantasticProducts, syncTanvirTradersCatalog } from '../scripts/seed.js';

export const connectDB = async (): Promise<void> => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tanvir_traders_akij';

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host} (${conn.connection.name})`);
    await autoSeedIfNecessary();
  } catch (error: any) {
    console.warn(`[Database] Local MongoDB at ${mongoURI} not reachable (${error.message}).`);
    console.log(`[Database] Starting in-memory MongoDB server for instant seamless development...`);

    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      const conn = await mongoose.connect(uri);
      console.log(`[Database] In-Memory MongoDB Connected at: ${uri}`);
      await autoSeedIfNecessary();
    } catch (memErr) {
      console.error('[Database] Failed to start in-memory MongoDB:', memErr);
    }
  }
};

async function autoSeedIfNecessary() {
  try {
    const firstProduct = await Product.findOne();
    // If empty or has old sku format like FAN-001 instead of AK-01
    if (!firstProduct || firstProduct.sku.startsWith('FAN-')) {
      console.log(`[Catalog] Synchronizing Tanvir Traders' exact 59 Fantastic biscuit items...`);
      await syncTanvirTradersCatalog();
    } else {
      const count = await Product.countDocuments();
      console.log(`[Catalog] Found ${count} products in database ready for Tanvir Traders.`);
    }
  } catch (err) {
    console.error('[Seed Check Error]:', err);
  }
}
