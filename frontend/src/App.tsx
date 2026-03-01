import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminDashboard from './pages/AdminDashboard';
import AdminStores from './pages/admin/AdminStores';
import AdminOrders from './pages/admin/AdminOrders';
import AdminHeroQueue from './pages/admin/AdminHeroQueue';
import AdminAuditLog from './pages/admin/AdminAuditLog';
import AdminRiskDashboard from './pages/admin/AdminRiskDashboard';
import AdminReconciliation from './pages/admin/AdminReconciliation';
import AdminCampusConfig from './pages/admin/AdminCampusConfig';
import ProductCatalog from './pages/student/ProductCatalog';
import ProductDetail from './pages/student/ProductDetail';
import CartPage from './pages/student/CartPage';
import Checkout from './pages/student/Checkout';
import OrderHistory from './pages/student/OrderHistory';
import TrackDelivery from './pages/student/TrackDelivery';
import VendorDashboard from './pages/vendor/VendorDashboard';
import VendorProducts from './pages/vendor/VendorProducts';
import VendorOrders from './pages/vendor/VendorOrders';
import StoreSettings from './pages/vendor/StoreSettings';
import HeroDashboard from './pages/hero/HeroDashboard';
import HeroOrders from './pages/hero/HeroOrders';
import ActiveDelivery from './pages/hero/ActiveDelivery';
import HeroEarnings from './pages/hero/HeroEarnings';
import Profile from './pages/Profile';
import Wallet from './pages/Wallet';
import ContactSupport from './pages/ContactSupport';
import InfoPage from './pages/InfoPage';
import UniGuide from './pages/UniGuide';

const Navigation = () => {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  if (isAuthPage) return null;

  return (
    <nav className="border-b border-gray-800/80 px-6 py-3 flex items-center justify-between w-full" style={{ background: 'rgba(15,15,20,0.95)', backdropFilter: 'blur(12px)' }}>
      <div className="flex items-center space-x-2">
        <span className="text-xl font-extrabold tracking-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
          <span className="text-white">Uni</span><span style={{ color: '#FF6B57' }}>Heart</span><span className="ml-1">❤️</span>
        </span>
      </div>

      <div className="flex items-center space-x-2">
        <Link to="/campus-guide"
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/campus-guide') ? 'bg-emerald-600 text-white' : 'text-emerald-400 hover:bg-gray-700'}`}>
          🗺️ Campus
        </Link>
        {!isAuthenticated ? (
          <>
            <Link to="/login"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/login') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
              Login
            </Link>
            <Link to="/signup"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/signup') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
              Signup
            </Link>
          </>
        ) : (
          <>
            {user?.role === 'student' && (
              <>
                <Link to="/browse"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/browse') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                  🛍️ Browse
                </Link>
                <Link to="/cart"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/cart') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                  🛒 Cart
                </Link>
                <Link to="/orders"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/orders') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                  📦 Orders
                </Link>
              </>
            )}
            {(user?.role === 'student' || user?.role === 'hero') && (
              <>
                <div className="w-px h-6 bg-gray-600 mx-1"></div>
                <Link to="/hero"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/hero') ? 'bg-green-600 text-white' : 'text-green-400 hover:bg-gray-700'}`}>
                  🦸 Hero
                </Link>
              </>
            )}
            {user?.role === 'shopkeeper' && (
              <>
                <Link to="/vendor/dashboard"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/vendor/dashboard') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                  📊 Dashboard
                </Link>
                <Link to="/vendor/products"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/vendor/products') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                  📦 Products
                </Link>
                <Link to="/vendor/orders"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/vendor/orders') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                  🧾 Orders
                </Link>
                <Link to="/vendor/settings"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/vendor/settings') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                  ⚙️ Settings
                </Link>
              </>
            )}
            {user?.role === 'admin' && (
              <>
                <Link to="/admin"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${location.pathname === '/admin' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                  📋 Approvals
                </Link>
                <Link to="/admin/stores"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/admin/stores') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                  🏪 Stores
                </Link>
                <Link to="/admin/orders"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/admin/orders') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                  📦 Orders
                </Link>
                <Link to="/admin/hero-queue"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/admin/hero-queue') ? 'bg-green-600 text-white' : 'text-green-400 hover:bg-gray-700'}`}>
                  🦸 Heroes
                </Link>
                <Link to="/admin/audit-logs"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/admin/audit-logs') ? 'bg-purple-600 text-white' : 'text-purple-400 hover:bg-gray-700'}`}>
                  📋 Audit
                </Link>
                <Link to="/admin/risk"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/admin/risk') ? 'bg-red-700 text-white' : 'text-red-400 hover:bg-gray-700'}`}>
                  🛡️ Risk
                </Link>
                <Link to="/admin/reconciliation"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/admin/reconciliation') ? 'bg-yellow-700 text-white' : 'text-yellow-400 hover:bg-gray-700'}`}>
                  ⚖️ Recon
                </Link>
                <Link to="/admin/campus-config"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/admin/campus-config') ? 'bg-blue-700 text-white' : 'text-blue-300 hover:bg-gray-700'}`}>
                  🏫 Config
                </Link>
              </>
            )}

            <div className="flex items-center ml-4 pl-4 border-l border-gray-600">
              <Link to="/profile" className="flex items-center mr-3 group">
                <div className="flex flex-col text-right mr-3">
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors font-medium">
                    {user?.name}
                  </span>
                  <span className="text-xs text-gray-500 capitalize">
                    {user?.role}
                  </span>
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg group-hover:ring-2 ring-blue-500/50 transition-all">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
              </Link>
            </div>
          </>
        )}
      </div>
    </nav>
  );
};

const HomeRedirect = () => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="bg-gray-800 p-10 rounded-2xl shadow-2xl text-center max-w-lg border border-gray-700">
          <h1 className="text-5xl font-black mb-2" style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: '-1px' }}>
            <span className="text-white">Uni</span><span style={{ color: '#FF6B57' }}>Heart</span>{' '}<span>❤️</span>
          </h1>
          <p className="text-gray-500 text-sm mb-1 font-semibold tracking-widest uppercase">The Pulse of Campus Life</p>
          <p className="text-gray-400 text-base mb-8 leading-relaxed">
            Campus shops, hero deliveries &amp; the Uni Guide — all in one place.
          </p>
          <div className="flex space-x-3 justify-center">
            <Link to="/login" className="px-6 py-3 text-white rounded-xl font-bold transition-all text-sm" style={{ background: 'linear-gradient(135deg, #FF6B57, #FF3B5C)', boxShadow: '0 6px 24px rgba(255,107,87,0.35)' }}>
              Sign In →
            </Link>
            <Link to="/signup" className="px-6 py-3 rounded-xl font-bold transition-all text-sm border" style={{ borderColor: 'rgba(255,107,87,0.3)', color: '#FF6B57', background: 'rgba(255,107,87,0.07)' }}>
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Redirect based on role
  switch (user?.role) {
    case 'student': return <Navigate to="/browse" replace />;
    case 'shopkeeper': return <Navigate to="/vendor/dashboard" replace />;
    case 'admin': return <Navigate to="/admin" replace />;
    case 'hero': return <Navigate to="/hero" replace />;
    default: return <Navigate to="/login" replace />;
  }
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-900 text-white flex flex-col" style={{ fontFamily: "'Poppins', 'Inter', sans-serif" }}>
          <Navigation />
          <main className="flex-1">
            <Routes>
              {/* Public */}
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/campus-guide" element={<UniGuide />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Student Routes */}
              <Route path="/browse" element={
                <ProtectedRoute allowedRoles={['student']}>
                  <ProductCatalog />
                </ProtectedRoute>
              } />
              <Route path="/product/:id" element={
                <ProtectedRoute allowedRoles={['student']}>
                  <ProductDetail />
                </ProtectedRoute>
              } />
              <Route path="/cart" element={
                <ProtectedRoute allowedRoles={['student']}>
                  <CartPage />
                </ProtectedRoute>
              } />
              <Route path="/checkout" element={
                <ProtectedRoute allowedRoles={['student']}>
                  <Checkout />
                </ProtectedRoute>
              } />
              <Route path="/orders" element={
                <ProtectedRoute allowedRoles={['student']}>
                  <OrderHistory />
                </ProtectedRoute>
              } />
              <Route path="/track/:orderId" element={
                <ProtectedRoute allowedRoles={['student']}>
                  <TrackDelivery />
                </ProtectedRoute>
              } />

              {/* Vendor Routes */}
              <Route path="/vendor/dashboard" element={
                <ProtectedRoute allowedRoles={['shopkeeper']}>
                  <VendorDashboard />
                </ProtectedRoute>
              } />
              <Route path="/vendor/products" element={
                <ProtectedRoute allowedRoles={['shopkeeper']}>
                  <VendorProducts />
                </ProtectedRoute>
              } />
              <Route path="/vendor/orders" element={
                <ProtectedRoute allowedRoles={['shopkeeper']}>
                  <VendorOrders />
                </ProtectedRoute>
              } />
              <Route path="/vendor/settings" element={
                <ProtectedRoute allowedRoles={['shopkeeper']}>
                  <StoreSettings />
                </ProtectedRoute>
              } />

              {/* Admin Routes */}
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/stores" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminStores />
                </ProtectedRoute>
              } />
              <Route path="/admin/orders" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminOrders />
                </ProtectedRoute>
              } />
              <Route path="/admin/hero-queue" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminHeroQueue />
                </ProtectedRoute>
              } />
              <Route path="/admin/audit-logs" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminAuditLog />
                </ProtectedRoute>
              } />
              <Route path="/admin/risk" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminRiskDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/reconciliation" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminReconciliation />
                </ProtectedRoute>
              } />
              <Route path="/admin/campus-config" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminCampusConfig />
                </ProtectedRoute>
              } />

              {/* Hero Routes */}
              <Route path="/hero" element={
                <ProtectedRoute allowedRoles={['student', 'hero']}>
                  <HeroDashboard />
                </ProtectedRoute>
              } />
              <Route path="/hero/orders" element={
                <ProtectedRoute allowedRoles={['student', 'hero']}>
                  <HeroOrders />
                </ProtectedRoute>
              } />
              <Route path="/hero/active" element={
                <ProtectedRoute allowedRoles={['student', 'hero']}>
                  <ActiveDelivery />
                </ProtectedRoute>
              } />
              <Route path="/hero/earnings" element={
                <ProtectedRoute allowedRoles={['student', 'hero']}>
                  <HeroEarnings />
                </ProtectedRoute>
              } />


              {/* Profile Route */}
              <Route path="/profile" element={
                <ProtectedRoute allowedRoles={['student', 'hero', 'shopkeeper', 'admin']}>
                  <Profile />
                </ProtectedRoute>
              } />

              {/* Feature Routes */}
              <Route path="/wallet" element={
                <ProtectedRoute allowedRoles={['student', 'hero', 'shopkeeper']}>
                  <Wallet />
                </ProtectedRoute>
              } />
              <Route path="/contact" element={
                <ProtectedRoute allowedRoles={['student', 'hero', 'shopkeeper', 'admin']}>
                  <ContactSupport />
                </ProtectedRoute>
              } />
              <Route path="/terms" element={<InfoPage />} />
              <Route path="/privacy" element={<InfoPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
