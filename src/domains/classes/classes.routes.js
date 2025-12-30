import express from 'express';
import {
  getClasses,
  getClassById,
  createClass,
  enrollInClass,
  getMyEnrollments,
  addVideo,
  updateWatchHistory,
  addReview
} from './classes.controller.js';
import { authenticate, isMother, isCollaborator } from '../../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getClasses);
router.get('/:id', getClassById);

// Protected routes
router.use(authenticate);

// Mother routes
router.post('/:id/enroll', isMother, enrollInClass);
router.get('/my/enrollments', isMother, getMyEnrollments);
router.post('/videos/:id/watch', isMother, updateWatchHistory);
router.post('/:id/review', isMother, addReview);

// Collaborator routes
router.post('/', isCollaborator, createClass);
router.post('/:id/videos', isCollaborator, addVideo);

export default router;
