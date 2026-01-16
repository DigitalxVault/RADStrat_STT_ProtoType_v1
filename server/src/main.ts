import app from './app.js';
import { config } from './config/index.js';

const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           RADStrat STT Prototype Server                    ║
╠════════════════════════════════════════════════════════════╣
║  Status:     Running                                       ║
║  Port:       ${PORT.toString().padEnd(45)}║
║  Mode:       ${config.nodeEnv.padEnd(45)}║
║  Time:       ${new Date().toISOString().padEnd(45)}║
╠════════════════════════════════════════════════════════════╣
║  Endpoints:                                                ║
║    GET  /api/health          Health check                  ║
║    POST /api/stt/transcribe  Speech-to-Text                ║
║    POST /api/score/evaluate  Score evaluation              ║
║    GET  /api/scenarios       Get scenarios                 ║
║    GET  /api/pricing         Get pricing info              ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });

  // Force shutdown after 10s
  setTimeout(() => {
    console.error('Forced shutdown due to timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
