import express from "express";
import http from "http";
import path from "path";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  
  const PORT = process.env.PORT || 3000;

  // Track connected devices
  const devices = new Map<string, { id: string; name: string; type: string }>();

  // WebRTC Signaling Server Logic
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("register", (deviceInfo: { name: string; type: string }) => {
      devices.set(socket.id, { id: socket.id, name: deviceInfo.name, type: deviceInfo.type });
      // Broadcast updated device list to all
      io.emit("devices-updated", Array.from(devices.values()));
    });

    socket.on("request-connection", (data: { targetId: string, fromDevice: any }) => {
      io.to(data.targetId).emit("connection-requested", {
        from: socket.id,
        device: data.fromDevice
      });
    });

    socket.on("accept-connection", (data: { targetId: string }) => {
      io.to(data.targetId).emit("connection-accepted", {
        from: socket.id
      });
    });
    
    socket.on("reject-connection", (data: { targetId: string }) => {
      io.to(data.targetId).emit("connection-rejected", {
        from: socket.id
      });
    });

    // Handle signaling data (WebRTC offers, answers, ICE candidates)
    socket.on("signal", (data: { targetId: string; signal: any }) => {
      io.to(data.targetId).emit("signal", {
        signal: data.signal,
        from: socket.id
      });
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
      devices.delete(socket.id);
      io.emit("devices-updated", Array.from(devices.values()));
    });
  });

  // API Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Fallback to index.html for SPA
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0" as any, () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
