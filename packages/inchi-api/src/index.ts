import { buildApp } from './app.ts';
import { HOST, PORT } from './config.ts';

const app = await buildApp();
await app.listen({ host: HOST, port: PORT });
