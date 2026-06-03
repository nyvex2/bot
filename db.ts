import mongoose from "mongoose";
import { config } from "./config";

export async function connectDB() {
  await mongoose.connect(config.mongo);
  console.log("🟢 MongoDB connected");
}

// ─────────────────────────────
// ORDER MODEL
// ─────────────────────────────
const orderSchema = new mongoose.Schema({
  orderId: Number,
  userId: String,
  category: String,
  service: String,
  budget: String,
  status: {
    type: String,
    default: "pending"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Order = mongoose.model("Order", orderSchema);
