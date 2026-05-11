'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Box, 
  User, 
  ShieldCheck, 
  Shield,
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
  Fingerprint,
  Archive,
  Share2,
  Users
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

  const userName = user?.firstName ? `${user.firstName} ${user.lastName || ''}` : localStorage.getItem('user_first_name') || 'User Account';
  const userEmail = user?.email || localStorage.getItem('authenticated_user_email') || 'user@techcore.io';
  const credits = user?.credits || 0;
  const verificationStatus = user?.verificationStatus || (user?.isVerified ? 'verified' : 'unverified');

  const isVerified = verificationStatus === 'verified';
  const isPending = verificationStatus === 'pending';

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', module: 'dashboard' },
    { name: 'Index Docs', icon: FileText, path: '/notarize', module: 'notarize' },
    { name: 'Protocol Vault', icon: Shield, path: '/vault', module: 'notarize' },
    { name: 'Official Registry', icon: Archive, path: '/registry', module: 'registry' },
    { name: 'Verify Doc', icon: ShieldCheck, path: '/verify', module: 'verify' },
    { name: 'Analytics', icon: BarChart3, path: '/analytics', module: 'analytics' },
    { name: 'Share Hub', icon: Share2, path: '/share', module: 'dashboard' },
    { name: 'Settings', icon: Settings, path: '/settings', module: 'settings' },
  ];

  // Members should not see Team Hub or Subscription (Wallet) in main menu or profile
  const filteredMenuItems = menuItems.filter(item => {
    if (item.module === 'dashboard') return true;
    return role === 'admin' || (permissions && permissions.includes(item.module));
  });

  const profileOptions = [
    { name: 'Profile', icon: User, path: '/profile' },
    { name: 'Verification', icon: ShieldCheck, path: '/verification' },
    ...(role === 'admin' ? [
      { name: 'Nodes & Subscription', icon: Box, path: '/subscription' },
      { name: 'Team Hub', icon: Users, path: '/settings/team' }
    ] : []),
  ];

  return (
    <>
      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-6 right-6 z-[60] w-12 h-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center shadow-lg dark:shadow-none"
      >
        {isMobileMenuOpen ? <X className="w-6 h-6 dark:text-zinc-400" /> : <Menu className="w-6 h-6 dark:text-zinc-400" />}
      </button>

      {/* Sidebar Container */}
      <aside className={`
        fixed left-0 top-0 h-full w-72 bg-white dark:bg-zinc-950 border-r border-zinc-100 dark:border-zinc-900 z-50 transition-transform duration-500
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full p-6">
          {/* Brand */}
          <Link href="/dashboard" className="flex items-center gap-6 mb-16 px-1 group/logo transition-all duration-700">
            <div className="relative w-14 h-14 flex items-center justify-center">
              {/* Outer Architectural Shell */}
              <div className="absolute inset-0 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-900 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] transition-all duration-700 group-hover:shadow-[0_20px_50px_-12px_rgba(16,185,129,0.15)] group-hover:-translate-y-1" />
              
              {/* Precision Grid Layer */}
              <div className="absolute inset-2 overflow-hidden rounded-xl opacity-0 group-hover:opacity-10 transition-opacity duration-700">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:6px_6px]" />
              </div>

              {/* The Core Mark: Abstract I+X Synthesis */}
              <div className="relative w-9 h-9">
                {/* Vertical Backbone (I) */}
                <motion.div 
                  className="absolute left-1/2 -translate-x-1/2 top-0 w-2 h-full bg-zinc-950 dark:bg-white rounded-full origin-center transition-all duration-700 group-hover:bg-trust-green"
                  whileHover={{ scaleY: 1.1 }}
                />
                
                {/* Oblique Wings (X) */}
                <div className="absolute inset-0 transition-transform duration-1000 group-hover:rotate-180">
                  <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-[3px] bg-zinc-200 dark:bg-zinc-800 rounded-full rotate-45 origin-center transition-all group-hover:bg-trust-green/30" />
                  <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-[3px] bg-zinc-200 dark:bg-zinc-800 rounded-full -rotate-45 origin-center transition-all group-hover:bg-trust-green/30" />
                </div>

                {/* Central Focus Node */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 bg-white dark:bg-zinc-950 rounded-full border-2 border-trust-green shadow-sm z-10" />
                  <motion.div 
                    animate={{ scale: [1, 2, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute w-4 h-4 bg-trust-green rounded-full blur-sm"
                  />
                </div>
              </div>

              {/* Corner Metadata Accents */}
              <div className="absolute top-2 left-2 w-1 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
              <div className="absolute bottom-2 right-2 w-1 h-1 bg-trust-green rounded-full shadow-[0_0_8px_#10b981]" />
            </div>
            
            <div className="flex flex-col">
              <span className="font-display font-black text-2xl tracking-[-0.05em] text-zinc-950 dark:text-white leading-none uppercase transition-colors group-hover:text-trust-green">
                IDENTIX
              </span>
              <div className="flex items-center gap-2 mt-2 opacity-40 group-hover:opacity-100 transition-all">
                <div className="h-[1px] w-3 bg-trust-green" />
                <span className="font-mono text-[7px] font-black uppercase tracking-[0.5em] text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white">
                  VERIFIED_TRUST
                </span>
              </div>
            </div>
          </Link>

          {/* Nav Section */}
          <div className="flex-1 space-y-8 overflow-y-auto pr-2 -mr-2 scrollbar-none">
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
                          : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-950 dark:hover:text-white'
                      }`}
                    >
                      <item.icon className={`w-4 h-4 transition-colors ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-950 dark:group-hover:text-white'}`} />
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
                          ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-sm' 
                          : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-950 dark:hover:text-white'
                      }`}
                    >
                      <item.icon className={`w-4 h-4 transition-colors ${isActive ? 'text-zinc-950 dark:text-white' : 'text-zinc-400 group-hover:text-zinc-950 dark:group-hover:text-white'}`} />
                      {item.name}
                      {isActive && (
                        <motion.div 
                          layoutId="active-indicator-security"
                          className="ml-auto w-1.5 h-1.5 bg-zinc-950 dark:bg-white rounded-full"
                        />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Footer / User Profile */}
          <div className="pt-6 border-t border-zinc-100 dark:border-zinc-900">
            {loading && !user ? (
              <div className="flex items-center gap-4 p-2 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-zinc-100 dark:bg-zinc-900 rounded w-24" />
                  <div className="h-2 bg-zinc-50 dark:bg-zinc-900 rounded w-32" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 p-2 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all group relative">
                <div className="w-10 h-10 rounded-xl bg-zinc-950 dark:bg-zinc-900 flex items-center justify-center text-trust-green font-display font-black text-xs ring-4 ring-zinc-50 dark:ring-zinc-900">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="font-display font-bold text-sm text-zinc-900 dark:text-white truncate">{userName}</p>
                    {isVerified && <ShieldCheck className="w-3 h-3 text-trust-green fill-trust-green/10 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                     <p className="font-sans text-[10px] text-zinc-400 truncate">{userEmail}</p>
                     {role === 'admin' && (
                       <span className="px-1.5 py-0.5 bg-zinc-950 dark:bg-zinc-800 text-trust-green font-mono text-[7px] font-black uppercase tracking-tighter rounded-md border border-zinc-800 dark:border-zinc-700">Admin</span>
                     )}
                  </div>
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
            )}
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
