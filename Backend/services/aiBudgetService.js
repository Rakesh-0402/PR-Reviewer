import "dotenv/config";
import crypto from "node:crypto";
import mongoose from "mongoose";
import {
  AiBudgetBucket,
  AiBudgetReservation,
} from "../models/AiBudget.js";

function positiveInteger(name, fallback) {
  const value = Number(process.env[name] ?? fallback);

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return value;
}

const LIMITS = {
  global: positiveInteger("AI_GLOBAL_DAILY_TOKENS", 160000),
  installation: positiveInteger("AI_INSTALLATION_DAILY_TOKENS", 40000),
  user: positiveInteger("AI_USER_DAILY_TOKENS", 30000),
};

export async function initAiBudgets() {
  await AiBudgetBucket.init();
  await AiBudgetReservation.init();
}

function budgetError(code, message, extra = {}) {
  return Object.assign(new Error(message), { code, ...extra });
}

function unavailable() {
  return budgetError(
    "AI_BUDGET_UNAVAILABLE",
    "Usage accounting is unavailable; retry scheduled.",
    { retryAt: Date.now() + 60_000 }
  );
}

export async function reserveAiBudget({ scope, tokens }) {
  if (
    !scope ||
    !["installation", "user"].includes(scope.type) ||
    typeof scope.id !== "string" ||
    !/^[A-Za-z0-9_-]{1,100}$/.test(scope.id) ||
    !Number.isSafeInteger(tokens) ||
    tokens <= 0
  ) {
    throw budgetError(
      "AI_BUDGET_CONFIG",
      "Review budget identity or reservation is invalid."
    );
  }

  const now = Date.now();
  const date = new Date(now);
  const day = date.toISOString().slice(0, 10);
  const resetAt = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + 1
  );

  const buckets = [
    {
      id: `${day}:global`,
      limit: LIMITS.global,
      label: "Application",
    },
    {
      id: `${day}:${scope.type}:${scope.id}`,
      limit: LIMITS[scope.type],
      label: scope.type === "installation" ? "Installation" : "User",
    },
  ];

  if (buckets.some(bucket => tokens > bucket.limit)) {
    throw budgetError(
      "AI_BUDGET_CONFIG",
      "One batch exceeds its daily budget. Reduce the batch size or raise the app budget."
    );
  }

  const reservationId = crypto.randomUUID();
  let session;

  try {
    // Initialize counters before entering the transaction.
    for (const bucket of buckets) {
      try {
        await AiBudgetBucket.updateOne(
          { _id: bucket.id },
          { $setOnInsert: { charged: 0 } },
          { upsert: true }
        );
      } catch (error) {
        // Another worker may have created the same counter.
        if (error.code !== 11000) throw error;
      }
    }

    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      for (const bucket of buckets) {
        const result = await AiBudgetBucket.updateOne(
          {
            _id: bucket.id,
            charged: { $lte: bucket.limit - tokens },
          },
          { $inc: { charged: tokens } },
          { session }
        );

        if (result.modifiedCount !== 1) {
          throw budgetError(
            "AI_BUDGET_WAIT",
            `${bucket.label} daily budget has insufficient capacity; ` +
              "progress saved. Waiting for capacity or the daily reset.",
            {
              // Recheck because an in-flight request may refund unused tokens.
              retryAt: Math.min(Date.now() + 60_000, resetAt + 1000),
              resetAt,
            }
          );
        }
      }

      await AiBudgetReservation.create(
        [{
          _id: reservationId,
          bucketIds: buckets.map(bucket => bucket.id),
          reserved: tokens,
          settled: false,
        }],
        { session }
      );
    });

    return reservationId;
  } catch (error) {
    if (error.code === "AI_BUDGET_WAIT") throw error;

    console.error("AI budget reservation failed:", {
      type: error.name,
    });

    // No Groq request is sent when reservation fails.
    throw unavailable();
  } finally {
    if (session) await session.endSession();
  }
}

export async function settleAiBudget(reservationId, actualTokens) {
  if (
    !Number.isSafeInteger(actualTokens) ||
    actualTokens < 0
  ) {
    // Missing usage: retain the conservative reservation.
    console.warn("AI usage missing; reservation retained.", {
      reservationId,
    });
    return;
  }

  let session;

  try {
    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      const reservation = await AiBudgetReservation.findById(
        reservationId
      ).session(session);

      if (!reservation) {
        throw new Error("Budget reservation is missing.");
      }

      // Safe to call again after an uncertain database response.
      if (reservation.settled) return;

      const difference = actualTokens - reservation.reserved;

      for (const bucketId of reservation.bucketIds) {
        const result = await AiBudgetBucket.updateOne(
          { _id: bucketId },
          { $inc: { charged: difference } },
          { session }
        );

        if (result.matchedCount !== 1) {
          throw new Error("Budget counter is missing.");
        }
      }

      await AiBudgetReservation.updateOne(
        { _id: reservationId, settled: false },
        {
          $set: {
            settled: true,
            actual: actualTokens,
          },
        },
        { session }
      );

      if (difference > 0) {
        console.warn("Actual AI usage exceeded its reservation.", {
          reservationId,
          reserved: reservation.reserved,
          actual: actualTokens,
        });
      }
    });
  } finally {
    if (session) await session.endSession();
  }
}