import prisma from '../../utils/prisma.js';
import { validateRequiredFields } from '../../utils/validation.js';

// ============================================================================
// GROUPS
// ============================================================================

/**
 * Get all groups (public or user is member of)
 * GET /api/v1/community/groups
 */
export const getGroups = async (req, res) => {
  try {
    const { category } = req.query;

    const whereClause = {
      deletedAt: null,
      OR: [
        { isPublic: true },
        {
          members: {
            some: {
              userId: req.user.motherProfile?.id
            }
          }
        }
      ]
    };

    if (category) {
      whereClause.category = category;
    }

    const groups = await prisma.group.findMany({
      where: whereClause,
      include: {
        creator: {
          select: {
            fullName: true,
            avatar: true
          }
        },
        _count: {
          select: {
            members: true,
            posts: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: groups
    });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar grupos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get single group by ID
 * GET /api/v1/community/groups/:id
 */
export const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;

    const group = await prisma.group.findUnique({
      where: { id, deletedAt: null },
      include: {
        creator: {
          select: {
            fullName: true,
            avatar: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                fullName: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: {
            posts: true
          }
        }
      }
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Grupo não encontrado'
      });
    }

    // Check if group is private and user is not a member
    if (!group.isPublic) {
      const isMember = group.members.some(m => m.userId === req.user.motherProfile?.id);
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: 'Este grupo é privado'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: group
    });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar grupo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create new group (Mother only)
 * POST /api/v1/community/groups
 */
export const createGroup = async (req, res) => {
  try {
    if (req.user.role !== 'MOTHER') {
      return res.status(403).json({
        success: false,
        message: 'Apenas mães podem criar grupos'
      });
    }

    const { name, description, isPublic, category, coverImage } = req.body;

    const { valid, missing } = validateRequiredFields(req.body, ['name']);
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: `Campos obrigatórios ausentes: ${missing.join(', ')}`
      });
    }

    const group = await prisma.group.create({
      data: {
        name,
        description,
        isPublic: isPublic !== false,
        category,
        coverImage,
        createdById: req.user.motherProfile.id,
        members: {
          create: {
            userId: req.user.motherProfile.id,
            role: 'ADMIN'
          }
        }
      },
      include: {
        creator: {
          select: {
            fullName: true,
            avatar: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Grupo criado com sucesso',
      data: group
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar grupo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Join a group
 * POST /api/v1/community/groups/:id/join
 */
export const joinGroup = async (req, res) => {
  try {
    if (req.user.role !== 'MOTHER') {
      return res.status(403).json({
        success: false,
        message: 'Apenas mães podem entrar em grupos'
      });
    }

    const { id } = req.params;

    // Check if group exists
    const group = await prisma.group.findUnique({
      where: { id, deletedAt: null }
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Grupo não encontrado'
      });
    }

    // Check if already a member
    const existingMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: id,
          userId: req.user.motherProfile.id
        }
      }
    });

    if (existingMember) {
      return res.status(409).json({
        success: false,
        message: 'Você já é membro deste grupo'
      });
    }

    // Join group
    const member = await prisma.groupMember.create({
      data: {
        groupId: id,
        userId: req.user.motherProfile.id,
        role: 'MEMBER'
      }
    });

    res.status(200).json({
      success: true,
      message: 'Você entrou no grupo com sucesso',
      data: member
    });
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao entrar no grupo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Leave a group
 * POST /api/v1/community/groups/:id/leave
 */
export const leaveGroup = async (req, res) => {
  try {
    if (req.user.role !== 'MOTHER') {
      return res.status(403).json({
        success: false,
        message: 'Ação não permitida'
      });
    }

    const { id } = req.params;

    await prisma.groupMember.delete({
      where: {
        groupId_userId: {
          groupId: id,
          userId: req.user.motherProfile.id
        }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Você saiu do grupo'
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Você não é membro deste grupo'
      });
    }

    console.error('Leave group error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao sair do grupo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================================================
// POSTS
// ============================================================================

/**
 * Get posts (from a group or general feed)
 * GET /api/v1/community/posts
 */
export const getPosts = async (req, res) => {
  try {
    const { groupId } = req.query;

    const whereClause = {
      deletedAt: null
    };

    if (groupId) {
      whereClause.groupId = groupId;
    } else {
      // General feed - posts from public groups or groups user is member of
      whereClause.OR = [
        { groupId: null }, // Posts not in any group
        {
          group: {
            isPublic: true
          }
        },
        {
          group: {
            members: {
              some: {
                userId: req.user.motherProfile?.id
              }
            }
          }
        }
      ];
    }

    const posts = await prisma.post.findMany({
      where: whereClause,
      include: {
        author: {
          select: {
            fullName: true,
            avatar: true
          }
        },
        group: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            comments: true,
            reactions: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.status(200).json({
      success: true,
      data: posts
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar posts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get single post
 * GET /api/v1/community/posts/:id
 */
export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await prisma.post.findUnique({
      where: { id, deletedAt: null },
      include: {
        author: {
          select: {
            fullName: true,
            avatar: true
          }
        },
        group: {
          select: {
            id: true,
            name: true
          }
        },
        comments: {
          where: { deletedAt: null },
          include: {
            author: {
              select: {
                fullName: true,
                avatar: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        reactions: {
          include: {
            user: {
              select: {
                fullName: true
              }
            }
          }
        }
      }
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post não encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create post (Mother only)
 * POST /api/v1/community/posts
 */
export const createPost = async (req, res) => {
  try {
    if (req.user.role !== 'MOTHER') {
      return res.status(403).json({
        success: false,
        message: 'Apenas mães podem criar posts'
      });
    }

    const { content, images, groupId } = req.body;

    const { valid, missing } = validateRequiredFields(req.body, ['content']);
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: `Campos obrigatórios ausentes: ${missing.join(', ')}`
      });
    }

    const post = await prisma.post.create({
      data: {
        content,
        images: images || [],
        groupId: groupId || null,
        authorId: req.user.motherProfile.id
      },
      include: {
        author: {
          select: {
            fullName: true,
            avatar: true
          }
        },
        group: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Post criado com sucesso',
      data: post
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete post
 * DELETE /api/v1/community/posts/:id
 */
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await prisma.post.findUnique({
      where: { id }
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post não encontrado'
      });
    }

    // Only author or admin can delete
    if (post.authorId !== req.user.motherProfile?.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para deletar este post'
      });
    }

    // Soft delete
    await prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    res.status(200).json({
      success: true,
      message: 'Post deletado com sucesso'
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add comment to post
 * POST /api/v1/community/posts/:id/comments
 */
export const addComment = async (req, res) => {
  try {
    if (req.user.role !== 'MOTHER') {
      return res.status(403).json({
        success: false,
        message: 'Apenas mães podem comentar'
      });
    }

    const { id } = req.params;
    const { content } = req.body;

    const { valid, missing } = validateRequiredFields(req.body, ['content']);
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: `Campos obrigatórios ausentes: ${missing.join(', ')}`
      });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        postId: id,
        authorId: req.user.motherProfile.id
      },
      include: {
        author: {
          select: {
            fullName: true,
            avatar: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Comentário adicionado',
      data: comment
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao adicionar comentário',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Toggle reaction on post
 * POST /api/v1/community/posts/:id/react
 */
export const toggleReaction = async (req, res) => {
  try {
    if (req.user.role !== 'MOTHER') {
      return res.status(403).json({
        success: false,
        message: 'Apenas mães podem reagir'
      });
    }

    const { id } = req.params;
    const { type } = req.body;

    if (!['HEART', 'SUPPORT', 'CELEBRATE'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de reação inválido'
      });
    }

    // Check if reaction already exists
    const existing = await prisma.reaction.findUnique({
      where: {
        postId_userId: {
          postId: id,
          userId: req.user.motherProfile.id
        }
      }
    });

    if (existing) {
      // Remove reaction
      await prisma.reaction.delete({
        where: {
          postId_userId: {
            postId: id,
            userId: req.user.motherProfile.id
          }
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Reação removida',
        data: { action: 'removed' }
      });
    }

    // Add reaction
    const reaction = await prisma.reaction.create({
      data: {
        type,
        postId: id,
        userId: req.user.motherProfile.id
      }
    });

    res.status(201).json({
      success: true,
      message: 'Reação adicionada',
      data: { action: 'added', reaction }
    });
  } catch (error) {
    console.error('Toggle reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar reação',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
