import { verifyToken } from '../utils/jwt.js';
import prisma from '../utils/prisma.js';

/**
 * Middleware to verify JWT token and attach user to request
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticação não fornecido'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = verifyToken(token);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        motherProfile: true,
        collaboratorProfile: true,
        adminProfile: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;
    req.userRole = user.role;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido ou expirado'
    });
  }
};

/**
 * Middleware to check if user has specific role(s)
 * @param  {...string} roles - Allowed roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Não autenticado'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para acessar este recurso'
      });
    }

    next();
  };
};

/**
 * Middleware to check if user is a mother
 */
export const isMother = authorize('MOTHER');

/**
 * Middleware to check if user is a collaborator
 */
export const isCollaborator = authorize('COLLABORATOR');

/**
 * Middleware to check if user is an admin
 */
export const isAdmin = authorize('ADMIN');

/**
 * Middleware to check if user is a collaborator or admin
 */
export const isCollaboratorOrAdmin = authorize('COLLABORATOR', 'ADMIN');
