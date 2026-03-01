import { Request, Response } from 'express';
import HeroApplication from '../models/HeroApplication';
import DeliveryDriver from '../models/DeliveryDriver';
import User from '../models/User';
import logger from '../config/logger';
import { logAdminAction } from '../services/auditLogService';

// @route   POST /api/hero-application/apply
// @desc    Submit a hero application (students only)
export const submitHeroApplication = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user._id;
        const user = await User.findById(userId);

        if (!user || user.role !== 'student') {
            res.status(403).json({ message: 'Only students can apply to become heroes' });
            return;
        }

        // Check if there's already a pending/under_review application
        const existing = await HeroApplication.findOne({
            user: userId,
            status: { $in: ['submitted', 'under_review'] },
        });
        if (existing) {
            res.status(400).json({ message: 'You already have a pending application' });
            return;
        }

        // Check if already approved / is a hero
        const driver = await DeliveryDriver.findOne({ user: userId });
        if (driver) {
            res.status(400).json({ message: 'You are already registered as a hero' });
            return;
        }

        const {
            fullName,
            campusEmail,
            phone,
            zone,
            preferredHours,
            bankDetails,
            studentIdUrl,
            selfieUrl,
            vehicleType,
            agreedToRules,
        } = req.body;

        if (!agreedToRules) {
            res.status(400).json({ message: 'You must agree to the Hero rules & code of conduct' });
            return;
        }

        const application = await HeroApplication.create({
            user: userId,
            fullName: fullName || user.name,
            campusEmail: campusEmail || user.email,
            phone,
            zone,
            preferredHours,
            bankDetails,
            studentIdUrl,
            selfieUrl,
            vehicleType: vehicleType || 'walk',
            agreedToRules,
            status: 'submitted',
        });

        logger.info(`Hero application submitted by user ${userId}`, { applicationId: application._id });

        res.status(201).json({
            message: 'Application submitted successfully! You will be notified within 24–48 hours.',
            application,
        });
    } catch (err: any) {
        logger.error('Error submitting hero application', { error: err.message });
        res.status(500).json({ message: 'Failed to submit application', error: err.message });
    }
};

// @route   GET /api/hero-application/status
// @desc    Get the current user's latest hero application
export const getMyApplication = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user._id;

        const application = await HeroApplication.findOne({ user: userId })
            .sort({ createdAt: -1 })
            .lean();

        if (!application) {
            res.json({ hasApplication: false });
            return;
        }

        res.json({ hasApplication: true, application });
    } catch (err: any) {
        logger.error('Error fetching hero application', { error: err.message });
        res.status(500).json({ message: 'Failed to fetch application' });
    }
};

// @route   PUT /api/hero-application/onboarding
// @desc    Update onboarding checklist after approval
export const updateOnboarding = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user._id;
        const { watchedVideo, completedQuiz, acceptedSafetyRules } = req.body;

        const application = await HeroApplication.findOne({ user: userId, status: 'approved' });
        if (!application) {
            res.status(404).json({ message: 'No approved application found' });
            return;
        }

        if (watchedVideo !== undefined) application.onboardingChecklist.watchedVideo = watchedVideo;
        if (completedQuiz !== undefined) application.onboardingChecklist.completedQuiz = completedQuiz;
        if (acceptedSafetyRules !== undefined) application.onboardingChecklist.acceptedSafetyRules = acceptedSafetyRules;

        const checklist = application.onboardingChecklist;
        if (checklist.watchedVideo && checklist.completedQuiz && checklist.acceptedSafetyRules) {
            application.onboardingCompleted = true;
        }

        await application.save();

        res.json({ message: 'Onboarding updated', application });
    } catch (err: any) {
        logger.error('Error updating onboarding', { error: err.message });
        res.status(500).json({ message: 'Failed to update onboarding' });
    }
};

// ────────── Admin Endpoints ──────────

// @route   GET /api/admin/hero-applications
// @desc    Get all hero applications (admin only)
export const getHeroApplications = async (req: Request, res: Response): Promise<void> => {
    try {
        const statusFilter = req.query.status as string;
        const filter: any = {};
        if (statusFilter && statusFilter !== 'all') {
            filter.status = statusFilter;
        }

        const applications = await HeroApplication.find(filter)
            .populate('user', 'name email role')
            .populate('reviewedBy', 'name email')
            .sort({ createdAt: -1 })
            .lean();

        res.json(applications);
    } catch (err: any) {
        logger.error('Error fetching hero applications', { error: err.message });
        res.status(500).json({ message: 'Failed to fetch applications' });
    }
};

// @route   PUT /api/admin/hero-applications/:id/approve
// @desc    Approve a hero application
export const approveHeroApplication = async (req: Request, res: Response): Promise<void> => {
    try {
        const adminId = (req as any).user._id;
        const application = await HeroApplication.findById(req.params.id);

        if (!application) {
            res.status(404).json({ message: 'Application not found' });
            return;
        }
        if (application.status === 'approved') {
            res.status(400).json({ message: 'Application is already approved' });
            return;
        }

        application.status = 'approved';
        application.reviewedBy = adminId;
        application.reviewedAt = new Date();
        application.adminNotes = req.body.adminNotes || '';
        await application.save();

        // Create DeliveryDriver profile automatically
        const existing = await DeliveryDriver.findOne({ user: application.user });
        if (!existing) {
            await DeliveryDriver.create({
                user: application.user,
                vehicleType: application.vehicleType,
                isOnline: false,
                isAvailable: false,
                currentLocation: { type: 'Point', coordinates: [0, 0] },
            });
        }

        logger.info(`Hero application ${application._id} approved by admin ${adminId}`);

        // Audit log
        await logAdminAction({
            adminId: adminId.toString(),
            adminEmail: req.user!.email,
            actionType: 'hero_approved',
            targetType: 'hero_application',
            targetId: String(application._id),
            targetLabel: application.fullName,
            metadata: { applicationId: application._id, vehicleType: application.vehicleType },
            req,
        });

        res.json({ message: 'Application approved. Hero can now login.', application });
    } catch (err: any) {
        logger.error('Error approving hero application', { error: err.message });
        res.status(500).json({ message: 'Failed to approve application' });
    }
};

// @route   PUT /api/admin/hero-applications/:id/reject
// @desc    Reject a hero application
export const rejectHeroApplication = async (req: Request, res: Response): Promise<void> => {
    try {
        const adminId = (req as any).user._id;
        const application = await HeroApplication.findById(req.params.id);

        if (!application) {
            res.status(404).json({ message: 'Application not found' });
            return;
        }

        application.status = 'rejected';
        application.rejectionReason = req.body.reason || 'Application does not meet requirements';
        application.reviewedBy = adminId;
        application.reviewedAt = new Date();
        application.adminNotes = req.body.adminNotes || '';
        await application.save();

        logger.info(`Hero application ${application._id} rejected by admin ${adminId}`);

        // Audit log
        await logAdminAction({
            adminId: adminId.toString(),
            adminEmail: req.user!.email,
            actionType: 'hero_rejected',
            targetType: 'hero_application',
            targetId: String(application._id),
            targetLabel: application.fullName,
            metadata: { reason: application.rejectionReason, notes: application.adminNotes },
            req,
        });

        res.json({ message: 'Application rejected.', application });
    } catch (err: any) {
        logger.error('Error rejecting hero application', { error: err.message });
        res.status(500).json({ message: 'Failed to reject application' });
    }
};
