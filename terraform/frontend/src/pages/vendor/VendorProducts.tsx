import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';

interface Product {
    _id: string; name: string; description: string;
    price: number; inventory: number; category: string; status: string; tags: string[];
    images: string[];
}

const catEmoji: Record<string, string> = {
    food: '🍔', books: '📚', stationery: '✏️',
    electronics: '💻', clothing: '👕', services: '⚙️', other: '📦'
};
const categories = ['food', 'books', 'stationery', 'electronics', 'clothing', 'services', 'other'];

const inputCls = "uh-input";
const selectCls = "uh-input appearance-none cursor-pointer";

const VendorProducts = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const storeApproved = user?.store?.status === 'approved';
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Product | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<{ name: string, description: string, price: string, inventory: string, category: string, tags: string, images: string[] }>({ name: '', description: '', price: '', inventory: '', category: 'food', tags: '', images: [] });
    const [imageError, setImageError] = useState('');

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        setImageError('');
        const validFiles = files.filter(f => {
            if (!['image/jpeg', 'image/png', 'image/jpg'].includes(f.type)) {
                setImageError('Only JPEG/PNG images are allowed.');
                return false;
            }
            if (f.size > 5 * 1024 * 1024) {
                setImageError('Each image must be under 5MB.');
                return false;
            }
            return true;
        });

        if (form.images.length + validFiles.length > 4) {
            setImageError('Maximum 4 images allowed per product.');
            return;
        }

        validFiles.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setForm(prev => ({ ...prev, images: [...prev.images, base64String] }));
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index: number) => {
        setForm(prev => {
            const newImages = [...prev.images];
            newImages.splice(index, 1);
            return { ...prev, images: newImages };
        });
    };

    const fetchProducts = async () => {
        try { const { data } = await API.get('/vendor/products'); setProducts(data); }
        catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchProducts(); }, []);

    const resetForm = () => { setForm({ name: '', description: '', price: '', inventory: '', category: 'food', tags: '', images: [] }); setEditing(null); setShowForm(false); setImageError(''); };

    const startEdit = (p: Product) => {
        setForm({ name: p.name, description: p.description || '', price: p.price.toString(), inventory: p.inventory.toString(), category: p.category, tags: p.tags?.join(', ') || '', images: p.images || [] });
        setEditing(p); setShowForm(true); setImageError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true);
        try {
            const payload = { name: form.name, description: form.description, price: parseFloat(form.price), inventory: parseInt(form.inventory), category: form.category, images: form.images, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) };
            if (editing) await API.put(`/vendor/products/${editing._id}`, payload);
            else await API.post('/vendor/products', payload);
            resetForm(); await fetchProducts();
        } catch (err: any) { alert(err.response?.data?.message || 'Failed to save'); }
        finally { setSaving(false); }
    };

    const deleteProduct = async (id: string) => {
        if (!confirm('Archive this product?')) return;
        try { await API.delete(`/vendor/products/${id}`); await fetchProducts(); }
        catch (err) { console.error(err); }
    };

    if (loading) return <div className="flex justify-center items-center py-32"><div className="uh-spinner" /></div>;

    return (
        <div className="uh-page max-w-6xl mx-auto px-6 py-8">

            {/* Pending store alert with Sign Out */}
            {!storeApproved && (
                <div className="mb-6 px-5 py-4 rounded-xl flex items-center justify-between gap-3 text-sm"
                    style={{ background: 'rgba(255,204,0,0.08)', border: '1px solid rgba(255,204,0,0.2)', color: '#FFCC00' }}>
                    <div className="flex items-start gap-3">
                        <span className="text-xl">⏳</span>
                        <div>
                            <p className="font-bold">Store pending admin approval</p>
                            <p className="text-xs opacity-80 mt-0.5">Your store will be visible to students once an admin approves it.</p>
                        </div>
                    </div>
                    <button onClick={() => { logout(); navigate('/login'); }} className="text-xs font-bold px-4 py-2 rounded-lg transition-all"
                        style={{ background: 'rgba(255,204,0,0.15)', border: '1px solid rgba(255,204,0,0.3)', color: '#FFCC00', whiteSpace: 'nowrap' }}>
                        Sign Out
                    </button>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-black text-white mb-1" style={{ letterSpacing: '-0.5px' }}>Your Products</h1>
                    <p className="text-sm" style={{ color: 'var(--uh-text-muted)' }}>{products.length} product{products.length !== 1 ? 's' : ''} listed</p>
                </div>
                <button onClick={() => { resetForm(); setShowForm(true); }} className="uh-btn-primary px-5 py-2.5 text-sm">
                    + Add Product
                </button>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
                    <div className="uh-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-xl font-bold text-white">{editing ? '✏️ Edit Product' : '➕ Add Product'}</h3>
                            <button onClick={resetForm} className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                                style={{ color: 'var(--uh-text-muted)', background: 'rgba(255,255,255,0.06)' }}>✕</button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <p className="uh-label mb-2">Product Name *</p>
                                <input type="text" placeholder="e.g. Choco Lava Cake" value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    className={inputCls} required />
                            </div>
                            <div>
                                <p className="uh-label mb-2">Description</p>
                                <textarea placeholder="Describe your product..." value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    rows={3} className={inputCls} style={{ resize: 'none' }} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="uh-label mb-2">Price (₹) *</p>
                                    <input type="number" step="0.01" min="0" placeholder="0.00" value={form.price}
                                        onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                                        className={inputCls} required />
                                </div>
                                <div>
                                    <p className="uh-label mb-2">Inventory *</p>
                                    <input type="number" min="0" placeholder="0" value={form.inventory}
                                        onChange={e => setForm(f => ({ ...f, inventory: e.target.value }))}
                                        className={inputCls} required />
                                </div>
                            </div>
                            <div>
                                <p className="uh-label mb-2">Category *</p>
                                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                    className={selectCls}>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat} style={{ background: '#12121e' }}>
                                            {catEmoji[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <p className="uh-label mb-2">Tags (comma-separated)</p>
                                <input type="text" placeholder="e.g. organic, snacks, campus" value={form.tags}
                                    onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                                    className={inputCls} />
                            </div>

                            {/* Images */}
                            <div>
                                <p className="uh-label mb-2">Images (Max 4, &lt;5MB, JPEG/PNG)</p>
                                <div className="flex gap-2 mb-2 flex-wrap">
                                    {form.images.map((img, i) => (
                                        <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-700">
                                            <img src={img} alt={`upload-${i}`} className="w-full h-full object-cover" />
                                            <button type="button" onClick={() => removeImage(i)} className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-4 h-4 flex justify-center items-center text-[10px]">✕</button>
                                        </div>
                                    ))}
                                    {form.images.length < 4 && (
                                        <label className="w-16 h-16 rounded-lg border border-dashed border-gray-600 flex items-center justify-center cursor-pointer hover:bg-gray-800 transition-colors">
                                            <input type="file" multiple accept="image/jpeg, image/png, image/jpg" className="hidden" onChange={handleImageChange} />
                                            <span className="text-gray-400 text-2xl">+</span>
                                        </label>
                                    )}
                                </div>
                                {imageError && <p className="text-xs text-red-500">{imageError}</p>}
                            </div>

                            <div className="flex gap-3 pt-1">
                                <button type="submit" disabled={saving} className="uh-btn-primary flex-1 py-3">
                                    {saving
                                        ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving...</span>
                                        : editing ? '✓ Update Product' : '+ Create Product'}
                                </button>
                                <button type="button" onClick={resetForm} className="uh-btn-ghost px-5">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Products List */}
            {products.length === 0 ? (
                <div className="uh-card text-center py-20">
                    <p className="text-6xl mb-4">📦</p>
                    <p className="text-xl font-bold text-white mb-2">No products yet</p>
                    <p className="text-sm mb-8" style={{ color: 'var(--uh-text-muted)' }}>Add your first product to start selling to campus students</p>
                    <button onClick={() => { resetForm(); setShowForm(true); }} className="uh-btn-primary px-8 py-3 inline-block">
                        + Add First Product
                    </button>
                </div>
            ) : (
                <div className="uh-card overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-12 gap-4 px-5 py-3" style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--uh-card-border)' }}>
                        {['Product', 'Category', 'Price', 'Stock', 'Status', 'Actions'].map((h, i) => (
                            <div key={h} className={`uh-label ${i === 0 ? 'col-span-4' : i === 5 ? 'col-span-2' : 'col-span-1'}`}>{h}</div>
                        ))}
                    </div>

                    {products.map((product, idx) => (
                        <div key={product._id}
                            className="grid grid-cols-12 gap-4 items-center px-5 py-4"
                            style={{ borderBottom: idx < products.length - 1 ? '1px solid var(--uh-card-border)' : 'none' }}>

                            {/* Product name+desc */}
                            <div className="col-span-4">
                                <div className="flex items-center gap-3">
                                    {product.images?.[0] ? (
                                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-700">
                                            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <span className="text-2xl">{catEmoji[product.category] || '📦'}</span>
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-white font-semibold text-sm truncate">{product.name}</p>
                                        <p className="text-xs truncate" style={{ color: 'var(--uh-text-muted)' }}>
                                            {product.description || 'No description'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-1">
                                <span className="text-xs capitalize" style={{ color: 'var(--uh-text-muted)' }}>{product.category}</span>
                            </div>

                            <div className="col-span-1">
                                <span className="font-bold text-sm" style={{ color: 'var(--uh-green)' }}>₹{product.price.toFixed(0)}</span>
                            </div>

                            <div className="col-span-1">
                                <span className="text-sm font-semibold" style={{ color: product.inventory > 0 ? 'var(--uh-text)' : 'var(--uh-error)' }}>
                                    {product.inventory}
                                </span>
                            </div>

                            <div className="col-span-1">
                                <span className={product.status === 'active' ? 'uh-badge-green' : product.status === 'archived' ? 'uh-label' : 'uh-badge-yellow'}>
                                    {product.status}
                                </span>
                            </div>

                            <div className="col-span-4 flex gap-2">
                                <button onClick={() => startEdit(product)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                    style={{ background: 'rgba(255,107,87,0.1)', border: '1px solid rgba(255,107,87,0.25)', color: '#FF6B57' }}>
                                    ✏️ Edit
                                </button>
                                <button onClick={() => deleteProduct(product._id)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                    style={{ background: 'rgba(217,58,58,0.08)', border: '1px solid rgba(217,58,58,0.2)', color: '#D93A3A' }}>
                                    Archive
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default VendorProducts;
