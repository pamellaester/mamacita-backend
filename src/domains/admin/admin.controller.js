import prisma from '../../utils/prisma.js';

/**
 * Get admin dashboard stats
 * GET /api/v1/admin/stats
 */
export const getStats = async (req, res) => {
  try {
    const [
      totalMothers,
      totalCollaborators,
      totalActivePregnancies,
      totalGroups,
      totalPosts,
      totalClasses,
      totalEvents,
      pendingReports
    ] = await Promise.all([
      prisma.motherProfile.count(),
      prisma.collaboratorProfile.count(),
      prisma.pregnancy.count({ where: { status: 'ACTIVE' } }),
      prisma.group.count({ where: { deletedAt: null } }),
      prisma.post.count({ where: { deletedAt: null } }),
      prisma.class.count({ where: { isPublished: true } }),
      prisma.event.count({ where: { isPublished: true } }),
      prisma.report.count({ where: { status: 'PENDING' } })
    ]);

    res.status(200).json({
      success: true,
      data: {
        users: {
          mothers: totalMothers,
          collaborators: totalCollaborators,
          total: totalMothers + totalCollaborators
        },
        pregnancy: {
          active: totalActivePregnancies
        },
        community: {
          groups: totalGroups,
          posts: totalPosts
        },
        learning: {
          classes: totalClasses
        },
        events: {
          total: totalEvents
        },
        moderation: {
          pendingReports
        }
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar estatísticas',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get pending reports
 * GET /api/v1/admin/reports
 */
export const getReports = async (req, res) => {
  try {
    const { status } = req.query;

    const whereClause = {};

    if (status) {
      whereClause.status = status;
    }

    const reports = await prisma.report.findMany({
      where: whereClause,
      include: {
        post: {
          include: {
            author: {
              select: {
                fullName: true
              }
            }
          }
        },
        user: {
          select: {
            fullName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar denúncias',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update report status
 * PUT /api/v1/admin/reports/:id
 */
export const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['REVIEWED', 'RESOLVED', 'DISMISSED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status inválido'
      });
    }

    const report = await prisma.report.update({
      where: { id },
      data: { status }
    });

    res.status(200).json({
      success: true,
      message: 'Denúncia atualizada com sucesso',
      data: report
    });
  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar denúncia',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Verify collaborator
 * PUT /api/v1/admin/collaborators/:id/verify
 */
export const verifyCollaborator = async (req, res) => {
  try {
    const { id } = req.params;

    const collaborator = await prisma.collaboratorProfile.update({
      where: { id },
      data: { isVerified: true }
    });

    res.status(200).json({
      success: true,
      message: 'Colaborador verificado com sucesso',
      data: collaborator
    });
  } catch (error) {
    console.error('Verify collaborator error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar colaborador',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Publish class
 * PUT /api/v1/admin/classes/:id/publish
 */
export const publishClass = async (req, res) => {
  try {
    const { id } = req.params;

    const classData = await prisma.class.update({
      where: { id },
      data: { isPublished: true }
    });

    res.status(200).json({
      success: true,
      message: 'Aula publicada com sucesso',
      data: classData
    });
  } catch (error) {
    console.error('Publish class error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao publicar aula',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Publish event
 * PUT /api/v1/admin/events/:id/publish
 */
export const publishEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.update({
      where: { id },
      data: { isPublished: true }
    });

    res.status(200).json({
      success: true,
      message: 'Evento publicado com sucesso',
      data: event
    });
  } catch (error) {
    console.error('Publish event error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao publicar evento',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
