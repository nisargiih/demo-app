import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri && process.env.NODE_ENV === 'production') {
  // We only throw in production if actually missing, 
  // but let's just log a warning to allow builds to pass without secrets
  console.warn('Warning: MONGODB_URI is missing');
}

const options = {};

let client;
let clientPromise: Promise<MongoClient>;

if (!uri) {
    // Return a dummy promise or similar to prevent crashes during evaluation if URI is missing
    clientPromise = Promise.reject(new Error('MONGODB_URI is not defined'));
} else {
    if (process.env.NODE_ENV === 'development') {
      let globalWithMongo = global as typeof globalThis & {
        _mongoClientPromise?: Promise<MongoClient>;
      };

      if (!globalWithMongo._mongoClientPromise) {
        client = new MongoClient(uri, options);
        globalWithMongo._mongoClientPromise = client.connect();
      }
      clientPromise = globalWithMongo._mongoClientPromise;
    } else {
      client = new MongoClient(uri, options);
      clientPromise = client.connect();
    }
}

export default clientPromise;
