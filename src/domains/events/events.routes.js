import express from 'express';
import {
  getEvents,
  getEventById,
  createEvent,
  registerForEvent,
  cancelRegistration,
  getMyRegistrations
} from './events.controller.js';
import { authenticate, isMother, isCollaborator } from '../../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getEvents);
router.get('/:id', getEventById);

// Protected routes
router.use(authenticate);

// Mother routes
router.post('/:id/register', isMother, registerForEvent);
router.delete('/:id/register', isMother, cancelRegistration);
router.get('/my/registrations', isMother, getMyRegistrations);

// Collaborator routes
router.post('/', isCollaborator, createEvent);

export default router;
