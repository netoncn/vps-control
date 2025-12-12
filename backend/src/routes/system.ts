import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SystemService } from '../services/systemService';

type AuthHandler = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

type RouteDeps = {
  system: SystemService;
  auth?: AuthHandler;
};

export async function systemRoutes(fastify: FastifyInstance, deps: RouteDeps) {
  const { system, auth } = deps;
  const preHandler = auth ? [auth] : [];

  fastify.get('/api/system/overview', { preHandler }, async () => {
    return system.overview();
  });
}
