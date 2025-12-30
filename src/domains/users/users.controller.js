import prisma from '../../utils/prisma.js';
import bcrypt from 'bcryptjs';

/**
 * Get user profile
 * GET /api/v1/users/profile
 */
export const getProfile = async (req, res) => {
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
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar perfil',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update user profile
 * PUT /api/v1/users/profile
 */
export const updateProfile = async (req, res) => {
  try {
    const user = req.user;
    const updates = req.body;

    // Fields that can be updated based on user role
    let profileData = {};

    if (user.role === 'MOTHER') {
      const { fullName, bio, phone, location, interests, avatar } = updates;

      profileData = {
        motherProfile: {
          update: {
            ...(fullName && { fullName }),
            ...(bio !== undefined && { bio }),
            ...(phone !== undefined && { phone }),
            ...(location !== undefined && { location }),
            ...(interests && { interests }),
            ...(avatar !== undefined && { avatar })
          }
        }
      };
    } else if (user.role === 'COLLABORATOR') {
      const { fullName, bio, phone, profession, specialties, credentials, avatar } = updates;

      profileData = {
        collaboratorProfile: {
          update: {
            ...(fullName && { fullName }),
            ...(bio !== undefined && { bio }),
            ...(phone !== undefined && { phone }),
            ...(profession && { profession }),
            ...(specialties && { specialties }),
            ...(credentials !== undefined && { credentials }),
            ...(avatar !== undefined && { avatar })
          }
        }
      };
    } else if (user.role === 'ADMIN') {
      const { fullName, avatar } = updates;

      profileData = {
        adminProfile: {
          update: {
            ...(fullName && { fullName }),
            ...(avatar !== undefined && { avatar })
          }
        }
      };
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: profileData,
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

    const { passwordHash: _, ...userWithoutPassword } = updatedUser;

    res.status(200).json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar perfil',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Change password
 * PUT /api/v1/users/password
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Senha atual e nova senha são obrigatórias'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'A nova senha deve ter pelo menos 6 caracteres'
      });
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: req.userId }
    });

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Senha atual incorreta'
      });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: req.userId },
      data: { passwordHash }
    });

    res.status(200).json({
      success: true,
      message: 'Senha alterada com sucesso'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao alterar senha',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Complete onboarding (Mother only)
 * POST /api/v1/users/onboarding
 */
export const completeOnboarding = async (req, res) => {
  try {
    if (req.user.role !== 'MOTHER') {
      return res.status(403).json({
        success: false,
        message: 'Apenas mães podem completar o onboarding'
      });
    }

    const { isFirstPregnancy, interests } = req.body;

    const motherProfile = await prisma.motherProfile.update({
      where: { userId: req.userId },
      data: {
        onboardingDone: true,
        ...(isFirstPregnancy !== undefined && { isFirstPregnancy }),
        ...(interests && { interests })
      }
    });

    res.status(200).json({
      success: true,
      message: 'Onboarding concluído com sucesso',
      data: motherProfile
    });
  } catch (error) {
    console.error('Complete onboarding error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao completar onboarding',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
