import mongoose from 'mongoose';

const connectDB = async (retries = 5, delay = 5000): Promise<void> => {
    const uri = process.env.MONGO_URI;

    if (!uri) {
        console.error('❌ MONGO_URI environment variable is not set!');
        console.error('   👉 Add MONGO_URI to your Render Environment Variables.');
        // Don't crash — server will start but DB calls will fail
        return;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
            console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
            return;
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            if (attempt < retries) {
                console.warn(`⚠️  MongoDB connection attempt ${attempt}/${retries} failed: ${msg}`);
                console.warn(`   Retrying in ${delay / 1000}s... (Make sure your IP is whitelisted in Atlas)`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error(`❌ MongoDB connection failed after ${retries} attempts: ${msg}`);
                console.error(`   👉 Go to https://cloud.mongodb.com → Network Access → Add IP Address → Allow Access from Anywhere`);
                console.error(`   Server will keep running — API calls needing the DB will fail until MongoDB connects.`);
                // Don't call process.exit(1) — let the server keep running
            }
        }
    }
};

export default connectDB;
