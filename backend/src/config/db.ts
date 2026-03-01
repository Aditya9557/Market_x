import mongoose from 'mongoose';

const connectDB = async (retries = 5, delay = 5000): Promise<void> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const conn = await mongoose.connect(
                process.env.MONGO_URI || 'mongodb://localhost:27017/project_hero',
                { serverSelectionTimeoutMS: 10000 }
            );
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
                process.exit(1);
            }
        }
    }
};

export default connectDB;
