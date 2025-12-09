import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config(); 

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("MongoDB Connected Successfully");
  } catch (error:any) {
    console.error("Mongo connection error:", error.message);
    process.exit(1); 
  }
};
