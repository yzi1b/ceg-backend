import {Router} from 'express';
import userRoutes from './user.js';
import courseRoutes from './course.js';
import examRoutes from './exam.js';
import paperRoutes from './paper.js';
import adminRoutes from './admin.js';
import myRoutes from './my.js';

const router = Router();

router.use('/my', myRoutes);
router.use('/user', userRoutes);
router.use('/course', courseRoutes);
router.use('/exam', examRoutes);
router.use('/paper', paperRoutes);
router.use('/admin', adminRoutes);

export default router;
