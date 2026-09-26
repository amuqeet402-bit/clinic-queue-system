import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { setupSocketHandlers } from './src/socket/socketHandler';
import { queueService } from './src/db/queueService';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url || '', true);
      const { pathname } = parsedUrl;

      // REST API fallbacks for queue state
      if (pathname === '/api/queue/state' && req.method === 'GET') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(queueService.getState()));
        return;
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // Attach Socket.IO to same HTTP server
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  setupSocketHandlers(io);

  server.listen(port, () => {
    console.log(`\n======================================================`);
    console.log(`🏥 CLINIC QUEUE SYSTEM IS READY!`);
    console.log(`> Local Network Server: http://localhost:${port}`);
    console.log(`> Patient View:         http://localhost:${port}/patient`);
    console.log(`> Doctor Dashboard:     http://localhost:${port}/doctor`);
    console.log(`> Reception / TV Screen:http://localhost:${port}/tv`);
    console.log(`======================================================\n`);
  });
});
