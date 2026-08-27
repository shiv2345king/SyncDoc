import http from "http";
import app from "./app";
import  dbConnect  from "./src/db/dbConnect";
import { initYjsServer } from "./src/realTime/yjsServer";

const PORT = process.env.PORT || 5000;

const startServer = async (): Promise<void> => {
  await dbConnect();

  const server = http.createServer(app);

  initYjsServer(server);

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();