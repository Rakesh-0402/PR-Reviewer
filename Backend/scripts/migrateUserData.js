import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import mongoose from "mongoose";
import User from "../models/User.js";
import Review from "../models/Review.js";

async function migrateUserData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected.");

    const users = await User.find();

    console.log(`Found ${users.length} users.`);

    for (const user of users) {

      // Calculate total unique PRs reviewed
      const uniqueReviews = await Review.aggregate([
        {
          $match: {
            userId: user._id,
          },
        },
        {
          $group: {
            _id: {
              owner: "$owner",
              repo: "$repo",
              prNumber: "$prNumber",
            },
          },
        },
        {
          $count: "total",
        },
      ]);

      const totalReviews =
        uniqueReviews.length > 0
          ? uniqueReviews[0].total
          : 0;

      // Recover account creation date from MongoDB ObjectId
      const createdAt = new mongoose.Types.ObjectId(
        user._id
      ).getTimestamp();

      // Direct MongoDB update
      await User.collection.updateOne(
        { _id: user._id },
        {
          $set: {
            createdAt,
            totalReviews,
          },
        }
      );

      console.log(
        `Migrated: ${user.email} | Reviews: ${totalReviews} | Created: ${createdAt}`
      );
    }

    console.log("Migration completed successfully.");

  } catch (error) {
    console.error("Migration failed:", error);

  } finally {
    await mongoose.connection.close();
    console.log("MongoDB connection closed.");
  }
}

migrateUserData();