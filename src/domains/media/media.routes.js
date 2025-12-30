import express from 'express';
import { uploadImage, deleteMedia } from './media.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = express.Router();

// All media routes require authentication
router.use(authenticate);

router.post('/upload', uploadImage);
router.delete('/:publicId', deleteMedia);

export default router;
