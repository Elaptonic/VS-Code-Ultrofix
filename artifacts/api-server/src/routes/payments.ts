import { Router, type IRouter } from "express";
import Stripe from "stripe";

const router: IRouter = Router();

const stripeKey = process.env["STRIPE_SECRET_KEY"];
const stripe = stripeKey ? new Stripe(stripeKey) : null;

router.post("/payments/intent", async (req, res): Promise<void> => {
  const { amount, currency = "inr", bookingId } = req.body;

  if (!amount || typeof amount !== "number") {
    res.status(400).json({ error: "amount (number, in paise) is required" });
    return;
  }

  if (!stripe) {
    res.status(503).json({
      error: "Payment gateway not configured",
      hint: "Set STRIPE_SECRET_KEY in environment secrets",
    });
    return;
  }

  try {
    const intent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: { bookingId: String(bookingId ?? ""), platform: "urban_company_clone" },
      automatic_payment_methods: { enabled: true },
    });

    res.json({ clientSecret: intent.client_secret, id: intent.id });
  } catch (err) {
    res.status(500).json({ error: "Failed to create payment intent" });
  }
});

export default router;
