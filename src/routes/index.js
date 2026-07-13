import {Router} from 'express';
import userRoutes from './user.js';
import courseRoutes from './course.js';
import examRoutes from './exam.js';
import adminRoutes from './admin.js';

const router = Router();

router.use('/user', userRoutes);
router.use('/course', courseRoutes);
router.use('/exam', examRoutes);
router.use('/admin', adminRoutes);

export default router;
