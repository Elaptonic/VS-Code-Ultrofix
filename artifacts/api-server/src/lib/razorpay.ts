import Razorpay from "razorpay";
import { logger } from "./logger";

const keyId = process.env["RAZORPAY_KEY_ID"];
const keySecret = process.env["RAZORPAY_KEY_SECRET"];

const razorpay = keyId && keySecret
  ? new Razorpay({ key_id: keyId, key_secret: keySecret })
  : null;

const SIMULATED_KEY_ID = "key_sim_sandbox";

export const RAZORPAY_KEY_ID = keyId ?? SIMULATED_KEY_ID;

export async function createRazorpayOrder(
  amountRupees: number,
  receipt: string,
): Promise<{ id: string; amount: number } | null> {
  // No credentials configured (dev/sandbox) — return a realistic simulated
  // order so the booking flow and frontend payment UI can be exercised
  // end-to-end without real Razorpay access.
  if (!razorpay) {
    return {
      id: `order_sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      amount: amountRupees * 100,
    };
  }
  try {
    const order = await razorpay.orders.create({
      amount: amountRupees * 100,
      currency: "INR",
      receipt,
    });
    return { id: String(order.id), amount: Number(order.amount) };
  } catch (err) {
    logger.error({ err }, "Failed to create Razorpay order");
    return null;
  }
}
