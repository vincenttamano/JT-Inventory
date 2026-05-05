import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Home, Package, BarChart3, LogOut, Menu, X,
  ClipboardCheck, Activity, Users, Bell, AlertTriangle, Clock, UserCog
} from 'lucide-react';
import { User } from '../../types';
import { getInventory } from '../../services/inventoryService';
import { clearCurrentUser, getCurrentUser } from '../../services/authService';
import { AlertNotification, buildInventoryAlerts } from '../../utils/alertCalculations';

export function AppLayout() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [alerts, setAlerts] = useState<AlertNotification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      navigate('/');
    } else {
      setUser(currentUser);
    }
  }, [navigate]);

  // Load inventory and compute alerts
  useEffect(() => {
    const compute = () => {
      getInventory()
        .then((inv) => setAlerts(buildInventoryAlerts(inv)))
        .catch((error) => console.error('Failed to load inventory alerts:', error));
    };
    compute();
    // Refresh alerts when another tab changes persisted inventory data.
    const handler = () => compute();
    window.addEventListener('storage', handler);
    // Also poll every 30s in case same-tab updates
    const interval = setInterval(compute, 30_000);
    return () => {
      window.removeEventListener('storage', handler);
      clearInterval(interval);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    clearCurrentUser();
    navigate('/');
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const isAdmin = user?.role === 'admin';

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const badgeCount = alerts.length;

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
      isActive ? 'bg-gold-50 text-gold-600' : 'text-gray-400 hover:text-gold-400 hover:bg-dark-800'
    }`;

  const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
      isActive ? 'bg-gold-50 text-gold-600' : 'text-gray-400 hover:text-gold-400 hover:bg-dark-800'
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-dark-900 shadow-md border-b border-dark-800 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Brand */}
            <div className="flex items-center space-x-3">
              <img src={`${import.meta.env.BASE_URL}logo.png`} alt="JT Dental Clinic" className="w-8 h-8 rounded-full" />
              <div className="flex flex-col">
                <span className="text-xl font-bold text-gray-100">JT Alunan Dental</span>
                {user && (
                  <span className="text-xs text-gray-400">
                    {user.role === 'admin' ? 'Admin' : 'Staff'} — {user.name}
                  </span>
                )}
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              <NavLink to="/dashboard" end className={navLinkClass}>
                <Home className="w-5 h-5" />
                <span>{isAdmin ? 'Home' : 'Dashboard'}</span>
              </NavLink>

              <NavLink to="/dashboard/inventory" className={navLinkClass}>
                <Package className="w-5 h-5" />
                <span>Inventory</span>
              </NavLink>

              <NavLink to="/dashboard/usage" className={navLinkClass}>
                <ClipboardCheck className="w-5 h-5" />
                <span>Usage</span>
              </NavLink>

              {isAdmin && (
                <NavLink to="/dashboard/analytics" className={navLinkClass}>
                  <BarChart3 className="w-5 h-5" />
                  <span>Analytics</span>
                </NavLink>
              )}

              {isAdmin && (
                <NavLink to="/dashboard/patient-management" className={navLinkClass}>
                  <Users className="w-5 h-5" />
                  <span>Patients</span>
                </NavLink>
              )}

              {isAdmin && (
                <NavLink to="/dashboard/users" className={navLinkClass}>
                  <UserCog className="w-5 h-5" />
                  <span>Staff</span>
                </NavLink>
              )}

              {/* Notification Bell */}
              <div className="relative" ref={notifRef}>
                <button
                  id="notification-bell"
                  onClick={() => setNotifOpen((o) => !o)}
                  className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition ${
                    notifOpen ? 'bg-orange-50 text-orange-600' : 'text-gray-400 hover:text-gold-400 hover:bg-dark-800'
                  }`}
                  aria-label={`Notifications (${badgeCount})`}
                >
                  <Bell className="w-5 h-5" />
                  {badgeCount > 0 && (
                    <span
                      className={`absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white rounded-full px-1 ${
                        criticalCount > 0 ? 'bg-red-500' : 'bg-orange-400'
                      }`}
                    >
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </button>

                {/* Dropdown panel */}
                {notifOpen && (
                  <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-dark-800 text-white z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                      <span className="text-sm font-semibold text-black flex items-center gap-2">
                        <Bell className="w-4 h-4 text-orange-500" />
                        Alerts
                        {badgeCount > 0 && (
                          <span className="bg-orange-100 text-orange-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                            {badgeCount}
                          </span>
                        )}
                      </span>
                      <button
                        onClick={() => setNotifOpen(false)}
                        className="text-gray-400 hover:text-gray-600 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                      {alerts.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">All good — no alerts right now!</p>
                        </div>
                      ) : (
                        alerts.map((alert) => (
                          <div
                            key={alert.id}
                            className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition ${
                              alert.severity === 'critical' ? 'bg-red-50/40' : ''
                            }`}
                          >
                            <div
                              className={`mt-0.5 flex-shrink-0 p-1 rounded-full ${
                                alert.type === 'low_stock'
                                  ? alert.severity === 'critical'
                                    ? 'bg-red-100 text-red-600'
                                    : 'bg-orange-100 text-orange-500'
                                  : alert.severity === 'critical'
                                  ? 'bg-red-100 text-red-600'
                                  : 'bg-yellow-100 text-yellow-600'
                              }`}
                            >
                              {alert.type === 'low_stock' ? (
                                <AlertTriangle className="w-3.5 h-3.5" />
                              ) : (
                                <Clock className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-black truncate">
                                {alert.productName}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">{alert.message}</p>
                              <span
                                className={`inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                  alert.type === 'low_stock'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}
                              >
                                {alert.type === 'low_stock' ? 'Low Stock' : 'Expiring Soon'}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Footer */}
                    {alerts.length > 0 && (
                      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100">
                        <button
                          onClick={() => { navigate('/dashboard/inventory'); setNotifOpen(false); }}
                          className="w-full text-xs text-gold-600 hover:text-gold-800 font-medium transition text-center"
                        >
                          View Inventory →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-gray-400 hover:text-gold-400 hover:bg-dark-800 rounded-lg transition"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>

            {/* Mobile: Bell + Menu */}
            <div className="md:hidden flex items-center gap-1">
              {/* Mobile notification bell */}
              <button
                onClick={() => { setNotifOpen((o) => !o); setMobileMenuOpen(false); }}
                className="relative p-2 rounded-lg text-gray-400 hover:text-gold-400 hover:bg-dark-800"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {badgeCount > 0 && (
                  <span
                    className={`absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 text-[9px] font-bold text-white rounded-full px-0.5 ${
                      criticalCount > 0 ? 'bg-red-500' : 'bg-orange-400'
                    }`}
                  >
                    {badgeCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setMobileMenuOpen(!mobileMenuOpen); setNotifOpen(false); }}
                className="p-2 rounded-lg text-gray-400 hover:text-gold-400 hover:bg-dark-800"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile notification dropdown */}
        {notifOpen && (
          <div className="md:hidden border-t border-dark-800 bg-dark-900">
            <div className="px-4 py-3 bg-dark-900 border-b border-dark-800 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                <Bell className="w-4 h-4 text-orange-500" />
                Alerts {badgeCount > 0 && `(${badgeCount})`}
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
              {alerts.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">No alerts right now!</div>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3 px-4 py-3">
                    <div
                      className={`mt-0.5 flex-shrink-0 p-1 rounded-full ${
                        alert.type === 'low_stock'
                          ? 'bg-orange-100 text-orange-500'
                          : 'bg-yellow-100 text-yellow-600'
                      }`}
                    >
                      {alert.type === 'low_stock' ? (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-200">{alert.productName}</p>
                      <p className="text-xs text-gray-400">{alert.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            {alerts.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={() => { navigate('/inventory'); setNotifOpen(false); }}
                  className="text-xs text-gold-600 font-medium"
                >
                  View Inventory →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-dark-800 bg-dark-900">
            <div className="px-4 py-3 space-y-1">
              <NavLink to="/dashboard" end onClick={closeMobileMenu} className={mobileNavLinkClass}>
                <Home className="w-5 h-5" />
                <span>{isAdmin ? 'Home' : 'Dashboard'}</span>
              </NavLink>

              <NavLink to="/dashboard/inventory" onClick={closeMobileMenu} className={mobileNavLinkClass}>
                <Package className="w-5 h-5" />
                <span>Inventory</span>
              </NavLink>

              <NavLink to="/dashboard/usage" onClick={closeMobileMenu} className={mobileNavLinkClass}>
                <ClipboardCheck className="w-5 h-5" />
                <span>Usage</span>
              </NavLink>

              {isAdmin && (
                <NavLink to="/dashboard/analytics" onClick={closeMobileMenu} className={mobileNavLinkClass}>
                  <BarChart3 className="w-5 h-5" />
                  <span>Analytics</span>
                </NavLink>
              )}

              {isAdmin && (
                <NavLink to="/dashboard/patient-management" onClick={closeMobileMenu} className={mobileNavLinkClass}>
                  <Users className="w-5 h-5" />
                  <span>Patients</span>
                </NavLink>
              )}

              {isAdmin && (
                <NavLink to="/dashboard/users" onClick={closeMobileMenu} className={mobileNavLinkClass}>
                  <UserCog className="w-5 h-5" />
                  <span>Staff</span>
                </NavLink>
              )}

              <button
                onClick={() => { handleLogout(); closeMobileMenu(); }}
                className="flex items-center space-x-3 px-4 py-3 text-gray-400 hover:text-gold-400 hover:bg-dark-800 rounded-lg transition w-full"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
