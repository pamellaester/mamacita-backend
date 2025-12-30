import prisma from '../../utils/prisma.js';

/**
 * Get user notifications
 * GET /api/v1/notifications
 */
export const getNotifications = async (req, res) => {
  try {
    if (req.user.role !== 'MOTHER') {
      return res.status(403).json({
        success: false,
        message: 'Apenas mães podem acessar notificações'
      });
    }

    const { unreadOnly } = req.query;

    const whereClause = {
      userId: req.user.motherProfile.id
    };

    if (unreadOnly === 'true') {
      whereClause.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.status(200).json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar notificações',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Mark notification as read
 * PUT /api/v1/notifications/:id/read
 */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    res.status(200).json({
      success: true,
      message: 'Notificação marcada como lida'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao marcar notificação',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Mark all notifications as read
 * PUT /api/v1/notifications/read-all
 */
export const markAllAsRead = async (req, res) => {
  try {
    if (req.user.role !== 'MOTHER') {
      return res.status(403).json({
        success: false,
        message: 'Ação não permitida'
      });
    }

    await prisma.notification.updateMany({
      where: {
        userId: req.user.motherProfile.id,
        isRead: false
      },
      data: { isRead: true }
    });

    res.status(200).json({
      success: true,
      message: 'Todas as notificações foram marcadas como lidas'
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao marcar notificações',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
