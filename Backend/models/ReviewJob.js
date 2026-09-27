import mongoose from "mongoose";

const schema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", required: true 
  },
  // Present only while active. A unique partial index enforces one active job/user.
  activeUser: String,
  owner: { 
    type: String, 
    required: true 
  },
  repo: { 
    type: String, 
    required: true 
  },
  prNumber: { 
    type: Number, 
    required: true 
  },
  state: { 
    type: mongoose.Schema.Types.Mixed, 
    required: true 
  },
  status: { 
    type: String, 
    required: true, 
    default: "queued" 
  },
  nextRunAt: { 
    type: Date, 
    default: Date.now 
  },
  expiresAt: { 
    type: Date, 
    required: true 
  },
  reviewId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Review" 
  },
}, { timestamps: true });

schema.index({ activeUser: 1 }, {
  unique: true,
  partialFilterExpression: { activeUser: { $type: "string" } },
});
schema.index({ status: 1, nextRunAt: 1 });
schema.index({ userId: 1, createdAt: -1 });
export default mongoose.model("ReviewJob", schema);
