import mongoose from "mongoose";
const schema = new mongoose.Schema({
  purpose: { type: String, enum: ["login", "link"], default: "login", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  passwordFingerprint: String,
  stateHash: { type: String, required: true, unique: true },
  browserChallenge: { type: String, required: true },
  githubVerifier: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model("OAuthAttempt", schema);
