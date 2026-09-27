import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    owner: {
      type: String,
      required: true,
    },

    repo: {
      type: String,
      required: true,
    },

    prNumber: {
      type: Number,
      required: true,
    },

    title: {
      type: String,
      default: "",
    },

    review: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    jobId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "ReviewJob" 
    },
  },
  {
    timestamps: true,
  }
);
// Historical reviews have no jobId and are excluded from this index.
reviewSchema.index({ jobId: 1 }, {
  unique: true,
  partialFilterExpression: { jobId: { $type: "objectId" } },
});

const Review = mongoose.model("Review", reviewSchema);

export default Review;