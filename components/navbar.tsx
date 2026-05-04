'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Box, 
  User, 
  ShieldCheck, 
  CreditCard, 
  LogOut, 
  LayoutDashboard, 
  BarChart3, 
  Settings,
  ChevronDown,
  Bell,
  Hexagon,
  Menu,
  X,
  FileText,
  Archive
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SecurityService } from '@/lib/security-service';
import { useUser } from '@/hooks/use-user';

export function Sidebar() {
  const { user, loading, role, permissions } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const userName = user?.firstName || 'User Account';
  const userEmail = user?.email || 'user@techcore.io';
  const credits = user?.credits || 0;
  const verificationStatus = user?.verificationStatus;

  const isVerified = verificationStatus === 'verified';
  const isPending = verificationStatus === 'pending';

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', module: 'dashboard' },
    { name: 'Index Docs', icon: FileText, path: '/notarize', module: 'notarize' },
    { name: 'Official Registry', icon: Archive, path: '/registry', module: 'registry' },
    { name: 'Verify Doc', icon: ShieldCheck, path: '/verify', module: 'verify' },
    { name: 'Analytics', icon: BarChart3, path: '/analytics', module: 'analytics' },
    { name: 'Settings', icon: Settings, path: '/settings', module: 'settings' },
  ];

  // Logic: Admin has all access. Members only mapped modules.
  const filteredMenuItems = menuItems.filter(item => 
    role === 'admin' || (permissions && permissions.includes(item.module))
  );

  const profileOptions = [
    { name: 'Profile', icon: User, path: '/profile' },
    { name: 'Verification', icon: ShieldCheck, path: '/verification' },
    { name: 'Wallet & Credits', icon: CreditCard, path: '/subscription' },
    // Team Management only for admins
    ...(role === 'admin' ? [{ name: 'Team Hub', icon: User, path: '/settings/team' }] : []),
  ];

  return (
    <>
      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-6 right-6 z-[60] w-12 h-12 bg-white border border-zinc-200 rounded-xl flex items-center justify-center shadow-lg"
      >
        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar Container */}
      <aside className={`
        fixed left-0 top-0 h-full w-72 bg-white border-r border-zinc-100 z-50 transition-transform duration-500
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full p-6">
          {/* Brand */}
          <Link href="/dashboard" className="flex items-center gap-3 mb-12 px-2">
            <div className="relative">
              <Hexagon className="w-10 h-10 text-trust-green fill-trust-green/5" />
              <Box className="absolute inset-0 m-auto w-5 h-5 text-zinc-950" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-black text-xl tracking-tighter text-zinc-950 leading-none">TECHCORE</span>
              <span className="font-mono text-[9px] text-trust-green font-bold uppercase tracking-widest mt-1">Advanced Relay</span>
            </div>
          </Link>

          {/* Nav Section */}
          <div className="flex-1 space-y-8">
            <div className="px-4">
               <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Available Credits</span>
                    <CreditCard className="w-3.5 h-3.5 text-trust-green" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display font-black text-2xl text-zinc-950">{credits.toLocaleString()}</span>
                    <span className="font-mono text-[10px] text-zinc-400 font-bold">Units</span>
                  </div>
                  <Link 
                    href="/subscription"
                    className="mt-3 w-full h-8 flex items-center justify-center bg-white border border-zinc-200 rounded-xl font-display font-bold text-[10px] uppercase tracking-widest text-zinc-600 hover:bg-zinc-950 hover:text-white transition-all shadow-sm"
                  >
                    Add Credits
                  </Link>
               </div>
            </div>

            <div>
              <p className="font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-widest px-4 mb-4">Main Interface</p>
              <nav className="space-y-1">
                {filteredMenuItems.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <Link 
                      key={item.path} 
                      href={item.path}
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-display font-bold text-sm transition-all group ${
                        isActive 
                          ? 'bg-trust-green text-white shadow-lg shadow-trust-green/20' 
                          : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-950'
                      }`}
                    >
                      <item.icon className={`w-4 h-4 transition-colors ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-950'}`} />
                      {item.name}
                      {isActive && (
                        <motion.div 
                          layoutId="active-indicator"
                          className="ml-auto w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                        />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div>
              <p className="font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-widest px-4 mb-4">Security Hub</p>
              <nav className="space-y-1">
                {profileOptions.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <Link 
                      key={item.path} 
                      href={item.path}
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-display font-bold text-sm transition-all group ${
                        isActive 
                          ? 'bg-zinc-100 text-zinc-950 shadow-sm' 
                          : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-950'
                      }`}
                    >
                      <item.icon className={`w-4 h-4 transition-colors ${isActive ? 'text-zinc-950' : 'text-zinc-400 group-hover:text-zinc-950'}`} />
                      {item.name}
                      {isActive && (
                        <motion.div 
                          layoutId="active-indicator-security"
                          className="ml-auto w-1.5 h-1.5 bg-zinc-950 rounded-full"
                        />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Footer / User Profile */}
          <div className="pt-6 border-t border-zinc-100">
            <div className="flex items-center gap-4 p-2 rounded-2xl hover:bg-zinc-50 transition-all group relative">
              <div className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center text-trust-green font-display font-black text-xs ring-4 ring-zinc-50">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="font-display font-bold text-sm text-zinc-900 truncate">{userName}</p>
                  {isVerified && <ShieldCheck className="w-3 h-3 text-trust-green fill-trust-green/10 shrink-0" />}
                </div>
                <p className="font-sans text-[10px] text-zinc-400 truncate">{userEmail}</p>
                {isVerified ? (
                  <p className="font-mono text-[8px] text-trust-green font-bold uppercase tracking-widest mt-0.5">Identity Verified</p>
                ) : isPending ? (
                  <p className="font-mono text-[8px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Under Review</p>
                ) : (
                  <p className="font-mono text-[8px] text-amber-500 font-bold uppercase tracking-widest mt-0.5">Unverified Phase</p>
                )}
              </div>
              <button 
                onClick={handleLogout}
                className="w-8 h-8 flex items-center justify-center text-zinc-300 hover:text-red-500 transition-colors"
                title="Logout Session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-zinc-950/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>
    </>
  );
}

// Keep a wrapper for compatibility if needed elsewhere
export function Navbar() {
  return <Sidebar />;
}
