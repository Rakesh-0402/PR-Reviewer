import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    installationId: {
      type: Number,
      required: true,
      unique: true,
    },
    githubId: {
      type: String,
      required: true,
    },
    accountLogin: {
      type: String,
      required: true,
    },
    repositorySelection: {
      type: String,
      enum: ["all", "selected"],
      required: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    verifiedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("GithubInstallation", schema);