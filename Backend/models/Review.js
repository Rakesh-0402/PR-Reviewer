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
  },
  {
    timestamps: true,
  }
);

const Review = mongoose.model("Review", reviewSchema);

export default Review;