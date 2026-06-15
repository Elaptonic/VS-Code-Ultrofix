import Razorpay from "razorpay";

const keyId = process.env["RAZORPAY_KEY_ID"];
const keySecret = process.env["RAZORPAY_KEY_SECRET"];

const razorpay = keyId && keySecret
  ? new Razorpay({ key_id: keyId, key_secret: keySecret })
  : null;

export const RAZORPAY_KEY_ID = keyId ?? null;

export async function createRazorpayOrder(
  amountRupees: number,
  receipt: string,
): Promise<{ id: string; amount: number } | null> {
  if (!razorpay) return null;
  try {
    const order = await razorpay.orders.create({
      amount: amountRupees * 100,
      currency: "INR",
      receipt,
    });
    return { id: String(order.id), amount: Number(order.amount) };
  } catch {
    return null;
  }
}
