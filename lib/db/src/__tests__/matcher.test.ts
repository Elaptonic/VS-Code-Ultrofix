import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSelect, capturedEqCalls } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  capturedEqCalls: [] as unknown[][],
}));

vi.mock("../db", () => ({
  db: {
    select: mockSelect,
  },
}));

vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual<typeof import("drizzle-orm")>("drizzle-orm");
  return {
    ...actual,
    eq: (...args: unknown[]) => {
      capturedEqCalls.push(args);
      return (actual.eq as (...a: unknown[]) => unknown)(...args);
    },
  };
});

import { getRankedProviders } from "../matcher";

function makeChain(result: unknown) {
  const p = Promise.resolve(result);
  const ch: any = {
    from: vi.fn().mockImplementation(() => ch),
    where: vi.fn().mockImplementation(() => ch),
    orderBy: vi.fn().mockImplementation(() => ch),
    then: p.then.bind(p),
    catch: p.catch.bind(p),
    finally: p.finally.bind(p),
  };
  return ch;
}

function makeProvider(overrides: Partial<{
  id: number;
  category: string;
  isOnline: boolean;
  jobsCompleted: number;
  rating: number;
}> = {}) {
  return {
    id: overrides.id ?? 1,
    userId: null,
    slug: `provider-${overrides.id ?? 1}`,
    name: "Test Provider",
    initials: "TP",
    bio: "",
    rating: overrides.rating ?? 4.5,
    reviewCount: 0,
    jobsCompleted: overrides.jobsCompleted ?? 0,
    specializations: [] as string[],
    experience: "",
    verified: false,
    category: overrides.category ?? "plumbing",
    serviceAreas: [] as string[],
    hourlyRate: 0,
    idDocumentUrl: null,
    onboardingComplete: true,
    latitude: 12.97,
    longitude: 77.59,
    isOnline: overrides.isOnline ?? true,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  capturedEqCalls.length = 0;
});

describe("getRankedProviders", () => {
  it("returns only providers matching the requested service category", async () => {
    const plumber = makeProvider({ id: 1, category: "plumbing" });

    mockSelect
      .mockReturnValueOnce(makeChain([]))                       // busy bookings
      .mockReturnValueOnce(makeChain([plumber]))                 // candidates
      .mockReturnValueOnce(makeChain([{ providerId: 1 }]));     // active subscriptions

    const result = await getRankedProviders("plumbing", "2025-06-01", "10:00");

    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(1);
    expect(result[0]!.category).toBe("plumbing");
  });

  it("encodes the service category inside the DB query predicate", async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([]))   // busy bookings
      .mockReturnValueOnce(makeChain([]))   // candidates
      .mockReturnValueOnce(makeChain([]));  // active subscriptions

    await getRankedProviders("electrical", "2025-06-01", "10:00");

    const calledWithCategory = capturedEqCalls.some(([, val]) => val === "electrical");
    expect(calledWithCategory).toBe(true);
  });

  it("excludes providers who have an accepted or in_progress booking at the requested slot", async () => {
    const busyProvider = makeProvider({ id: 10, category: "cleaning" });
    const freeProvider = makeProvider({ id: 11, category: "cleaning" });

    mockSelect
      .mockReturnValueOnce(makeChain([{ providerId: 10 }]))                          // busy bookings
      .mockReturnValueOnce(makeChain([busyProvider, freeProvider]))                   // candidates
      .mockReturnValueOnce(makeChain([{ providerId: 10 }, { providerId: 11 }]));     // active subscriptions

    const result = await getRankedProviders("cleaning", "2025-06-01", "14:00");

    const returnedIds = result.map((p) => p.id);
    expect(returnedIds).not.toContain(10);
    expect(returnedIds).toContain(11);
  });

  it("includes all online providers when no one is busy at that slot", async () => {
    const p1 = makeProvider({ id: 1, category: "plumbing" });
    const p2 = makeProvider({ id: 2, category: "plumbing" });

    mockSelect
      .mockReturnValueOnce(makeChain([]))                                         // busy bookings
      .mockReturnValueOnce(makeChain([p1, p2]))                                   // candidates
      .mockReturnValueOnce(makeChain([{ providerId: 1 }, { providerId: 2 }]));   // active subscriptions

    const result = await getRankedProviders("plumbing", "2025-06-01", "09:00");

    expect(result).toHaveLength(2);
  });

  it("sorts providers by jobsCompleted descending, then rating descending", async () => {
    const senior = makeProvider({ id: 1, jobsCompleted: 100, rating: 4.0, category: "plumbing" });
    const junior = makeProvider({ id: 2, jobsCompleted: 10, rating: 5.0, category: "plumbing" });
    const mid = makeProvider({ id: 3, jobsCompleted: 100, rating: 4.8, category: "plumbing" });

    mockSelect
      .mockReturnValueOnce(makeChain([]))                                                             // busy bookings
      .mockReturnValueOnce(makeChain([senior, junior, mid]))                                          // candidates
      .mockReturnValueOnce(makeChain([{ providerId: 1 }, { providerId: 2 }, { providerId: 3 }]));   // active subscriptions

    const result = await getRankedProviders("plumbing", "2025-06-01", "10:00");

    expect(result[0]!.id).toBe(3);
    expect(result[1]!.id).toBe(1);
    expect(result[2]!.id).toBe(2);
  });

  it("returns an empty array when no providers are online in the category", async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([]))   // busy bookings
      .mockReturnValueOnce(makeChain([]))   // candidates
      .mockReturnValueOnce(makeChain([]));  // active subscriptions

    const result = await getRankedProviders("plumbing", "2025-06-01", "10:00");

    expect(result).toHaveLength(0);
  });

  it("returns empty array when all online providers in the category are busy", async () => {
    const p1 = makeProvider({ id: 5, category: "plumbing" });
    const p2 = makeProvider({ id: 6, category: "plumbing" });

    mockSelect
      .mockReturnValueOnce(makeChain([{ providerId: 5 }, { providerId: 6 }]))                // busy bookings
      .mockReturnValueOnce(makeChain([p1, p2]))                                               // candidates
      .mockReturnValueOnce(makeChain([{ providerId: 5 }, { providerId: 6 }]));               // active subscriptions

    const result = await getRankedProviders("plumbing", "2025-06-01", "10:00");

    expect(result).toHaveLength(0);
  });
});
