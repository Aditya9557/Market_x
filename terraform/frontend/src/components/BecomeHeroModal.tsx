import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

interface BecomeHeroModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApplicationSubmitted: () => void;
}

const ZONES = [
    'Hostel A', 'Hostel B', 'Hostel C', 'Hostel D', 'Hostel E',
    'Main Gate Area', 'Library Block', 'Academic Block 1', 'Academic Block 2',
    'Cafeteria Zone', 'Sports Complex', 'Other'
];

const HOUR_SLOTS = [
    { value: 'morning', label: '🌅 Morning (6am–12pm)', emoji: '🌅' },
    { value: 'afternoon', label: '☀️ Afternoon (12pm–6pm)', emoji: '☀️' },
    { value: 'night', label: '🌙 Night (6pm–12am)', emoji: '🌙' },
];

const VEHICLES = [
    { value: 'walk', emoji: '🚶', label: 'Walking' },
    { value: 'bicycle', emoji: '🚲', label: 'Bicycle' },
    { value: 'scooter', emoji: '🛵', label: 'Scooter' },
    { value: 'car', emoji: '🚗', label: 'Car' },
];

const BecomeHeroModal = ({ isOpen, onClose, onApplicationSubmitted }: BecomeHeroModalProps) => {
    const { user, login } = useAuth();
    const [activeTab, setActiveTab] = useState<'signup' | 'login'>('signup');
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);
    const [showRulesModal, setShowRulesModal] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);

    // Signup form state
    const [form, setForm] = useState({
        fullName: user?.name || '',
        campusEmail: user?.email || '',
        phone: '',
        zone: '',
        preferredHours: [] as string[],
        bankDetails: '',
        vehicleType: 'walk',
        agreedToRules: false,
    });
    const [studentIdFile, setStudentIdFile] = useState<File | null>(null);
    const [selfieFile, setSelfieFile] = useState<File | null>(null);
    const [studentIdPreview, setStudentIdPreview] = useState<string>('');
    const [selfiePreview, setSelfiePreview] = useState<string>('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Login form state
    const [loginForm, setLoginForm] = useState({
        email: user?.email || '',
        password: '',
    });
    const [loginError, setLoginError] = useState('');

    // Prefill when user changes
    useEffect(() => {
        if (user) {
            setForm(f => ({
                ...f,
                fullName: user.name || f.fullName,
                campusEmail: user.email || f.campusEmail,
            }));
            setLoginForm(l => ({
                ...l,
                email: user.email || l.email,
            }));
        }
    }, [user]);

    // Close on ESC
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    // Body scroll lock
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const showToast = (type: 'success' | 'error' | 'info', msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

    // ──── Validation ────
    const validateSignup = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!form.fullName.trim()) newErrors.fullName = 'Full name is required';
        if (!form.campusEmail.trim()) newErrors.campusEmail = 'Campus email is required';
        if (!form.phone.trim()) newErrors.phone = 'Phone number is required';
        else if (!/^\d{10}$/.test(form.phone)) newErrors.phone = 'Phone must be exactly 10 digits';
        if (!form.zone) newErrors.zone = 'Please select your zone/hostel';
        if (form.preferredHours.length === 0) newErrors.preferredHours = 'Select at least one time slot';
        if (!studentIdFile) newErrors.studentId = 'Student ID photo is required';
        if (!selfieFile) newErrors.selfie = 'Selfie photo is required';
        if (!form.agreedToRules) newErrors.agreedToRules = 'You must agree to the Hero rules';

        // File size validation (5MB)
        if (studentIdFile && studentIdFile.size > 5 * 1024 * 1024) {
            newErrors.studentId = 'Student ID must be under 5MB';
        }
        if (selfieFile && selfieFile.size > 5 * 1024 * 1024) {
            newErrors.selfie = 'Selfie must be under 5MB';
        }
        // Image type validation
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
        if (studentIdFile && !allowedTypes.includes(studentIdFile.type)) {
            newErrors.studentId = 'Only JPEG, PNG, WebP, or HEIC files accepted';
        }
        if (selfieFile && !allowedTypes.includes(selfieFile.type)) {
            newErrors.selfie = 'Only JPEG, PNG, WebP, or HEIC files accepted';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // ──── File Upload ────
    const handleFileSelect = (type: 'studentId' | 'selfie', file: File | null) => {
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            showToast('error', 'File must be under 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            if (type === 'studentId') {
                setStudentIdFile(file);
                setStudentIdPreview(dataUrl);
                setErrors(prev => { const n = { ...prev }; delete n.studentId; return n; });
            } else {
                setSelfieFile(file);
                setSelfiePreview(dataUrl);
                setErrors(prev => { const n = { ...prev }; delete n.selfie; return n; });
            }
        };
        reader.readAsDataURL(file);
    };

    // ──── Signup Submit ────
    const handleSignupSubmit = async () => {
        if (!validateSignup()) {
            showToast('error', 'Please fix the errors below');
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                fullName: form.fullName,
                campusEmail: form.campusEmail,
                phone: form.phone,
                zone: form.zone,
                preferredHours: form.preferredHours,
                bankDetails: form.bankDetails || undefined,
                vehicleType: form.vehicleType,
                agreedToRules: form.agreedToRules,
                // In production, upload to S3/Cloudinary first; for now send as data URLs
                studentIdUrl: studentIdPreview || undefined,
                selfieUrl: selfiePreview || undefined,
            };

            await API.post('/hero-application/apply', payload);
            showToast('success', '🎉 Application submitted successfully!');
            onApplicationSubmitted();
            setTimeout(onClose, 1500);
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to submit application';
            showToast('error', msg);
        } finally {
            setSubmitting(false);
        }
    };

    // ──── Login Submit ────
    const handleLoginSubmit = async () => {
        setLoginError('');
        if (!loginForm.email.trim() || !loginForm.password.trim()) {
            setLoginError('Email and password are required');
            return;
        }
        setSubmitting(true);
        try {
            await login(loginForm.email, loginForm.password);
            showToast('success', '✅ Logged in as Hero!');
            setTimeout(onClose, 800);
        } catch (err: any) {
            setLoginError(err.response?.data?.message || 'Login failed. Check your credentials.');
        } finally {
            setSubmitting(false);
        }
    };

    // ──── Toggle Preferred Hours ────
    const toggleHour = (hour: string) => {
        setForm(f => ({
            ...f,
            preferredHours: f.preferredHours.includes(hour)
                ? f.preferredHours.filter(h => h !== hour)
                : [...f.preferredHours, hour],
        }));
        setErrors(prev => { const n = { ...prev }; delete n.preferredHours; return n; });
    };

    if (!isOpen) return null;

    const hasErrors = Object.keys(errors).length > 0;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
                onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
                style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            >
                {/* Modal */}
                <div
                    ref={modalRef}
                    className="w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl relative"
                    style={{
                        background: 'linear-gradient(180deg, #1a1a2e 0%, #12121e 60%)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 -8px 60px rgba(0,0,0,0.5), 0 0 80px rgba(255,107,87,0.08)',
                        animation: 'heroModalSlide 0.2s ease-out',
                    }}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Become a Hero"
                >
                    {/* Handle bar (mobile) */}
                    <div className="flex justify-center pt-3 sm:hidden">
                        <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
                    </div>

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full z-10 text-lg"
                        style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--uh-text-muted)' }}
                        aria-label="Close modal"
                    >
                        ✕
                    </button>

                    {/* Hero Header */}
                    <div className="px-6 pt-6 pb-4 text-center">
                        <div
                            className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center text-3xl"
                            style={{
                                background: 'linear-gradient(135deg, #FF6B57, #FF3B5C)',
                                boxShadow: '0 8px 32px rgba(255,107,87,0.35)',
                            }}
                        >
                            🦸
                        </div>
                        <h2 className="text-2xl font-black text-white mb-1">Become a Hero</h2>
                        <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>
                            Earn by helping classmates — flexible hours
                        </p>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex mx-6 mb-5 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {(['signup', 'login'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => { setActiveTab(tab); setErrors({}); }}
                                className="flex-1 py-2.5 text-sm font-bold transition-all capitalize"
                                style={{
                                    background: activeTab === tab ? 'linear-gradient(135deg, #FF6B57, #FF3B5C)' : 'transparent',
                                    color: activeTab === tab ? '#fff' : 'var(--uh-text-muted)',
                                    borderRadius: '10px',
                                    margin: activeTab === tab ? '3px' : '3px',
                                }}
                            >
                                {tab === 'signup' ? '📝 Sign Up' : '🔑 Login'}
                            </button>
                        ))}
                    </div>

                    {/* ──── Tab Content ──── */}
                    <div className="px-6 pb-6">
                        {activeTab === 'signup' ? (
                            /* ════════ SIGN UP TAB ════════ */
                            <div>
                                {/* Hero pitch */}
                                <div className="p-4 rounded-xl mb-5" style={{ background: 'rgba(255,107,87,0.06)', border: '1px solid rgba(255,107,87,0.15)' }}>
                                    <p className="text-sm font-semibold" style={{ color: 'var(--uh-coral)' }}>
                                        🌟 Deliver to classmates, earn per trip, and build reputation.
                                    </p>
                                </div>

                                {/* Error Summary */}
                                {hasErrors && (
                                    <div className="p-3 rounded-xl mb-4" style={{ background: 'rgba(217,58,58,0.1)', border: '1px solid rgba(217,58,58,0.25)' }}>
                                        <p className="text-xs font-bold" style={{ color: '#D93A3A' }}>
                                            ⚠️ Please fix {Object.keys(errors).length} error(s) below
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    {/* Full Name */}
                                    <div>
                                        <label className="uh-label block mb-1.5">Full Name *</label>
                                        <input
                                            type="text"
                                            value={form.fullName}
                                            onChange={(e) => { setForm(f => ({ ...f, fullName: e.target.value })); setErrors(prev => { const n = { ...prev }; delete n.fullName; return n; }); }}
                                            className="uh-input"
                                            placeholder="Your full name"
                                            readOnly={!!user?.name}
                                            style={user?.name ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                                            onBlur={() => { if (!form.fullName.trim()) setErrors(p => ({ ...p, fullName: 'Required' })); }}
                                        />
                                        {errors.fullName && <p className="text-xs mt-1" style={{ color: '#D93A3A' }}>{errors.fullName}</p>}
                                    </div>

                                    {/* Campus Email */}
                                    <div>
                                        <label className="uh-label block mb-1.5">Campus Email *</label>
                                        <input
                                            type="email"
                                            value={form.campusEmail}
                                            onChange={(e) => { setForm(f => ({ ...f, campusEmail: e.target.value })); setErrors(prev => { const n = { ...prev }; delete n.campusEmail; return n; }); }}
                                            className="uh-input"
                                            placeholder="your.email@campus.edu"
                                            readOnly={!!user?.email}
                                            style={user?.email ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                                            onBlur={() => { if (!form.campusEmail.trim()) setErrors(p => ({ ...p, campusEmail: 'Required' })); }}
                                        />
                                        {user?.email && <p className="text-xs mt-1" style={{ color: 'var(--uh-green)' }}>✓ Verified from your student profile</p>}
                                        {errors.campusEmail && <p className="text-xs mt-1" style={{ color: '#D93A3A' }}>{errors.campusEmail}</p>}
                                    </div>

                                    {/* Phone */}
                                    <div>
                                        <label className="uh-label block mb-1.5">Phone Number *</label>
                                        <input
                                            type="tel"
                                            value={form.phone}
                                            onChange={(e) => {
                                                const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                setForm(f => ({ ...f, phone: v }));
                                                setErrors(prev => { const n = { ...prev }; delete n.phone; return n; });
                                            }}
                                            className="uh-input"
                                            placeholder="10-digit phone number"
                                            inputMode="numeric"
                                            maxLength={10}
                                            onBlur={() => {
                                                if (!form.phone.trim()) setErrors(p => ({ ...p, phone: 'Required' }));
                                                else if (!/^\d{10}$/.test(form.phone)) setErrors(p => ({ ...p, phone: 'Must be 10 digits' }));
                                            }}
                                        />
                                        <p className="text-xs mt-1" style={{ color: 'var(--uh-text-faint)' }}>{form.phone.length}/10 digits</p>
                                        {errors.phone && <p className="text-xs mt-0.5" style={{ color: '#D93A3A' }}>{errors.phone}</p>}
                                    </div>

                                    {/* Zone */}
                                    <div>
                                        <label className="uh-label block mb-1.5">Current Zone / Hostel *</label>
                                        <select
                                            value={form.zone}
                                            onChange={(e) => { setForm(f => ({ ...f, zone: e.target.value })); setErrors(prev => { const n = { ...prev }; delete n.zone; return n; }); }}
                                            className="uh-input"
                                            style={{ appearance: 'none' }}
                                        >
                                            <option value="">Select your zone</option>
                                            {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                                        </select>
                                        {errors.zone && <p className="text-xs mt-1" style={{ color: '#D93A3A' }}>{errors.zone}</p>}
                                    </div>

                                    {/* Preferred Hours */}
                                    <div>
                                        <label className="uh-label block mb-2">Preferred Hours *</label>
                                        <div className="flex gap-2 flex-wrap">
                                            {HOUR_SLOTS.map(slot => (
                                                <button
                                                    key={slot.value}
                                                    type="button"
                                                    onClick={() => toggleHour(slot.value)}
                                                    className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
                                                    style={{
                                                        background: form.preferredHours.includes(slot.value) ? 'rgba(255,107,87,0.12)' : 'rgba(255,255,255,0.03)',
                                                        border: `1.5px solid ${form.preferredHours.includes(slot.value) ? 'rgba(255,107,87,0.5)' : 'rgba(255,255,255,0.08)'}`,
                                                        color: form.preferredHours.includes(slot.value) ? '#FF6B57' : 'var(--uh-text-muted)',
                                                    }}
                                                >
                                                    {slot.emoji} {slot.value.charAt(0).toUpperCase() + slot.value.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                        {errors.preferredHours && <p className="text-xs mt-1" style={{ color: '#D93A3A' }}>{errors.preferredHours}</p>}
                                    </div>

                                    {/* Vehicle Type */}
                                    <div>
                                        <label className="uh-label block mb-2">How will you deliver? *</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {VEHICLES.map(v => (
                                                <button
                                                    key={v.value}
                                                    type="button"
                                                    onClick={() => setForm(f => ({ ...f, vehicleType: v.value }))}
                                                    className="p-3 rounded-xl text-center transition-all"
                                                    style={{
                                                        background: form.vehicleType === v.value ? 'rgba(255,107,87,0.12)' : 'rgba(255,255,255,0.03)',
                                                        border: `1.5px solid ${form.vehicleType === v.value ? 'rgba(255,107,87,0.5)' : 'rgba(255,255,255,0.08)'}`,
                                                        color: form.vehicleType === v.value ? '#FF6B57' : 'var(--uh-text-muted)',
                                                    }}
                                                >
                                                    <span className="text-2xl block mb-0.5">{v.emoji}</span>
                                                    <span className="text-[10px] font-bold">{v.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Document Uploads */}
                                    <div>
                                        <label className="uh-label block mb-2">Verification Documents *</label>
                                        <p className="text-xs mb-3" style={{ color: 'var(--uh-text-faint)' }}>
                                            JPEG, PNG, WebP or HEIC · Max 5MB each
                                        </p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Student ID */}
                                            <div>
                                                <label
                                                    className="block p-4 rounded-xl text-center cursor-pointer transition-all group"
                                                    style={{
                                                        background: studentIdPreview ? 'transparent' : 'rgba(255,255,255,0.03)',
                                                        border: `2px dashed ${errors.studentId ? 'rgba(217,58,58,0.5)' : studentIdPreview ? 'rgba(15,157,88,0.4)' : 'rgba(255,255,255,0.1)'}`,
                                                    }}
                                                >
                                                    <input
                                                        type="file"
                                                        accept="image/jpeg,image/png,image/webp,image/heic"
                                                        capture="environment"
                                                        className="hidden"
                                                        onChange={e => handleFileSelect('studentId', e.target.files?.[0] || null)}
                                                    />
                                                    {studentIdPreview ? (
                                                        <div className="relative">
                                                            <img src={studentIdPreview} alt="student id" className="w-full h-20 object-cover rounded-lg" />
                                                            <p className="text-[10px] font-bold mt-1" style={{ color: 'var(--uh-green)' }}>✓ Student ID</p>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <span className="text-2xl block mb-1 group-hover:scale-110 transition-transform">🪪</span>
                                                            <span className="text-[10px] font-bold" style={{ color: 'var(--uh-text-muted)' }}>Student ID</span>
                                                        </>
                                                    )}
                                                </label>
                                                {errors.studentId && <p className="text-[10px] mt-1" style={{ color: '#D93A3A' }}>{errors.studentId}</p>}
                                            </div>
                                            {/* Selfie */}
                                            <div>
                                                <label
                                                    className="block p-4 rounded-xl text-center cursor-pointer transition-all group"
                                                    style={{
                                                        background: selfiePreview ? 'transparent' : 'rgba(255,255,255,0.03)',
                                                        border: `2px dashed ${errors.selfie ? 'rgba(217,58,58,0.5)' : selfiePreview ? 'rgba(15,157,88,0.4)' : 'rgba(255,255,255,0.1)'}`,
                                                    }}
                                                >
                                                    <input
                                                        type="file"
                                                        accept="image/jpeg,image/png,image/webp,image/heic"
                                                        capture="user"
                                                        className="hidden"
                                                        onChange={e => handleFileSelect('selfie', e.target.files?.[0] || null)}
                                                    />
                                                    {selfiePreview ? (
                                                        <div className="relative">
                                                            <img src={selfiePreview} alt="selfie" className="w-full h-20 object-cover rounded-lg" />
                                                            <p className="text-[10px] font-bold mt-1" style={{ color: 'var(--uh-green)' }}>✓ Selfie</p>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <span className="text-2xl block mb-1 group-hover:scale-110 transition-transform">🤳</span>
                                                            <span className="text-[10px] font-bold" style={{ color: 'var(--uh-text-muted)' }}>Selfie</span>
                                                        </>
                                                    )}
                                                </label>
                                                {errors.selfie && <p className="text-[10px] mt-1" style={{ color: '#D93A3A' }}>{errors.selfie}</p>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bank Details (optional) */}
                                    <div>
                                        <label className="uh-label block mb-1.5">Bank / UPI Details <span className="text-[10px] font-normal">(optional — needed before first payout)</span></label>
                                        <input
                                            type="text"
                                            value={form.bankDetails}
                                            onChange={(e) => setForm(f => ({ ...f, bankDetails: e.target.value }))}
                                            className="uh-input"
                                            placeholder="UPI ID or bank account details"
                                        />
                                    </div>

                                    {/* Agreement */}
                                    <div>
                                        <label className="flex items-start gap-3 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={form.agreedToRules}
                                                onChange={(e) => {
                                                    setForm(f => ({ ...f, agreedToRules: e.target.checked }));
                                                    setErrors(prev => { const n = { ...prev }; delete n.agreedToRules; return n; });
                                                }}
                                                className="mt-1 w-4 h-4 rounded accent-[#FF6B57]"
                                            />
                                            <span className="text-xs" style={{ color: 'var(--uh-text-muted)' }}>
                                                I agree to the{' '}
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.preventDefault(); setShowRulesModal(true); }}
                                                    className="font-bold underline"
                                                    style={{ color: 'var(--uh-coral)' }}
                                                >
                                                    Hero rules & code of conduct
                                                </button>
                                                {' '}*
                                            </span>
                                        </label>
                                        {errors.agreedToRules && <p className="text-xs mt-1 ml-7" style={{ color: '#D93A3A' }}>{errors.agreedToRules}</p>}
                                    </div>

                                    {/* Privacy Microcopy */}
                                    <div className="p-3 rounded-xl space-y-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <p className="text-[10px]" style={{ color: 'var(--uh-text-faint)' }}>
                                            🔒 We keep ID photos secure; only admins can view them for verification.
                                        </p>
                                        <p className="text-[10px]" style={{ color: 'var(--uh-text-faint)' }}>
                                            📍 Your location is only shared with Heroes when you request delivery and only precise location after acceptance.
                                        </p>
                                    </div>

                                    {/* Submit */}
                                    <button
                                        onClick={handleSignupSubmit}
                                        disabled={submitting}
                                        className="uh-btn-primary w-full py-3.5 text-base mt-2"
                                    >
                                        {submitting ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                                Submitting...
                                            </span>
                                        ) : '🦸 Apply to be a Hero'}
                                    </button>

                                    <p className="text-center text-[11px] mt-2" style={{ color: 'var(--uh-text-faint)' }}>
                                        Applications reviewed within 24–48 hours. You'll be notified when approved.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            /* ════════ LOGIN TAB ════════ */
                            <div>
                                <div className="space-y-4">
                                    {loginError && (
                                        <div className="p-3 rounded-xl" style={{ background: 'rgba(217,58,58,0.1)', border: '1px solid rgba(217,58,58,0.25)' }}>
                                            <p className="text-xs font-bold" style={{ color: '#D93A3A' }}>❌ {loginError}</p>
                                        </div>
                                    )}

                                    <div>
                                        <label className="uh-label block mb-1.5">Campus Email / Phone</label>
                                        <input
                                            type="text"
                                            value={loginForm.email}
                                            onChange={(e) => setLoginForm(f => ({ ...f, email: e.target.value }))}
                                            className="uh-input"
                                            placeholder="your.email@campus.edu"
                                            autoComplete="email"
                                        />
                                    </div>

                                    <div>
                                        <label className="uh-label block mb-1.5">Password</label>
                                        <input
                                            type="password"
                                            value={loginForm.password}
                                            onChange={(e) => setLoginForm(f => ({ ...f, password: e.target.value }))}
                                            className="uh-input"
                                            placeholder="Enter your password"
                                            autoComplete="current-password"
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleLoginSubmit(); }}
                                        />
                                    </div>

                                    <button
                                        onClick={handleLoginSubmit}
                                        disabled={submitting}
                                        className="uh-btn-primary w-full py-3.5 text-base"
                                    >
                                        {submitting ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                                Logging in...
                                            </span>
                                        ) : '🔑 Login as Hero'}
                                    </button>

                                    <div className="flex items-center justify-between text-xs">
                                        <button className="font-semibold" style={{ color: 'var(--uh-coral)' }}>
                                            Forgot password?
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('signup')}
                                            className="font-semibold"
                                            style={{ color: 'var(--uh-text-muted)' }}
                                        >
                                            Not a Hero yet? <span style={{ color: 'var(--uh-coral)' }}>Sign up</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div
                    className={`uh-toast ${toast.type}`}
                    style={{ zIndex: 200 }}
                >
                    {toast.msg}
                </div>
            )}

            {/* Rules Modal */}
            {showRulesModal && (
                <div
                    className="fixed inset-0 z-[150] flex items-center justify-center p-4"
                    onClick={() => setShowRulesModal(false)}
                    style={{ background: 'rgba(0,0,0,0.6)' }}
                >
                    <div
                        className="w-full max-w-md max-h-[70vh] overflow-y-auto rounded-2xl p-6"
                        onClick={e => e.stopPropagation()}
                        style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                        <h3 className="text-lg font-black text-white mb-4">🦸 Hero Rules & Code of Conduct</h3>
                        <div className="space-y-3 text-sm" style={{ color: 'var(--uh-text-muted)' }}>
                            <p><strong className="text-white">1.</strong> Always deliver within the estimated time window.</p>
                            <p><strong className="text-white">2.</strong> Handle all items with care — report damage immediately.</p>
                            <p><strong className="text-white">3.</strong> Be respectful and professional with all students and vendors.</p>
                            <p><strong className="text-white">4.</strong> Keep your delivery area clean and tidy.</p>
                            <p><strong className="text-white">5.</strong> Follow campus safety guidelines at all times.</p>
                            <p><strong className="text-white">6.</strong> Do not share customer contact details with anyone.</p>
                            <p><strong className="text-white">7.</strong> Cancelling accepted orders affects your reliability score.</p>
                            <p><strong className="text-white">8.</strong> Maintain a rating above 3.0 to stay active.</p>
                            <p><strong className="text-white">9.</strong> Report any issues through the support channel promptly.</p>
                            <p><strong className="text-white">10.</strong> UniHeart reserves the right to suspend accounts that violate these rules.</p>
                        </div>
                        <button onClick={() => setShowRulesModal(false)} className="uh-btn-primary w-full mt-5 py-2.5 text-sm">
                            Got it ✓
                        </button>
                    </div>
                </div>
            )}

            {/* CSS Animation */}
            <style>{`
                @keyframes heroModalSlide {
                    from { opacity: 0; transform: translateY(40px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </>
    );
};

export default BecomeHeroModal;
