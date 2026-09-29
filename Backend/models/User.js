import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: function () { return !this.githubId; } },
  githubId: { type: String },
  githubUsername: String,
  avatarUrl: String,
  totalReviews: { type: Number, default: 0 },
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },
}, { timestamps: true });
userSchema.index({ githubId: 1 }, { unique: true, partialFilterExpression: { githubId: { $type: "string" } } });
export default mongoose.model("User", userSchema);
