import { startServer } from './api/server.js';
startServer({ host: '127.0.0.1', port: Number(process.env.PORT) || 3002, environment: 'development' });
