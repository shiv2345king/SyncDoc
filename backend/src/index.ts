import "./env";

import http from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app";
import dbConnect from "./db/dbConnect";
import { initYjsServer } from "./realTime/yjsServer";
import { initSocketLocking } from "./realTime/socketLocking";

const PORT = process.env.PORT || 5000;

const startServer = async (): Promise<void> => {
  await dbConnect();

  const server = http.createServer(app);

  initYjsServer(server);

  const io = new SocketIOServer(server, {
    cors: { origin: "*" },
  });
  initSocketLocking(io);

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();