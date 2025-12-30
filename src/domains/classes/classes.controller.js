import prisma from '../../utils/prisma.js';
import { validateRequiredFields } from '../../utils/validation.js';

/**
 * Get all published classes
 * GET /api/v1/classes
 */
export const getClasses = async (req, res) => {
  try {
    const { category, isFree } = req.query;

    const whereClause = {
      isPublished: true
    };

    if (category) {
      whereClause.category = category;
    }

    if (isFree !== undefined) {
      whereClause.isFree = isFree === 'true';
    }

    const classes = await prisma.class.findMany({
      where: whereClause,
      include: {
        instructor: {
          select: {
            fullName: true,
            avatar: true,
            profession: true
          }
        },
        _count: {
          select: {
            videos: true,
            enrollments: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: classes
    });
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar aulas',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get single class by ID
 * GET /api/v1/classes/:id
 */
export const getClassById = async (req, res) => {
  try {
    const { id } = req.params;

    const classData = await prisma.class.findUnique({
      where: { id, isPublished: true },
      include: {
        instructor: {
          select: {
            fullName: true,
            avatar: true,
            profession: true,
            bio: true
          }
        },
        videos: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            thumbnailUrl: true,
            duration: true,
            order: true,
            isPreview: true,
            videoUrl: req.user ? true : false // Only include video URL if authenticated
          }
        },
        reviews: {
          include: {
            user: {
              select: {
                fullName: true,
                avatar: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        _count: {
          select: {
            enrollments: true
          }
        }
      }
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Aula não encontrada'
      });
    }

    // Check if user is enrolled
    if (req.user?.motherProfile) {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          classId_userId: {
            classId: id,
            userId: req.user.motherProfile.id
          }
        }
      });

      classData.enrollment = enrollment || null;
    }

    res.status(200).json({
      success: true,
      data: classData
    });
  } catch (error) {
    console.error('Get class error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar aula',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create new class (Collaborator only)
 * POST /api/v1/classes
 */
export const createClass = async (req, res) => {
  try {
    if (req.user.role !== 'COLLABORATOR') {
      return res.status(403).json({
        success: false,
        message: 'Apenas colaboradores podem criar aulas'
      });
    }

    const { title, description, category, difficulty, thumbnail, isFree, price } = req.body;

    const { valid, missing } = validateRequiredFields(req.body, ['title', 'description', 'category']);
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: `Campos obrigatórios ausentes: ${missing.join(', ')}`
      });
    }

    const classData = await prisma.class.create({
      data: {
        title,
        description,
        category,
        difficulty: difficulty || 'Iniciante',
        thumbnail,
        isFree: isFree !== false,
        price: price || 0,
        instructorId: req.user.collaboratorProfile.id,
        isPublished: false
      },
      include: {
        instructor: {
          select: {
            fullName: true,
            profession: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Aula criada com sucesso',
      data: classData
    });
  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar aula',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Enroll in a class (Mother only)
 * POST /api/v1/classes/:id/enroll
 */
export const enrollInClass = async (req, res) => {
  try {
    if (req.user.role !== 'MOTHER') {
      return res.status(403).json({
        success: false,
        message: 'Apenas mães podem se matricular em aulas'
      });
    }

    const { id } = req.params;

    // Check if class exists
    const classData = await prisma.class.findUnique({
      where: { id, isPublished: true }
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Aula não encontrada'
      });
    }

    // Check if already enrolled
    const existing = await prisma.enrollment.findUnique({
      where: {
        classId_userId: {
          classId: id,
          userId: req.user.motherProfile.id
        }
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Você já está matriculada nesta aula'
      });
    }

    // Enroll
    const enrollment = await prisma.enrollment.create({
      data: {
        classId: id,
        userId: req.user.motherProfile.id,
        progress: 0
      }
    });

    res.status(201).json({
      success: true,
      message: 'Matrícula realizada com sucesso',
      data: enrollment
    });
  } catch (error) {
    console.error('Enroll error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao realizar matrícula',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user's enrollments
 * GET /api/v1/classes/my-enrollments
 */
export const getMyEnrollments = async (req, res) => {
  try {
    if (req.user.role !== 'MOTHER') {
      return res.status(403).json({
        success: false,
        message: 'Apenas mães podem acessar matrículas'
      });
    }

    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: req.user.motherProfile.id
      },
      include: {
        class: {
          include: {
            instructor: {
              select: {
                fullName: true,
                avatar: true
              }
            },
            _count: {
              select: {
                videos: true
              }
            }
          }
        }
      },
      orderBy: { enrolledAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: enrollments
    });
  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar matrículas',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add video to class (Collaborator only)
 * POST /api/v1/classes/:id/videos
 */
export const addVideo = async (req, res) => {
  try {
    if (req.user.role !== 'COLLABORATOR') {
      return res.status(403).json({
        success: false,
        message: 'Apenas colaboradores podem adicionar vídeos'
      });
    }

    const { id } = req.params;
    const { title, description, videoUrl, thumbnailUrl, duration, order, isPreview, resources } = req.body;

    // Verify class belongs to collaborator
    const classData = await prisma.class.findUnique({
      where: { id }
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Aula não encontrada'
      });
    }

    if (classData.instructorId !== req.user.collaboratorProfile.id) {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para adicionar vídeos a esta aula'
      });
    }

    const { valid, missing } = validateRequiredFields(req.body, ['title', 'videoUrl', 'duration']);
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: `Campos obrigatórios ausentes: ${missing.join(', ')}`
      });
    }

    const video = await prisma.video.create({
      data: {
        classId: id,
        title,
        description,
        videoUrl,
        thumbnailUrl,
        duration,
        order: order || 1,
        isPreview: isPreview || false,
        resources: resources || null
      }
    });

    res.status(201).json({
      success: true,
      message: 'Vídeo adicionado com sucesso',
      data: video
    });
  } catch (error) {
    console.error('Add video error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao adicionar vídeo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update watch history
 * POST /api/v1/classes/videos/:id/watch
 */
export const updateWatchHistory = async (req, res) => {
  try {
    if (req.user.role !== 'MOTHER') {
      return res.status(403).json({
        success: false,
        message: 'Apenas mães podem atualizar histórico'
      });
    }

    const { id } = req.params;
    const { progress } = req.body;

    if (!progress && progress !== 0) {
      return res.status(400).json({
        success: false,
        message: 'Progresso é obrigatório'
      });
    }

    const watchHistory = await prisma.watchHistory.upsert({
      where: {
        videoId_userId: {
          videoId: id,
          userId: req.user.motherProfile.id
        }
      },
      update: {
        progress,
        updatedAt: new Date()
      },
      create: {
        videoId: id,
        userId: req.user.motherProfile.id,
        progress
      }
    });

    res.status(200).json({
      success: true,
      message: 'Progresso atualizado',
      data: watchHistory
    });
  } catch (error) {
    console.error('Update watch history error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar progresso',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add review to class
 * POST /api/v1/classes/:id/review
 */
export const addReview = async (req, res) => {
  try {
    if (req.user.role !== 'MOTHER') {
      return res.status(403).json({
        success: false,
        message: 'Apenas mães podem avaliar aulas'
      });
    }

    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Avaliação deve ser entre 1 e 5 estrelas'
      });
    }

    // Check if user is enrolled
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        classId_userId: {
          classId: id,
          userId: req.user.motherProfile.id
        }
      }
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'Você precisa estar matriculada para avaliar esta aula'
      });
    }

    const review = await prisma.classReview.upsert({
      where: {
        classId_userId: {
          classId: id,
          userId: req.user.motherProfile.id
        }
      },
      update: {
        rating,
        comment
      },
      create: {
        classId: id,
        userId: req.user.motherProfile.id,
        rating,
        comment
      },
      include: {
        user: {
          select: {
            fullName: true,
            avatar: true
          }
        }
      }
    });

    // Update class average rating
    const reviews = await prisma.classReview.findMany({
      where: { classId: id }
    });

    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await prisma.class.update({
      where: { id },
      data: {
        averageRating: avgRating,
        reviewCount: reviews.length
      }
    });

    res.status(201).json({
      success: true,
      message: 'Avaliação adicionada com sucesso',
      data: review
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao adicionar avaliação',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
