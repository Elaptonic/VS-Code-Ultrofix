CREATE TABLE "vendor_subscriptions" (
  "id" serial PRIMARY KEY NOT NULL,
  "provider_id" integer NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "started_at" timestamp with time zone NOT NULL DEFAULT now(),
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE "reviews" (
  "id" serial PRIMARY KEY NOT NULL,
  "booking_id" integer NOT NULL,
  "provider_id" integer NOT NULL,
  "consumer_id" text NOT NULL,
  "rating" integer NOT NULL,
  "comment" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "reviews_booking_id_unique" UNIQUE("booking_id")
);
