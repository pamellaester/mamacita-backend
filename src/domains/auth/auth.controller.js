import bcrypt from 'bcryptjs';
import prisma from '../../utils/prisma.js';
import { generateToken } from '../../utils/jwt.js';
import { isValidEmail, isValidPassword, validateRequiredFields } from '../../utils/validation.js';

/**
 * Register a new user (Mother or Collaborator)
 * POST /api/v1/auth/register
 */
export const register = async (req, res) => {
  try {
    const { email, password, role, fullName, profession, specialties } = req.body;

    // Validate required fields
    const { valid, missing } = validateRequiredFields(req.body, ['email', 'password', 'role', 'fullName']);
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: `Campos obrigatórios ausentes: ${missing.join(', ')}`
      });
    }

    // Validate email
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email inválido'
      });
    }

    // Validate password
    if (!isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'A senha deve ter pelo menos 6 caracteres'
      });
    }

    // Validate role
    if (!['MOTHER', 'COLLABORATOR'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role inválido. Use MOTHER ou COLLABORATOR'
      });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Este email já está cadastrado'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with profile based on role
    let userData = {
      email,
      passwordHash,
      role,
      isVerified: false // Email verification can be added later
    };

    if (role === 'MOTHER') {
      userData.motherProfile = {
        create: {
          fullName,
          onboardingDone: false
        }
      };
    } else if (role === 'COLLABORATOR') {
      // Validate collaborator-specific fields
      if (!profession) {
        return res.status(400).json({
          success: false,
          message: 'Profissão é obrigatória para colaboradores'
        });
      }

      userData.collaboratorProfile = {
        create: {
          fullName,
          profession,
          specialties: specialties || [],
          isVerified: false // Admin will verify collaborators
        }
      };
    }

    const user = await prisma.user.create({
      data: userData,
      include: {
        motherProfile: true,
        collaboratorProfile: true
      }
    });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Return user data without password
    const { passwordHash: _, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      data: {
        user: userWithoutPassword,
        token
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar usuário',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Login user
 * POST /api/v1/auth/login
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    const { valid, missing } = validateRequiredFields(req.body, ['email', 'password']);
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: `Campos obrigatórios ausentes: ${missing.join(', ')}`
      });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        motherProfile: {
          include: {
            pregnancy: true
          }
        },
        collaboratorProfile: true,
        adminProfile: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou senha incorretos'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email ou senha incorretos'
      });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Return user data without password
    const { passwordHash: _, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        user: userWithoutPassword,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao fazer login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get current authenticated user
 * GET /api/v1/auth/me
 */
export const getCurrentUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        motherProfile: {
          include: {
            pregnancy: true
          }
        },
        collaboratorProfile: true,
        adminProfile: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const { passwordHash: _, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar usuário',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
