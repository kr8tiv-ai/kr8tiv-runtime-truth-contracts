try {
  console.log('Loading server module...');
  const { createServer } = await import('./api/server.ts');
  console.log('Creating server...');
  const s = await createServer();
  console.log('Starting listener on 3002...');
  await s.listen({ port: 3002, host: '127.0.0.1' });
  console.log('KIN API READY on http://127.0.0.1:3002');
} catch(e) {
  console.error('FATAL:', e.message);
  console.error(e.stack);
  process.exit(1);
}
