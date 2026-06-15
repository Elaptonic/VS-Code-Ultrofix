import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockSelect,
  mockUpdate,
  mockInsert,
  mockTransaction,
  mockGetRankedProviders,
  mockEmitToUser,
  mockEmitToVendor,
  mockMarkPendingLead,
  mockClearPendingLead,
  mockLogger,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockUpdate: vi.fn(),
  mockInsert: vi.fn(),
  mockTransaction: vi.fn(),
  mockGetRankedProviders: vi.fn(),
  mockEmitToUser: vi.fn(),
  mockEmitToVendor: vi.fn(),
  mockMarkPendingLead: vi.fn(),
  mockClearPendingLead: vi.fn(),
  mockLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@workspace/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    transaction: (...args: unknown[]) => mockTransaction(...args),
  },
  bookingsTable: { id: "id", status: "status", providerId: "providerId", date: "date", time: "time" },
  leadDispatchAttemptsTable: { id: "id", bookingId: "bookingId", status: "status", rank: "rank" },
  notificationsTable: {},
  providersTable: { id: "id" },
  getRankedProviders: (...args: unknown[]) => mockGetRankedProviders(...args),
}));

vi.mock("../lib/logger", () => ({
  logger: mockLogger,
}));

vi.mock("../lib/io-instance", () => ({
  emitToUser: (...args: unknown[]) => mockEmitToUser(...args),
  emitToVendor: (...args: unknown[]) => mockEmitToVendor(...args),
}));

vi.mock("../lib/timers", () => ({
  markPendingLead: (...args: unknown[]) => mockMarkPendingLead(...args),
  clearPendingLead: (...args: unknown[]) => mockClearPendingLead(...args),
}));

import { dispatchNextVendor, handleVendorOffline, markVendorAccepted, markVendorRejected, seedDispatchQueue } from "../lib/dispatch";

function makeChain(result: unknown) {
  const p = Promise.resolve(result);
  const ch: any = {
    from: vi.fn().mockImplementation(() => ch),
    where: vi.fn().mockImplementation(() => ch),
    set: vi.fn().mockImplementation(() => ch),
    orderBy: vi.fn().mockImplementation(() => ch),
    returning: vi.fn().mockResolvedValue(result),
    values: vi.fn().mockResolvedValue(result),
    then: p.then.bind(p),
    catch: p.catch.bind(p),
    finally: p.finally.bind(p),
  };
  return ch;
}

function makeBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    userId: "user-1",
    serviceId: 10,
    serviceName: "Plumbing",
    providerId: 0,
    providerName: "",
    providerInitials: "",
    date: "2025-06-01",
    time: "10:00",
    status: "dispatching",
    price: 500,
    platformFee: 29,
    address: "123 Main St",
    rating: null,
    paymentIntentId: null,
    razorpayOrderId: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeAttempt(overrides: Record<string, unknown> = {}) {
  return {
    id: 100,
    bookingId: 1,
    providerId: 42,
    rank: 1,
    status: "pending",
    skipReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeProvider(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    userId: null,
    slug: "provider-42",
    name: "Jane Doe",
    initials: "JD",
    bio: "",
    rating: 4.8,
    reviewCount: 10,
    jobsCompleted: 50,
    specializations: [],
    experience: "5 years",
    verified: true,
    category: "plumbing",
    serviceAreas: [],
    hourlyRate: 300,
    idDocumentUrl: null,
    onboardingComplete: true,
    latitude: 12.97,
    longitude: 77.59,
    isOnline: true,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockTransaction.mockImplementation((cb: (tx: unknown) => unknown) =>
    cb({ update: (...args: unknown[]) => mockUpdate(...args) }),
  );
});

describe("dispatchNextVendor", () => {
  it("returns null when the booking does not exist", async () => {
    mockSelect.mockReturnValueOnce(makeChain([]));

    const result = await dispatchNextVendor(999);

    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { bookingId: 999 },
      "dispatchNextVendor: booking not found",
    );
  });

  it("returns null without dispatching if booking is already accepted", async () => {
    mockSelect.mockReturnValueOnce(makeChain([makeBooking({ status: "accepted" })]));

    const result = await dispatchNextVendor(1);

    expect(result).toBeNull();
    expect(mockEmitToVendor).not.toHaveBeenCalled();
  });

  it("returns null without dispatching if booking is already completed", async () => {
    mockSelect.mockReturnValueOnce(makeChain([makeBooking({ status: "completed" })]));

    const result = await dispatchNextVendor(1);

    expect(result).toBeNull();
    expect(mockEmitToVendor).not.toHaveBeenCalled();
  });

  it("returns null without dispatching if booking is already cancelled", async () => {
    mockSelect.mockReturnValueOnce(makeChain([makeBooking({ status: "cancelled" })]));

    const result = await dispatchNextVendor(1);

    expect(result).toBeNull();
    expect(mockEmitToVendor).not.toHaveBeenCalled();
  });

  it("emits booking:no_provider and returns null when no pending attempts remain", async () => {
    const booking = makeBooking();

    mockSelect
      .mockReturnValueOnce(makeChain([booking]))
      .mockReturnValueOnce(makeChain([]))
      .mockReturnValueOnce(makeChain([]));

    mockUpdate.mockReturnValue(makeChain(undefined));
    mockInsert.mockReturnValue(makeChain(undefined));

    const result = await dispatchNextVendor(1);

    expect(result).toBeNull();
    expect(mockEmitToUser).toHaveBeenCalledWith(
      booking.userId,
      "booking:no_provider",
      expect.objectContaining({ bookingId: booking.id }),
    );
    expect(mockEmitToVendor).not.toHaveBeenCalled();
  });

  it("dispatches the lead to the first pending vendor when the slot is free", async () => {
    const booking = makeBooking();
    const attempt = makeAttempt({ providerId: 42, rank: 1 });
    const provider = makeProvider({ id: 42 });

    mockSelect
      .mockReturnValueOnce(makeChain([booking]))
      .mockReturnValueOnce(makeChain([]))
      .mockReturnValueOnce(makeChain([attempt]))
      .mockReturnValueOnce(makeChain([]))
      .mockReturnValueOnce(makeChain([provider]));

    mockUpdate.mockReturnValue(makeChain(undefined));

    const result = await dispatchNextVendor(1);

    expect(result).toBe(42);
    expect(mockEmitToVendor).toHaveBeenCalledWith(
      42,
      "NEW_LEAD",
      expect.objectContaining({ bookingId: 1, providerId: 42 }),
    );
    expect(mockMarkPendingLead).toHaveBeenCalledWith(
      1,
      expect.any(Number),
      expect.any(Function),
    );
  });

  it("skips a vendor with a slot conflict and cascades to the next pending vendor", async () => {
    const booking = makeBooking();
    const attempt1 = makeAttempt({ id: 100, providerId: 41, rank: 1 });
    const attempt2 = makeAttempt({ id: 101, providerId: 42, rank: 2 });
    const provider = makeProvider({ id: 42 });

    mockSelect
      .mockReturnValueOnce(makeChain([booking]))
      .mockReturnValueOnce(makeChain([]))
      .mockReturnValueOnce(makeChain([attempt1, attempt2]))
      .mockReturnValueOnce(makeChain([{ id: 77 }]))
      .mockReturnValueOnce(makeChain([booking]))
      .mockReturnValueOnce(makeChain([]))
      .mockReturnValueOnce(makeChain([attempt2]))
      .mockReturnValueOnce(makeChain([]))
      .mockReturnValueOnce(makeChain([provider]));

    mockUpdate
      .mockReturnValueOnce(makeChain(undefined))
      .mockReturnValueOnce(makeChain(undefined));

    const result = await dispatchNextVendor(1);

    expect(result).toBe(42);
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: 41 }),
      "dispatchNextVendor: vendor no longer available for slot, skipping",
    );
    expect(mockEmitToVendor).toHaveBeenCalledWith(
      42,
      "NEW_LEAD",
      expect.objectContaining({ bookingId: 1, providerId: 42 }),
    );
  });

  it("times out in-flight dispatched attempts and cascades to the next pending vendor", async () => {
    const booking = makeBooking();
    const previouslyDispatched = makeAttempt({ id: 99, providerId: 40, status: "dispatched" });
    const nextAttempt = makeAttempt({ id: 100, providerId: 42, rank: 2 });
    const provider = makeProvider({ id: 42 });

    mockSelect
      .mockReturnValueOnce(makeChain([booking]))
      .mockReturnValueOnce(makeChain([previouslyDispatched]))
      .mockReturnValueOnce(makeChain([nextAttempt]))
      .mockReturnValueOnce(makeChain([]))
      .mockReturnValueOnce(makeChain([provider]));

    mockUpdate
      .mockReturnValueOnce(makeChain(undefined))
      .mockReturnValueOnce(makeChain(undefined));

    const result = await dispatchNextVendor(1);

    expect(result).toBe(42);
    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect(mockEmitToVendor).toHaveBeenCalledWith(
      42,
      "NEW_LEAD",
      expect.objectContaining({ bookingId: 1 }),
    );
  });

  it("cascades to the next vendor after the current vendor explicitly rejects the lead", async () => {
    const booking = makeBooking();
    const secondAttempt = makeAttempt({ id: 101, providerId: 50, rank: 2 });
    const provider = makeProvider({ id: 50 });

    mockSelect
      .mockReturnValueOnce(makeChain([booking]))
      .mockReturnValueOnce(makeChain([]))
      .mockReturnValueOnce(makeChain([secondAttempt]))
      .mockReturnValueOnce(makeChain([]))
      .mockReturnValueOnce(makeChain([provider]));

    mockUpdate.mockReturnValue(makeChain(undefined));

    const result = await dispatchNextVendor(1);

    expect(result).toBe(50);
    expect(mockEmitToVendor).toHaveBeenCalledWith(
      50,
      "NEW_LEAD",
      expect.objectContaining({ bookingId: 1, providerId: 50 }),
    );
    expect(mockMarkPendingLead).toHaveBeenCalledWith(
      1,
      expect.any(Number),
      expect.any(Function),
    );
  });
});

describe("markVendorAccepted", () => {
  it("returns false when no dispatched row is found for that booking + vendor", async () => {
    mockUpdate.mockReturnValueOnce(makeChain([]));

    const result = await markVendorAccepted(1, 42);

    expect(result).toBe(false);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it("returns true and flips all remaining pending rows to skipped", async () => {
    const acceptedAttempt = makeAttempt({ status: "accepted" });

    mockUpdate
      .mockReturnValueOnce(makeChain([acceptedAttempt]))
      .mockReturnValueOnce(makeChain(undefined));

    const result = await markVendorAccepted(1, 42);

    expect(result).toBe(true);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });

  it("does not update pending rows when the dispatched row is not found", async () => {
    mockUpdate.mockReturnValueOnce(makeChain([]));

    await markVendorAccepted(1, 42);

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("a second accept for the same booking returns false when the row is already taken (race condition loser)", async () => {
    mockUpdate.mockReturnValueOnce(makeChain([]));

    const result = await markVendorAccepted(1, 99);

    expect(result).toBe(false);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("returns false when the DB unique constraint fires (two concurrent accepts for the same booking)", async () => {
    const uniqueViolation = Object.assign(new Error("duplicate key"), { code: "23505" });
    mockTransaction.mockRejectedValueOnce(uniqueViolation);

    const result = await markVendorAccepted(1, 42);

    expect(result).toBe(false);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it("re-throws unexpected errors from the transaction", async () => {
    const unexpected = new Error("connection lost");
    mockTransaction.mockRejectedValueOnce(unexpected);

    await expect(markVendorAccepted(1, 42)).rejects.toThrow("connection lost");
  });
});

describe("markVendorRejected", () => {
  it("returns false when no dispatched attempt is found for that booking + vendor", async () => {
    mockUpdate.mockReturnValueOnce(makeChain([]));

    const result = await markVendorRejected(1, 42);

    expect(result).toBe(false);
  });

  it("returns true when the dispatched attempt is successfully marked rejected", async () => {
    const rejectedAttempt = makeAttempt({ status: "rejected" });
    mockUpdate.mockReturnValueOnce(makeChain([rejectedAttempt]));

    const result = await markVendorRejected(1, 42);

    expect(result).toBe(true);
  });
});

describe("seedDispatchQueue", () => {
  it("returns 0 and does not insert when no ranked providers are found", async () => {
    mockGetRankedProviders.mockResolvedValueOnce([]);

    const count = await seedDispatchQueue(1, "plumbing", "2025-06-01", "10:00");

    expect(count).toBe(0);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("inserts one row per ranked provider with correct rank order", async () => {
    const providers = [
      makeProvider({ id: 1 }),
      makeProvider({ id: 2 }),
      makeProvider({ id: 3 }),
    ];
    mockGetRankedProviders.mockResolvedValueOnce(providers);

    const insertChain = makeChain(undefined);
    mockInsert.mockReturnValueOnce(insertChain);

    const count = await seedDispatchQueue(1, "plumbing", "2025-06-01", "10:00");

    expect(count).toBe(3);
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(insertChain.values).toHaveBeenCalledWith([
      expect.objectContaining({ bookingId: 1, providerId: 1, rank: 1, status: "pending" }),
      expect.objectContaining({ bookingId: 1, providerId: 2, rank: 2, status: "pending" }),
      expect.objectContaining({ bookingId: 1, providerId: 3, rank: 3, status: "pending" }),
    ]);
  });

  it("passes the correct category, date, and time to getRankedProviders", async () => {
    mockGetRankedProviders.mockResolvedValueOnce([]);

    await seedDispatchQueue(5, "electrical", "2025-07-15", "14:30");

    expect(mockGetRankedProviders).toHaveBeenCalledWith("electrical", "2025-07-15", "14:30");
  });
});

describe("handleVendorOffline", () => {
  it("does nothing when the vendor has no dispatched attempt (already resolved or never dispatched)", async () => {
    mockUpdate.mockReturnValueOnce(makeChain([]));

    await handleVendorOffline(42);

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockClearPendingLead).not.toHaveBeenCalled();
    expect(mockLogger.info).not.toHaveBeenCalled();
  });

  it("marks the dispatched attempt timed_out and cascades dispatch when the vendor disconnects", async () => {
    const timedOutAttempt = makeAttempt({ id: 99, bookingId: 1, providerId: 42, status: "timed_out" });

    mockUpdate.mockReturnValueOnce(makeChain([timedOutAttempt]));
    mockSelect.mockReturnValue(makeChain([]));

    await handleVendorOffline(42);

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockClearPendingLead).toHaveBeenCalledWith(1);
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({ bookingId: 1, providerId: 42 }),
      "handleVendorOffline: attempt timed_out due to disconnect, cascading dispatch",
    );
  });

  it("does not clear the timer or cascade when the attempt was already accepted before the update ran (race condition)", async () => {
    mockUpdate.mockReturnValueOnce(makeChain([]));

    await handleVendorOffline(42);

    expect(mockClearPendingLead).not.toHaveBeenCalled();
    expect(mockLogger.info).not.toHaveBeenCalled();
  });

  it("cascades each booking independently when the vendor has multiple in-flight attempts", async () => {
    const attempt1 = makeAttempt({ id: 10, bookingId: 1, providerId: 42, status: "timed_out" });
    const attempt2 = makeAttempt({ id: 11, bookingId: 2, providerId: 42, status: "timed_out" });

    mockUpdate.mockReturnValueOnce(makeChain([attempt1, attempt2]));
    mockSelect.mockReturnValue(makeChain([]));

    await handleVendorOffline(42);

    expect(mockClearPendingLead).toHaveBeenCalledTimes(2);
    expect(mockClearPendingLead).toHaveBeenCalledWith(1);
    expect(mockClearPendingLead).toHaveBeenCalledWith(2);
    expect(mockLogger.info).toHaveBeenCalledTimes(2);
  });
});
