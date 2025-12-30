import express from 'express';
import {
  getStats,
  getReports,
  updateReportStatus,
  verifyCollaborator,
  publishClass,
  publishEvent
} from './admin.controller.js';
import { authenticate, isAdmin } from '../../middleware/auth.js';

const router = express.Router();

// All admin routes require admin authentication
router.use(authenticate, isAdmin);

router.get('/stats', getStats);
router.get('/reports', getReports);
router.put('/reports/:id', updateReportStatus);
router.put('/collaborators/:id/verify', verifyCollaborator);
router.put('/classes/:id/publish', publishClass);
router.put('/events/:id/publish', publishEvent);

export default router;
