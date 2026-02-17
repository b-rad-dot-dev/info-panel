const express = require('express');
const path = require('path');
const fs = require('fs');
const chokidar = require('chokidar');
const WebSocket = require('ws');

const app = express();
const PORT = 3000;
const CONFIG_PATH = process.env.CONFIG_PATH || path.join(__dirname, 'config.json');

app.use((req, res, next) => {
  res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "connect-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "font-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "frame-ancestors 'none'"
      ].join('; ')
  );
  next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/modules', express.static(path.join(__dirname, 'modules')));

// Parsing
app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

require('./routes')(app)

const moduleLoader = require('./moduleLoader');
const modules = moduleLoader.loadModules();
let requestCounter = 0;

app.all("/modules/:moduleName/:routePath", async (req, res) => {
    const { moduleName, routePath } = req.params;

    const mod = modules[moduleName];
    if (!mod) return res.status(404).json({ error: "Module not found" });

    const id = ++requestCounter;

    const promise = new Promise((resolve, reject) => {
        mod.pending.set(id, { resolve, reject });
    });

    mod.process.send({
        id,
        routePath: `/${routePath}`,
        method: req.method,
        payload: {
            query: req.query,
            body: req.body
        }
    });

    try {
        const result = await promise;
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err });
    }
});


// Start HTTP server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Dashboard server running at http://0.0.0.0:${PORT}`);
  console.log(`Watching config file: ${CONFIG_PATH}`);
});

// WebSocket server for live reload
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.on('close', () => console.log('Client disconnected'));
});

// Watch config file for changes
const watcher = chokidar.watch(CONFIG_PATH, {
  persistent: true,
  ignoreInitial: true
});

watcher.on('change', () => {
  console.log('Config file changed, notifying clients...');
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'config-changed' }));
    }
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  watcher.close();
  server.close();
  process.exit(0);
});
