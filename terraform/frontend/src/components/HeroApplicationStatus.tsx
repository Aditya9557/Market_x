import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

interface HeroApplication {
    _id: string;
    status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
    fullName: string;
    zone: string;
    vehicleType: string;
    preferredHours: string[];
    rejectionReason?: string;
    createdAt: string;
    reviewedAt?: string;
    onboardingCompleted: boolean;
    onboardingChecklist: {
        watchedVideo: boolean;
        completedQuiz: boolean;
        acceptedSafetyRules: boolean;
    };
}

interface HeroApplicationStatusProps {
    onApproved?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
    draft: { label: 'Draft', color: '#6E7581', bg: 'rgba(110,117,129,0.1)', border: 'rgba(110,117,129,0.2)', icon: '📝' },
    submitted: { label: 'Submitted', color: '#FFCC00', bg: 'rgba(255,204,0,0.08)', border: 'rgba(255,204,0,0.2)', icon: '📤' },
    under_review: { label: 'Under Review', color: '#4A9EFF', bg: 'rgba(74,158,255,0.08)', border: 'rgba(74,158,255,0.2)', icon: '🔍' },
    approved: { label: 'Approved', color: '#0F9D58', bg: 'rgba(15,157,88,0.08)', border: 'rgba(15,157,88,0.2)', icon: '✅' },
    rejected: { label: 'Rejected', color: '#D93A3A', bg: 'rgba(217,58,58,0.08)', border: 'rgba(217,58,58,0.2)', icon: '❌' },
};

const STEPS = ['draft', 'submitted', 'under_review', 'approved'];

const HeroApplicationStatus = ({ onApproved }: HeroApplicationStatusProps) => {
    const { isAuthenticated } = useAuth();
    const [application, setApplication] = useState<HeroApplication | null>(null);
    const [loading, setLoading] = useState(true);
    const [showQuickstart, setShowQuickstart] = useState(false);
    const [updatingOnboarding, setUpdatingOnboarding] = useState(false);

    const fetchApplication = async () => {
        // Don't fetch if user is not authenticated
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }
        try {
            const { data } = await API.get('/hero-application/status');
            if (data.hasApplication) {
                setApplication(data.application);
            }
        } catch (err: any) {
            // Silently handle 401 — user's session may have expired
            if (err.response?.status !== 401) {
                console.error(err);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchApplication(); }, [isAuthenticated]);

    const updateChecklist = async (field: 'watchedVideo' | 'completedQuiz' | 'acceptedSafetyRules') => {
        if (!application) return;
        setUpdatingOnboarding(true);
        try {
            const { data } = await API.put('/hero-application/onboarding', {
                [field]: true,
            });
            setApplication(data.application);
            if (data.application.onboardingCompleted && onApproved) {
                onApproved();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setUpdatingOnboarding(false);
        }
    };

    if (loading) return null;
    if (!application) return null;

    const cfg = STATUS_CONFIG[application.status] || STATUS_CONFIG.submitted;
    const currentStepIndex = application.status === 'rejected'
        ? -1
        : STEPS.indexOf(application.status);

    return (
        <>
            <div className="uh-card p-5 mb-6" style={{ borderColor: cfg.border }}>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                            style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                        >
                            {cfg.icon}
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm">Hero Application Status</h3>
                            <p className="text-xs" style={{ color: 'var(--uh-text-muted)' }}>
                                Applied {new Date(application.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                        </div>
                    </div>
                    <span
                        className="text-xs font-bold px-3 py-1 rounded-full"
                        style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
                    >
                        {cfg.label}
                    </span>
                </div>

                {/* Progress Steps (for non-rejected) */}
                {application.status !== 'rejected' && (
                    <div className="flex items-center mb-4 px-2">
                        {STEPS.map((step, i) => {
                            const isActive = i <= currentStepIndex;
                            const isCurrent = i === currentStepIndex;
                            return (
                                <div key={step} className="flex items-center flex-1">
                                    <div className="flex flex-col items-center flex-1">
                                        <div
                                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all`}
                                            style={{
                                                background: isActive ? cfg.bg : 'rgba(255,255,255,0.04)',
                                                border: `2px solid ${isActive ? cfg.color : 'rgba(255,255,255,0.1)'}`,
                                                color: isActive ? cfg.color : 'var(--uh-text-faint)',
                                                boxShadow: isCurrent ? `0 0 0 2px #18182a, 0 0 0 4px ${cfg.color}` : 'none',
                                            }}
                                        >
                                            {isActive ? '✓' : i + 1}
                                        </div>
                                        <p className="text-[9px] mt-1 font-semibold capitalize text-center" style={{ color: isActive ? cfg.color : 'var(--uh-text-faint)' }}>
                                            {step.replace('_', ' ')}
                                        </p>
                                    </div>
                                    {i < STEPS.length - 1 && (
                                        <div
                                            className="flex-1 h-0.5 mx-1 rounded-full"
                                            style={{ background: i < currentStepIndex ? cfg.color : 'rgba(255,255,255,0.08)' }}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Rejection Reason */}
                {application.status === 'rejected' && application.rejectionReason && (
                    <div className="p-3 rounded-xl mb-3" style={{ background: 'rgba(217,58,58,0.06)', border: '1px solid rgba(217,58,58,0.15)' }}>
                        <p className="text-xs font-bold mb-1" style={{ color: '#D93A3A' }}>Reason for Rejection:</p>
                        <p className="text-xs" style={{ color: 'var(--uh-text-muted)' }}>{application.rejectionReason}</p>
                        <p className="text-[10px] mt-2" style={{ color: 'var(--uh-text-faint)' }}>
                            You can reapply after addressing the issues mentioned above.
                        </p>
                    </div>
                )}

                {/* Approved: Quickstart */}
                {application.status === 'approved' && !application.onboardingCompleted && (
                    <button
                        onClick={() => setShowQuickstart(true)}
                        className="w-full py-3 rounded-xl text-sm font-bold transition-all"
                        style={{
                            background: 'linear-gradient(135deg, rgba(15,157,88,0.15), rgba(15,157,88,0.08))',
                            border: '1px solid rgba(15,157,88,0.3)',
                            color: '#0F9D58',
                        }}
                    >
                        🎉 You're approved! Complete your quickstart →
                    </button>
                )}

                {application.status === 'approved' && application.onboardingCompleted && (
                    <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(15,157,88,0.06)', border: '1px solid rgba(15,157,88,0.2)' }}>
                        <p className="text-xs font-bold" style={{ color: 'var(--uh-green)' }}>
                            ✅ Onboarding complete! You can now accept deliveries.
                        </p>
                    </div>
                )}

                {/* Meta Info */}
                <div className="flex items-center gap-4 mt-3 flex-wrap">
                    <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--uh-text-faint)' }}>
                        📍 {application.zone}
                    </span>
                    <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--uh-text-faint)' }}>
                        {application.vehicleType === 'walk' ? '🚶' : application.vehicleType === 'bicycle' ? '🚲' : application.vehicleType === 'scooter' ? '🛵' : '🚗'} {application.vehicleType}
                    </span>
                    <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--uh-text-faint)' }}>
                        ⏰ {application.preferredHours.join(', ')}
                    </span>
                </div>
            </div>

            {/* Quickstart Modal */}
            {showQuickstart && application.status === 'approved' && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    onClick={() => setShowQuickstart(false)}
                    style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
                >
                    <div
                        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl p-6"
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: 'linear-gradient(180deg, #1a1a2e 0%, #12121e 60%)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            boxShadow: '0 16px 64px rgba(0,0,0,0.5)',
                        }}
                    >
                        <div className="text-center mb-6">
                            <div
                                className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center text-3xl"
                                style={{ background: 'linear-gradient(135deg, #0F9D58, #0B8043)', boxShadow: '0 8px 32px rgba(15,157,88,0.3)' }}
                            >
                                🎉
                            </div>
                            <h2 className="text-2xl font-black text-white mb-1">Hero Quickstart</h2>
                            <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>
                                Complete these 3 steps before your first delivery
                            </p>
                        </div>

                        <div className="space-y-3">
                            {/* Step 1 */}
                            <div
                                className="p-4 rounded-xl flex items-start gap-4 transition-all"
                                style={{
                                    background: application.onboardingChecklist.watchedVideo ? 'rgba(15,157,88,0.06)' : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${application.onboardingChecklist.watchedVideo ? 'rgba(15,157,88,0.2)' : 'rgba(255,255,255,0.06)'}`,
                                }}
                            >
                                <div className="text-2xl">📦</div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-white mb-1">Accept your first job</h4>
                                    <p className="text-xs" style={{ color: 'var(--uh-text-muted)' }}>
                                        Learn how order locking works — when you accept a delivery, a Redis lock ensures no other hero can take it simultaneously.
                                    </p>
                                    {!application.onboardingChecklist.watchedVideo && (
                                        <button
                                            onClick={() => updateChecklist('watchedVideo')}
                                            disabled={updatingOnboarding}
                                            className="mt-2 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                                            style={{ background: 'rgba(255,107,87,0.12)', color: '#FF6B57', border: '1px solid rgba(255,107,87,0.3)' }}
                                        >
                                            {updatingOnboarding ? '...' : '▶️ Watch short video (30s)'}
                                        </button>
                                    )}
                                    {application.onboardingChecklist.watchedVideo && (
                                        <p className="mt-2 text-xs font-bold" style={{ color: 'var(--uh-green)' }}>✅ Completed</p>
                                    )}
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div
                                className="p-4 rounded-xl flex items-start gap-4 transition-all"
                                style={{
                                    background: application.onboardingChecklist.completedQuiz ? 'rgba(15,157,88,0.06)' : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${application.onboardingChecklist.completedQuiz ? 'rgba(15,157,88,0.2)' : 'rgba(255,255,255,0.06)'}`,
                                }}
                            >
                                <div className="text-2xl">📋</div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-white mb-1">Pickup / Delivery checklist</h4>
                                    <p className="text-xs" style={{ color: 'var(--uh-text-muted)' }}>
                                        Verify items at pickup, confirm with the customer, and mark delivery as complete. Always double-check order contents.
                                    </p>
                                    {!application.onboardingChecklist.completedQuiz && (
                                        <button
                                            onClick={() => updateChecklist('completedQuiz')}
                                            disabled={updatingOnboarding}
                                            className="mt-2 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                                            style={{ background: 'rgba(255,107,87,0.12)', color: '#FF6B57', border: '1px solid rgba(255,107,87,0.3)' }}
                                        >
                                            {updatingOnboarding ? '...' : '📝 Complete training quiz'}
                                        </button>
                                    )}
                                    {application.onboardingChecklist.completedQuiz && (
                                        <p className="mt-2 text-xs font-bold" style={{ color: 'var(--uh-green)' }}>✅ Completed</p>
                                    )}
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div
                                className="p-4 rounded-xl flex items-start gap-4 transition-all"
                                style={{
                                    background: application.onboardingChecklist.acceptedSafetyRules ? 'rgba(15,157,88,0.06)' : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${application.onboardingChecklist.acceptedSafetyRules ? 'rgba(15,157,88,0.2)' : 'rgba(255,255,255,0.06)'}`,
                                }}
                            >
                                <div className="text-2xl">🛡️</div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-white mb-1">Safety & contact rules</h4>
                                    <p className="text-xs" style={{ color: 'var(--uh-text-muted)' }}>
                                        Keep personal info private, use in-app communication, and follow campus road safety guidelines at all times.
                                    </p>
                                    <div className="mt-2 p-2 rounded-lg space-y-1" style={{ background: 'rgba(255,255,255,0.02)' }}>
                                        <p className="text-[10px]" style={{ color: 'var(--uh-text-faint)' }}>🔒 Never share customer phone/address outside the app</p>
                                        <p className="text-[10px]" style={{ color: 'var(--uh-text-faint)' }}>⚠️ Report unsafe situations immediately via support</p>
                                        <p className="text-[10px]" style={{ color: 'var(--uh-text-faint)' }}>🚦 Follow traffic rules, even on campus roads</p>
                                    </div>
                                    {!application.onboardingChecklist.acceptedSafetyRules && (
                                        <button
                                            onClick={() => updateChecklist('acceptedSafetyRules')}
                                            disabled={updatingOnboarding}
                                            className="mt-2 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                                            style={{ background: 'rgba(255,107,87,0.12)', color: '#FF6B57', border: '1px solid rgba(255,107,87,0.3)' }}
                                        >
                                            {updatingOnboarding ? '...' : '✅ I accept safety rules'}
                                        </button>
                                    )}
                                    {application.onboardingChecklist.acceptedSafetyRules && (
                                        <p className="mt-2 text-xs font-bold" style={{ color: 'var(--uh-green)' }}>✅ Accepted</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Progress */}
                        <div className="mt-5">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-white">Onboarding Progress</span>
                                <span className="text-xs font-bold" style={{ color: 'var(--uh-green)' }}>
                                    {[application.onboardingChecklist.watchedVideo, application.onboardingChecklist.completedQuiz, application.onboardingChecklist.acceptedSafetyRules].filter(Boolean).length}/3
                                </span>
                            </div>
                            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                        width: `${([application.onboardingChecklist.watchedVideo, application.onboardingChecklist.completedQuiz, application.onboardingChecklist.acceptedSafetyRules].filter(Boolean).length / 3) * 100}%`,
                                        background: 'linear-gradient(90deg, #0F9D58, #2ECC71)',
                                    }}
                                />
                            </div>
                        </div>

                        <button onClick={() => setShowQuickstart(false)} className="uh-btn-ghost w-full mt-4 text-sm">
                            Close
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default HeroApplicationStatus;
