import prisma from '../../utils/prisma.js';
import { isFutureDate, validateRequiredFields } from '../../utils/validation.js';

/**
 * Calculate current pregnancy week based on due date
 * @param {Date} dueDate
 * @returns {number} Current week (1-40)
 */
const calculateCurrentWeek = (dueDate) => {
  const now = new Date();
  const due = new Date(dueDate);

  // Pregnancy is 40 weeks (280 days)
  const weeksSinceLMP = 40;
  const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000;

  const weeksUntilDue = (due - now) / millisecondsPerWeek;
  const currentWeek = Math.floor(weeksSinceLMP - weeksUntilDue);

  // Clamp between 1 and 40
  return Math.max(1, Math.min(40, currentWeek));
};

/**
 * Create pregnancy for current user (Mother only)
 * POST /api/v1/pregnancy
 */
export const createPregnancy = async (req, res) => {
  try {
    if (req.user.role !== 'MOTHER') {
      return res.status(403).json({
        success: false,
        message: 'Apenas mães podem criar rastreamento de gravidez'
      });
    }

    const { dueDate } = req.body;

    // Validate required fields
    const { valid, missing } = validateRequiredFields(req.body, ['dueDate']);
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: `Campos obrigatórios ausentes: ${missing.join(', ')}`
      });
    }

    // Validate due date is in the future
    if (!isFutureDate(dueDate)) {
      return res.status(400).json({
        success: false,
        message: 'A data prevista deve ser no futuro'
      });
    }

    // Check if mother already has active pregnancy
    const motherProfile = await prisma.motherProfile.findUnique({
      where: { userId: req.userId },
      include: { pregnancy: true }
    });

    if (motherProfile.pregnancy && motherProfile.pregnancy.status === 'ACTIVE') {
      return res.status(409).json({
        success: false,
        message: 'Você já tem uma gravidez ativa'
      });
    }

    // Calculate current week
    const currentWeek = calculateCurrentWeek(dueDate);

    // Create pregnancy
    const pregnancy = await prisma.pregnancy.create({
      data: {
        motherProfileId: motherProfile.id,
        dueDate: new Date(dueDate),
        currentWeek,
        status: 'ACTIVE'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Gravidez criada com sucesso',
      data: pregnancy
    });
  } catch (error) {
    console.error('Create pregnancy error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar gravidez',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get current pregnancy for authenticated mother
 * GET /api/v1/pregnancy/current
 */
export const getCurrentPregnancy = async (req, res) => {
  try {
    if (req.user.role !== 'MOTHER') {
      return res.status(403).json({
        success: false,
        message: 'Apenas mães podem acessar rastreamento de gravidez'
      });
    }

    const motherProfile = await prisma.motherProfile.findUnique({
      where: { userId: req.userId },
      include: {
        pregnancy: {
          where: {
            status: 'ACTIVE'
          },
          include: {
            symptomLogs: {
              orderBy: { loggedAt: 'desc' },
              take: 10
            },
            checklistItems: {
              where: {
                week: {
                  lte: await prisma.motherProfile.findUnique({
                    where: { userId: req.userId }
                  }).then(mp => mp?.pregnancy?.currentWeek || 1)
                }
              },
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    });

    if (!motherProfile?.pregnancy) {
      return res.status(404).json({
        success: false,
        message: 'Nenhuma gravidez ativa encontrada'
      });
    }

    // Recalculate current week
    const updatedWeek = calculateCurrentWeek(motherProfile.pregnancy.dueDate);

    // Update if week changed
    if (updatedWeek !== motherProfile.pregnancy.currentWeek) {
      await prisma.pregnancy.update({
        where: { id: motherProfile.pregnancy.id },
        data: { currentWeek: updatedWeek }
      });
      motherProfile.pregnancy.currentWeek = updatedWeek;
    }

    res.status(200).json({
      success: true,
      data: motherProfile.pregnancy
    });
  } catch (error) {
    console.error('Get current pregnancy error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar gravidez',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update pregnancy
 * PUT /api/v1/pregnancy/:id
 */
export const updatePregnancy = async (req, res) => {
  try {
    if (req.user.role !== 'MOTHER') {
      return res.status(403).json({
        success: false,
        message: 'Apenas mães podem atualizar gravidez'
      });
    }

    const { id } = req.params;
    const { dueDate, status } = req.body;

    // Verify pregnancy belongs to user
    const pregnancy = await prisma.pregnancy.findUnique({
      where: { id },
      include: {
        motherProfile: true
      }
    });

    if (!pregnancy) {
      return res.status(404).json({
        success: false,
        message: 'Gravidez não encontrada'
      });
    }

    if (pregnancy.motherProfile.userId !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para atualizar esta gravidez'
      });
    }

    // Prepare update data
    const updateData = {};

    if (dueDate) {
      if (!isFutureDate(dueDate)) {
        return res.status(400).json({
          success: false,
          message: 'A data prevista deve ser no futuro'
        });
      }
      updateData.dueDate = new Date(dueDate);
      updateData.currentWeek = calculateCurrentWeek(dueDate);
    }

    if (status && ['ACTIVE', 'COMPLETED', 'LOST'].includes(status)) {
      updateData.status = status;
    }

    // Update pregnancy
    const updatedPregnancy = await prisma.pregnancy.update({
      where: { id },
      data: updateData
    });

    res.status(200).json({
      success: true,
      message: 'Gravidez atualizada com sucesso',
      data: updatedPregnancy
    });
  } catch (error) {
    console.error('Update pregnancy error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar gravidez',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Log symptoms for current week
 * POST /api/v1/pregnancy/symptoms
 */
export const logSymptoms = async (req, res) => {
  try {
    if (req.user.role !== 'MOTHER') {
      return res.status(403).json({
        success: false,
        message: 'Apenas mães podem registrar sintomas'
      });
    }

    const { symptoms, mood, notes } = req.body;

    // Get mother's pregnancy
    const motherProfile = await prisma.motherProfile.findUnique({
      where: { userId: req.userId },
      include: {
        pregnancy: {
          where: { status: 'ACTIVE' }
        }
      }
    });

    if (!motherProfile?.pregnancy) {
      return res.status(404).json({
        success: false,
        message: 'Nenhuma gravidez ativa encontrada'
      });
    }

    const pregnancy = motherProfile.pregnancy;

    // Create symptom log
    const symptomLog = await prisma.symptomLog.create({
      data: {
        pregnancyId: pregnancy.id,
        week: pregnancy.currentWeek,
        symptoms: symptoms || [],
        mood,
        notes
      }
    });

    res.status(201).json({
      success: true,
      message: 'Sintomas registrados com sucesso',
      data: symptomLog
    });
  } catch (error) {
    console.error('Log symptoms error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao registrar sintomas',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get symptom logs
 * GET /api/v1/pregnancy/symptoms
 */
export const getSymptomLogs = async (req, res) => {
  try {
    if (req.user.role !== 'MOTHER') {
      return res.status(403).json({
        success: false,
        message: 'Apenas mães podem acessar sintomas'
      });
    }

    const { week } = req.query;

    const motherProfile = await prisma.motherProfile.findUnique({
      where: { userId: req.userId },
      include: {
        pregnancy: {
          where: { status: 'ACTIVE' }
        }
      }
    });

    if (!motherProfile?.pregnancy) {
      return res.status(404).json({
        success: false,
        message: 'Nenhuma gravidez ativa encontrada'
      });
    }

    const whereClause = {
      pregnancyId: motherProfile.pregnancy.id
    };

    if (week) {
      whereClause.week = parseInt(week);
    }

    const symptomLogs = await prisma.symptomLog.findMany({
      where: whereClause,
      orderBy: { loggedAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: symptomLogs
    });
  } catch (error) {
    console.error('Get symptom logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar sintomas',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get weekly content by week number
 * GET /api/v1/pregnancy/weeks/:week
 */
export const getWeeklyContent = async (req, res) => {
  try {
    const { week } = req.params;
    const weekNum = parseInt(week);

    if (!weekNum || weekNum < 1 || weekNum > 40) {
      return res.status(400).json({
        success: false,
        message: 'Semana inválida. Use um número entre 1 e 40'
      });
    }

    const content = await prisma.weeklyContent.findUnique({
      where: { week: weekNum }
    });

    if (!content) {
      return res.status(404).json({
        success: false,
        message: `Conteúdo para a semana ${weekNum} não encontrado`
      });
    }

    res.status(200).json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error('Get weekly content error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar conteúdo semanal',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
