import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SSHClient } from '../services/sshClient';

type AuthHandler = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

type RouteDeps = {
  ssh: SSHClient;
  auth?: AuthHandler;
};

export async function settingsRoutes(fastify: FastifyInstance, deps: RouteDeps) {
  const { ssh, auth } = deps;
  const preHandler = auth ? [auth] : [];

  // Health check - sempre publico
  fastify.get('/health', async () => ({ ok: true }));

  // Test SSH - protegido
  fastify.get('/api/settings/test', { preHandler }, async () => {
    const result = await ssh.exec('echo ssh-ok');
    return { ok: true, output: result.stdout.trim() };
  });
}
