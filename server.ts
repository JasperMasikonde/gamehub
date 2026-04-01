import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error handling request:", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["websocket", "polling"],
  });

  // Make io accessible from API routes / server utilities
  (global as Record<string, unknown>).socketIO = io;

  io.on("connection", (socket) => {
    // Client sends their userId so we put them in a personal room
    socket.on("authenticate", (userId: string) => {
      if (typeof userId === "string" && userId.length > 0) {
        socket.join(`user:${userId}`);
      }
    });

    // Admin can join admin room to receive broadcast confirmations
    socket.on("join-admin", () => {
      socket.join("admins");
    });

    // Join a challenge room to receive real-time messages and updates
    socket.on("join-challenge", (challengeId: string) => {
      if (typeof challengeId === "string" && challengeId.length > 0) {
        socket.join(`challenge:${challengeId}`);
      }
    });

    // Join a tournament room to receive live bracket/score updates
    socket.on("join-tournament", (slug: string) => {
      if (typeof slug === "string" && slug.length > 0) {
        socket.join(`tournament:${slug}`);
      }
    });

    socket.on("disconnect", () => {
      // rooms cleaned up automatically by socket.io
    });
  });

  httpServer
    .once("error", (err: NodeJS.ErrnoException) => {
      console.error("Server error:", err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`\n> Ready on http://localhost:${port}`);
    });
});
