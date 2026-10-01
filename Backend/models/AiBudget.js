import mongoose from "mongoose";

const bucketSchema = new mongoose.Schema({
  _id: String,
  charged: {
    type: Number,
    required: true,
    default: 0,
  },
});

const reservationSchema = new mongoose.Schema({
  _id: String,
  bucketIds: {
    type: [String],
    required: true,
  },
  reserved: {
    type: Number,
    required: true,
  },
  actual: Number,
  settled: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// No TTL: deleting accounting data must not silently reset a budget.
export const AiBudgetBucket =
  mongoose.model("AiBudgetBucket", bucketSchema);

export const AiBudgetReservation =
  mongoose.model("AiBudgetReservation", reservationSchema);