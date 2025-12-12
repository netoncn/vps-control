import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import bcrypt from 'bcryptjs';

export type AuthConfig = {
  jwtSecret: string;
  username: string;
  passwordHash: string;
  enabled: boolean;
};

export async function registerAuth(fastify: FastifyInstance, config: AuthConfig) {
  if (!config.enabled) {
    return;
  }

  await fastify.register(fastifyJwt, {
    secret: config.jwtSecret,
  });

  // Decorator para verificar autenticacao
  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });
}

export function createAuthRoutes(fastify: FastifyInstance, config: AuthConfig) {
  // Rota de login
  fastify.post<{ Body: { username: string; password: string } }>(
    '/api/auth/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string' },
            password: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { username, password } = request.body;

      // Verificar credenciais
      if (username !== config.username) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(password, config.passwordHash);
      if (!validPassword) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      // Gerar token
      const token = fastify.jwt.sign(
        { username },
        { expiresIn: '24h' }
      );

      return { token };
    }
  );

  // Rota para verificar token
  fastify.get('/api/auth/verify', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    return { valid: true, user: request.user };
  });
}

// Helper para gerar hash de senha (usar uma vez para criar o hash)
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
