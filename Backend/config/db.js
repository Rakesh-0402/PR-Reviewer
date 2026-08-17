import mongoose from "mongoose";

//database connection 
async function connectDB(){
    await mongoose.connect(process.env.MONGODB_URI);   //Connecting mongodb with backend/node.js

    console.log("MongoDB connected");
}

export default connectDB;