import { createServer } from 'http';
import { WebSocketServer } from 'ws';

// Standalone Yjs sync server with heartbeat & robust lifecycle management
const port = Number(process.env.COLLAB_WS_PORT) || 1234;

const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        docsCount: docs.size,
        timestamp: new Date().toISOString(),
      }),
    );
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Yjs Collaboration WS Server is running\n');
});

const wss = new WebSocketServer({
  server,
  maxPayload: 10 * 1024 * 1024, // 10MB max message size
});

// Map of docName -> Set of WebSocket clients
const docs = new Map<string, Set<any>>();

const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws: any) => {
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

wss.on('connection', (ws: any, req: any) => {
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  const docName = req.url
    ? req.url.slice(1).split('?')[0] || 'default'
    : 'default';

  if (!docs.has(docName)) {
    docs.set(docName, new Set());
  }
  const conns = docs.get(docName)!;
  conns.add(ws);

  ws.on('message', (message: any, isBinary: boolean) => {
    // Broadcast updates to all other clients connected to the same document
    for (const client of conns) {
      if (client !== ws && client.readyState === 1 /* OPEN */) {
        client.send(message, { binary: isBinary });
      }
    }
  });

  ws.on('close', () => {
    conns.delete(ws);
    if (conns.size === 0) {
      docs.delete(docName);
    }
  });

  ws.on('error', (err: any) => {
    console.error(`[Yjs] Error on doc ${docName}:`, err);
  });
});

server.listen(port, () => {
  console.log(
    `[Yjs] Standalone Collaboration WS server running on ws://0.0.0.0:${port}`,
  );
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('[Yjs] SIGTERM received. Closing Collaboration WS Server...');
  clearInterval(heartbeatInterval);
  wss.close(() => {
    server.close(() => {
      console.log('[Yjs] Server closed.');
      process.exit(0);
    });
  });
});
