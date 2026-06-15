const pendingLeadTimers = new Map<number, ReturnType<typeof setTimeout>>();

export function clearPendingLead(bookingId: number) {
  const timer = pendingLeadTimers.get(bookingId);
  if (timer) clearTimeout(timer);
  pendingLeadTimers.delete(bookingId);
}

export function markPendingLead(bookingId: number, timeoutMs: number, onExpire: () => void) {
  clearPendingLead(bookingId);
  const timer = setTimeout(() => {
    pendingLeadTimers.delete(bookingId);
    onExpire();
  }, timeoutMs);
  pendingLeadTimers.set(bookingId, timer);
}
