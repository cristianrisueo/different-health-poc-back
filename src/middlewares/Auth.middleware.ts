import jwt from 'jsonwebtoken';

export const AuthMiddleware = async (request, reply) => {
  const { authorization } = request.headers;

  // if (!authorization) {
  //   reply.code(401).send({ message: 'Unauthorized', isKO: true });
  //   return;
  // }

  const [, token] = authorization.split(' ');

  try {
    // TODO: Implement auth middleware

    return;
  } catch (error) {
    reply.code(401).send({ message: 'Unauthorized' });
  }
};
