import { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer | null = null;

export function setIO(instance: SocketIOServer) {
  io = instance;
}

export function getIO() {
  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}

export function emitToVendor(providerId: number, event: string, payload: unknown) {
  if (!io) return;
  io.to(`vendor:${providerId}`).emit(event, payload);
}
