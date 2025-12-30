import prisma from '../../utils/prisma.js';
import { validateRequiredFields, isFutureDate } from '../../utils/validation.js';

/**
 * Get all published events
 * GET /api/v1/events
 */
export const getEvents = async (req, res) => {
  try {
    const { category, type, city, upcoming } = req.query;

    const whereClause = {
      isPublished: true
    };

    if (category) {
      whereClause.category = category;
    }

    if (type) {
      whereClause.type = type;
    }

    if (city) {
      whereClause.city = city;
    }

    if (upcoming === 'true') {
      whereClause.startDate = {
        gte: new Date()
      };
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        organizer: {
          select: {
            fullName: true,
            avatar: true,
            profession: true
          }
        },
        _count: {
          select: {
            registrations: {
              where: {
                status: 'REGISTERED'
              }
            }
          }
        }
      },
      orderBy: { startDate: 'asc' }
    });

    res.status(200).json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar eventos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get single event by ID
 * GET /api/v1/events/:id
 */
export const getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id, isPublished: true },
      include: {
        organizer: {
          select: {
            fullName: true,
            avatar: true,
            profession: true,
            bio: true
          }
        },
        _count: {
          select: {
            registrations: {
              where: {
                status: 'REGISTERED'
              }
            }
          }
        }
      }
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Evento não encontrado'
      });
    }

    // Check if user is registered
    if (req.user?.motherProfile) {
      const registration = await prisma.eventRegistration.findUnique({
        where: {
          eventId_userId: {
            eventId: id,
            userId: req.user.motherProfile.id
          }
        }
      });

      event.registration = registration || null;
    }

    // Check if event is full
    const registeredCount = event._count.registrations;
    event.isFull = event.capacity ? registeredCount >= event.capacity : false;
    event.spotsLeft = event.capacity ? Math.max(0, event.capacity - registeredCount) : null;

    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar evento',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create new event (Collaborator only)
 * POST /api/v1/events
 */
export const createEvent = async (req, res) => {
  try {
    if (req.user.role !== 'COLLABORATOR') {
      return res.status(403).json({
        success: false,
        message: 'Apenas colaboradores podem criar eventos'
      });
    }

    const {
      title,
      description,
      type,
      category,
      startDate,
      endDate,
      location,
      city,
      state,
      meetingLink,
      meetingPassword,
      capacity,
      waitlistEnabled,
      isFree,
      price,
      coverImage
    } = req.body;

    const { valid, missing } = validateRequiredFields(req.body, [
      'title',
      'description',
      'type',
      'category',
      'startDate',
      'endDate'
    ]);

    if (!valid) {
      return res.status(400).json({
        success: false,
        message: `Campos obrigatórios ausentes: ${missing.join(', ')}`
      });
    }

    // Validate dates
    if (!isFutureDate(startDate)) {
      return res.status(400).json({
        success: false,
        message: 'A data de início deve ser no futuro'
      });
    }

    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: 'A data de término deve ser após a data de início'
      });
    }

    // Validate type-specific fields
    if ((type === 'IN_PERSON' || type === 'HYBRID') && !location) {
      return res.status(400).json({
        success: false,
        message: 'Localização é obrigatória para eventos presenciais'
      });
    }

    if ((type === 'ONLINE' || type === 'HYBRID') && !meetingLink) {
      return res.status(400).json({
        success: false,
        message: 'Link da reunião é obrigatório para eventos online'
      });
    }

    const event = await prisma.event.create({
      data: {
        title,
        description,
        type,
        category,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
        city,
        state,
        meetingLink,
        meetingPassword,
        capacity,
        waitlistEnabled: waitlistEnabled || false,
        isFree: isFree !== false,
        price: price || 0,
        coverImage,
        organizerId: req.user.collaboratorProfile.id,
        isPublished: false
      },
      include: {
        organizer: {
          select: {
            fullName: true,
            profession: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Evento criado com sucesso',
      data: event
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar evento',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Register for an event (Mother only)
 * POST /api/v1/events/:id/register
 */
export const registerForEvent = async (req, res) => {
  try {
    if (req.user.role !== 'MOTHER') {
      return res.status(403).json({
        success: false,
        message: 'Apenas mães podem se registrar em eventos'
      });
    }

    const { id } = req.params;

    // Get event
    const event = await prisma.event.findUnique({
      where: { id, isPublished: true },
      include: {
        _count: {
          select: {
            registrations: {
              where: {
                status: 'REGISTERED'
              }
            }
          }
        }
      }
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Evento não encontrado'
      });
    }

    // Check if already registered
    const existing = await prisma.eventRegistration.findUnique({
      where: {
        eventId_userId: {
          eventId: id,
          userId: req.user.motherProfile.id
        }
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Você já está registrada neste evento'
      });
    }

    // Check capacity
    const registeredCount = event._count.registrations;
    let status = 'REGISTERED';

    if (event.capacity && registeredCount >= event.capacity) {
      if (event.waitlistEnabled) {
        status = 'WAITLIST';
      } else {
        return res.status(400).json({
          success: false,
          message: 'Este evento está lotado'
        });
      }
    }

    // Register
    const registration = await prisma.eventRegistration.create({
      data: {
        eventId: id,
        userId: req.user.motherProfile.id,
        status
      }
    });

    res.status(201).json({
      success: true,
      message: status === 'WAITLIST'
        ? 'Você foi adicionada à lista de espera'
        : 'Inscrição realizada com sucesso',
      data: registration
    });
  } catch (error) {
    console.error('Register for event error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao realizar inscrição',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Cancel event registration
 * DELETE /api/v1/events/:id/register
 */
export const cancelRegistration = async (req, res) => {
  try {
    if (req.user.role !== 'MOTHER') {
      return res.status(403).json({
        success: false,
        message: 'Ação não permitida'
      });
    }

    const { id } = req.params;

    const registration = await prisma.eventRegistration.findUnique({
      where: {
        eventId_userId: {
          eventId: id,
          userId: req.user.motherProfile.id
        }
      }
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Você não está registrada neste evento'
      });
    }

    // Update status to cancelled
    await prisma.eventRegistration.update({
      where: {
        eventId_userId: {
          eventId: id,
          userId: req.user.motherProfile.id
        }
      },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date()
      }
    });

    res.status(200).json({
      success: true,
      message: 'Inscrição cancelada com sucesso'
    });
  } catch (error) {
    console.error('Cancel registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao cancelar inscrição',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user's event registrations
 * GET /api/v1/events/my-registrations
 */
export const getMyRegistrations = async (req, res) => {
  try {
    if (req.user.role !== 'MOTHER') {
      return res.status(403).json({
        success: false,
        message: 'Apenas mães podem acessar inscrições'
      });
    }

    const registrations = await prisma.eventRegistration.findMany({
      where: {
        userId: req.user.motherProfile.id,
        status: {
          in: ['REGISTERED', 'WAITLIST']
        }
      },
      include: {
        event: {
          include: {
            organizer: {
              select: {
                fullName: true,
                avatar: true
              }
            }
          }
        }
      },
      orderBy: { registeredAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: registrations
    });
  } catch (error) {
    console.error('Get registrations error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar inscrições',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
