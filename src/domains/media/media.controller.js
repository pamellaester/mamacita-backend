import prisma from '../../utils/prisma.js';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload image to Cloudinary
 * POST /api/v1/media/upload
 */
export const uploadImage = async (req, res) => {
  try {
    const { image, folder } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'Imagem é obrigatória'
      });
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(image, {
      folder: folder || 'mamacita',
      resource_type: 'image'
    });

    // Save to database
    const media = await prisma.media.create({
      data: {
        userId: req.userId,
        url: result.secure_url,
        publicId: result.public_id,
        type: 'IMAGE'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Imagem enviada com sucesso',
      data: media
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao enviar imagem',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete media from Cloudinary
 * DELETE /api/v1/media/:publicId
 */
export const deleteMedia = async (req, res) => {
  try {
    const { publicId } = req.params;

    // Find media
    const media = await prisma.media.findFirst({
      where: { publicId }
    });

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Mídia não encontrada'
      });
    }

    // Check ownership or admin
    if (media.userId !== req.userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para deletar esta mídia'
      });
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(publicId);

    // Delete from database
    await prisma.media.delete({
      where: { id: media.id }
    });

    res.status(200).json({
      success: true,
      message: 'Mídia deletada com sucesso'
    });
  } catch (error) {
    console.error('Delete media error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar mídia',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
