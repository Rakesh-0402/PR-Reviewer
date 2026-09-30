import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    installationId: { type: Number, required: true },
    repositoryId: { type: Number, required: true },
    owner: { type: String, required: true },
    repo: { type: String, required: true },
    prNumber: { type: Number, required: true },
    headSha: { type: String, required: true },
    baseSha: { type: String, required: true },

    stage: {
      type: String,
      enum: ["review", "publish", "done", "failed", "superseded"],
      default: "review",
      required: true,
    },

    state: { type: mongoose.Schema.Types.Mixed, required: true },
    result: mongoose.Schema.Types.Mixed,

    nextRunAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    publishExpiresAt: Date,

    infrastructureAttempts: { type: Number, default: 0 },
    commentId: Number,
    commentUrl: String,
    lastError: String,
  },
  { timestamps: true }
);

// Redelivering an event must not create another review for the same version.
schema.index(
  {
    installationId: 1,
    repositoryId: 1,
    prNumber: 1,
    headSha: 1,
    baseSha: 1,
  },
  { unique: true }
);

schema.index({ stage: 1, nextRunAt: 1 });

export default mongoose.model("AutomaticReview", schema);