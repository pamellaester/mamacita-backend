import express from 'express';
import {
  getGroups,
  getGroupById,
  createGroup,
  joinGroup,
  leaveGroup,
  getPosts,
  getPostById,
  createPost,
  deletePost,
  addComment,
  toggleReaction
} from './community.controller.js';
import { authenticate, isMother } from '../../middleware/auth.js';

const router = express.Router();

// All community routes require authentication
router.use(authenticate);

// ============================================================================
// GROUPS ROUTES
// ============================================================================

// GET /api/v1/community/groups
router.get('/groups', getGroups);

// GET /api/v1/community/groups/:id
router.get('/groups/:id', getGroupById);

// POST /api/v1/community/groups
router.post('/groups', isMother, createGroup);

// POST /api/v1/community/groups/:id/join
router.post('/groups/:id/join', isMother, joinGroup);

// POST /api/v1/community/groups/:id/leave
router.post('/groups/:id/leave', isMother, leaveGroup);

// ============================================================================
// POSTS ROUTES
// ============================================================================

// GET /api/v1/community/posts
router.get('/posts', getPosts);

// GET /api/v1/community/posts/:id
router.get('/posts/:id', getPostById);

// POST /api/v1/community/posts
router.post('/posts', isMother, createPost);

// DELETE /api/v1/community/posts/:id
router.delete('/posts/:id', deletePost);

// POST /api/v1/community/posts/:id/comments
router.post('/posts/:id/comments', isMother, addComment);

// POST /api/v1/community/posts/:id/react
router.post('/posts/:id/react', isMother, toggleReaction);

export default router;
