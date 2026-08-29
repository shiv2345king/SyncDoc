import { Server as SocketIOServer, Socket } from "socket.io";
import { acquireBlockLock, releaseBlockLock } from "./blockLock";

interface LockRequestPayload {
  blockId: string;
  userId: string;
}

export const initSocketLocking = (io: SocketIOServer): void => {
  io.on("connection", (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("block:lock:request", async ({ blockId, userId }: LockRequestPayload) => {
      const acquired = await acquireBlockLock(blockId, userId);

      socket.emit("block:lock:result", { blockId, acquired });

      if (acquired) {
        socket.broadcast.emit("block:locked", { blockId, userId });
      }
    });

    socket.on("block:lock:release", async ({ blockId, userId }: LockRequestPayload) => {
      await releaseBlockLock(blockId, userId);
      socket.broadcast.emit("block:unlocked", { blockId });
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};