import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import useRazorpay from '../hooks/useRazorpay';

const PRESET_AMOUNTS = [50, 100, 200, 500];

const Wallet = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { openRazorpay } = useRazorpay();

    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [showTopup, setShowTopup] = useState(false);
    const [topupAmount, setTopupAmount] = useState(100);
    const [customAmount, setCustomAmount] = useState('');
    const [topupLoading, setTopupLoading] = useState(false);
    const [toast, setToast] = useState('');

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3500);
    };

    const fetchWallet = async () => {
        try {
            const { data } = await API.get('/user/wallet');
            setBalance(data.balance);
            setTransactions(data.transactions || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchWallet(); }, []);

    const finalAmount = customAmount ? Number(customAmount) : topupAmount;

    const handleTopup = async () => {
        if (!finalAmount || finalAmount < 1) { showToast('❌ Minimum top-up is ₹1'); return; }
        if (finalAmount > 10000) { showToast('❌ Maximum top-up is ₹10,000'); return; }

        setTopupLoading(true);
        try {
            // Step 1: Create Razorpay order
            const { data: order } = await API.post('/payments/razorpay/wallet/create-order', { amount: finalAmount });

            // Step 2: Open Razorpay popup
            openRazorpay({
                razorpayOrderId: order.razorpayOrderId,
                amount: order.amount,
                currency: order.currency,
                keyId: order.keyId,
                name: 'Market X Wallet',
                description: `Add ₹${finalAmount} to wallet`,
                prefill: { name: user?.name, email: user?.email },
                onSuccess: async ({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
                    try {
                        // Step 3: Verify and credit
                        await API.post('/payments/razorpay/wallet/verify', {
                            razorpayOrderId,
                            razorpayPaymentId,
                            razorpaySignature,
                            amount: finalAmount,
                        });
                        showToast(`✅ ₹${finalAmount} added to your wallet!`);
                        setShowTopup(false);
                        setCustomAmount('');
                        setTopupAmount(100);
                        fetchWallet(); // Refresh
                    } catch (e: any) {
                        showToast('❌ Verification failed: ' + (e.response?.data?.message || 'Please contact support'));
                    }
                    setTopupLoading(false);
                },
                onError: (err) => {
                    showToast('❌ Payment failed: ' + (typeof err === 'string' ? err : 'Try again'));
                    setTopupLoading(false);
                },
                onDismiss: () => setTopupLoading(false),
            });
        } catch (err: any) {
            showToast('❌ ' + (err.response?.data?.message || 'Failed to initiate payment'));
            setTopupLoading(false);
        }
    };

    return (
        <div className="uh-page max-w-lg mx-auto px-5 py-6">

            {/* Toast */}
            {toast && (
                <div className={`uh-toast ${toast.startsWith('✅') ? 'success' : 'error'}`}>{toast}</div>
            )}

            {/* Back */}
            <button onClick={() => navigate(-1)} className="uh-btn-ghost px-4 py-2 text-sm mb-6">
                ← Back
            </button>

            {/* Balance Hero Card */}
            <div className="rounded-2xl p-6 mb-6 relative overflow-hidden"
                style={{
                    background: 'linear-gradient(135deg, #FF6B57 0%, #ff8c7a 50%, #FF6B57 100%)',
                    boxShadow: '0 16px 48px rgba(255,107,87,0.35)',
                }}>
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20"
                    style={{ background: 'rgba(255,255,255,0.3)' }} />
                <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-10"
                    style={{ background: 'rgba(255,255,255,0.4)' }} />

                <div className="relative">
                    <p className="text-white/80 text-sm font-medium mb-1">💰 Total Balance</p>
                    <h2 className="text-4xl font-black text-white mb-6">
                        ₹{balance.toFixed(2)}
                    </h2>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowTopup(v => !v)}
                            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
                            style={{ background: 'rgba(255,255,255,0.2)', color: 'white', backdropFilter: 'blur(4px)' }}>
                            + Add Money
                        </button>
                        <button className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all opacity-50 cursor-not-allowed"
                            style={{ background: 'rgba(255,255,255,0.2)', color: 'white', backdropFilter: 'blur(4px)' }}>
                            Withdraw
                        </button>
                    </div>
                </div>
            </div>

            {/* Add Money Panel */}
            {showTopup && (
                <div className="uh-card p-5 mb-6"
                    style={{ border: '1px solid rgba(255,107,87,0.3)', animation: 'fadeIn 0.2s ease' }}>
                    <h3 className="text-white font-bold text-sm mb-4">💳 Add Money via Razorpay</h3>

                    {/* Preset amounts */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                        {PRESET_AMOUNTS.map(amt => (
                            <button
                                key={amt}
                                onClick={() => { setTopupAmount(amt); setCustomAmount(''); }}
                                className="py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
                                style={{
                                    background: topupAmount === amt && !customAmount
                                        ? 'rgba(255,107,87,0.2)' : 'rgba(255,255,255,0.05)',
                                    border: `1px solid ${topupAmount === amt && !customAmount
                                        ? 'rgba(255,107,87,0.5)' : 'rgba(255,255,255,0.1)'}`,
                                    color: topupAmount === amt && !customAmount ? '#FF6B57' : 'var(--uh-text-muted)',
                                }}>
                                ₹{amt}
                            </button>
                        ))}
                    </div>

                    {/* Custom amount */}
                    <div className="relative mb-4">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold"
                            style={{ color: 'var(--uh-text-muted)' }}>₹</span>
                        <input
                            type="number"
                            min="1"
                            max="10000"
                            placeholder="Enter custom amount"
                            value={customAmount}
                            onChange={e => { setCustomAmount(e.target.value); setTopupAmount(0); }}
                            className="uh-input pl-7"
                        />
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => { setShowTopup(false); setCustomAmount(''); }}
                            className="flex-1 uh-btn-ghost py-2.5 text-sm">
                            Cancel
                        </button>
                        <button
                            onClick={handleTopup}
                            disabled={topupLoading || !finalAmount}
                            className="flex-2 uh-btn-primary py-2.5 text-sm flex-1">
                            {topupLoading
                                ? <span className="flex items-center justify-center gap-2">
                                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    Processing...
                                </span>
                                : `Pay ₹${finalAmount || '—'} via Razorpay`
                            }
                        </button>
                    </div>

                    <p className="text-xs text-center mt-3" style={{ color: 'var(--uh-text-faint)' }}>
                        🔒 Secured by Razorpay · UPI, Cards, Net Banking supported
                    </p>
                </div>
            )}

            {/* Transactions */}
            <h3 className="text-base font-bold text-white mb-4">Transaction History</h3>

            {loading ? (
                <div className="flex justify-center py-12"><div className="uh-spinner" /></div>
            ) : transactions.length === 0 ? (
                <div className="uh-card text-center py-14">
                    <p className="text-4xl mb-3">💸</p>
                    <p className="text-white font-bold mb-1">No transactions yet</p>
                    <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>
                        Add money to get started
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {transactions.map((tx: any) => {
                        const isCredit = tx.type === 'credit';
                        const categoryEmoji: Record<string, string> = {
                            top_up: '💳', payment: '🛒', refund: '↩️',
                            wallet_credit: '🎁', delivery_earning: '🚴',
                            withdrawal: '↗️', dispute_credit: '⚖️', adjustment: '🔧',
                        };
                        return (
                            <div key={tx._id} className="uh-card p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                                        style={{
                                            background: isCredit ? 'rgba(15,157,88,0.12)' : 'rgba(217,58,58,0.08)',
                                            border: `1px solid ${isCredit ? 'rgba(15,157,88,0.25)' : 'rgba(217,58,58,0.2)'}`,
                                        }}>
                                        {categoryEmoji[tx.category] || (isCredit ? '⬇️' : '⬆️')}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">{tx.reference}</p>
                                        <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--uh-text-faint)' }}>
                                            {tx.category?.replace(/_/g, ' ')} · {new Date(tx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-base font-black"
                                        style={{ color: isCredit ? 'var(--uh-green)' : 'var(--uh-error)' }}>
                                        {isCredit ? '+' : '-'}₹{Math.abs(tx.amount).toFixed(0)}
                                    </span>
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--uh-text-faint)' }}>
                                        Bal: ₹{tx.balanceAfter?.toFixed(0)}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Wallet;
