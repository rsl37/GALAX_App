/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, HandHeart, AlertTriangle, Vote, User, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [focusedIndex, setFocusedIndex] = React.useState<number>(-1);

  const navItems = [
    { 
      path: '/dashboard', 
      icon: Home, 
      label: 'Dashboard',
      ariaLabel: 'Navigate to main dashboard',
      description: 'Access your personalized community dashboard'
    },
    { 
      path: '/help-requests', 
      icon: HandHeart, 
      label: 'Requests',
      ariaLabel: 'Navigate to help requests section',
      description: 'Browse and manage help requests'
    },
    { 
      path: '/crisis', 
      icon: AlertTriangle, 
      label: 'Crisis',
      ariaLabel: 'Navigate to crisis alerts section',
      description: 'View and report emergency situations'
    },
    { 
      path: '/stablecoin', 
      icon: DollarSign, 
      label: 'Coin',
      ariaLabel: 'Navigate to stablecoin section',
      description: 'Manage your digital currency and transactions'
    },
    { 
      path: '/governance', 
      icon: Vote, 
      label: 'Gov',
      ariaLabel: 'Navigate to governance section',
      description: 'Participate in community governance and voting'
    },
    { 
      path: '/profile', 
      icon: User, 
      label: 'Profile',
      ariaLabel: 'Navigate to your profile page',
      description: 'View and edit your user profile'
    },
  ];

  const handleNavigation = (path: string, label: string) => {
    console.log('Navigating to:', path);
    navigate(path);
    
    // Announce navigation to screen readers
    const announcement = `Navigated to ${label} page`;
    const ariaLive = document.createElement('div');
    ariaLive.setAttribute('aria-live', 'polite');
    ariaLive.setAttribute('aria-atomic', 'true');
    ariaLive.className = 'sr-only';
    ariaLive.textContent = announcement;
    document.body.appendChild(ariaLive);
    
    setTimeout(() => {
      document.body.removeChild(ariaLive);
    }, 1000);
  };

  const handleKeyDown = (event: React.KeyboardEvent, index: number, path: string, label: string) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleNavigation(path, label);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        const prevIndex = index > 0 ? index - 1 : navItems.length - 1;
        setFocusedIndex(prevIndex);
        (event.currentTarget.parentElement?.children[prevIndex] as HTMLElement)?.focus();
        break;
      case 'ArrowRight':
        event.preventDefault();
        const nextIndex = index < navItems.length - 1 ? index + 1 : 0;
        setFocusedIndex(nextIndex);
        (event.currentTarget.parentElement?.children[nextIndex] as HTMLElement)?.focus();
        break;
      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        (event.currentTarget.parentElement?.children[0] as HTMLElement)?.focus();
        break;
      case 'End':
        event.preventDefault();
        const lastIndex = navItems.length - 1;
        setFocusedIndex(lastIndex);
        (event.currentTarget.parentElement?.children[lastIndex] as HTMLElement)?.focus();
        break;
    }
  };

  return (
    <motion.nav 
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-purple-200 galax-glass z-50"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex justify-around items-center py-2 px-4" role="tablist">
        {navItems.map(({ path, icon: Icon, label, ariaLabel, description }, index) => {
          const isActive = location.pathname === path;
          const isFocused = focusedIndex === index;
          
          return (
            <Button
              key={path}
              variant="ghost"
              size="sm"
              role="tab"
              tabIndex={isActive ? 0 : -1}
              aria-selected={isActive}
              aria-label={ariaLabel}
              aria-describedby={`nav-desc-${index}`}
              className={`flex flex-col items-center gap-1 h-auto py-2 px-3 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-white ${
                isActive 
                  ? 'text-purple-600 bg-purple-50' 
                  : 'text-gray-600 hover:text-purple-600'
              } ${isFocused ? 'ring-2 ring-purple-300' : ''}`}
              onClick={() => handleNavigation(path, label)}
              onKeyDown={(e) => handleKeyDown(e, index, path, label)}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex(-1)}
            >
              <motion.div
                animate={{ 
                  scale: isActive ? 1.1 : 1,
                  rotate: isActive ? [0, 5, -5, 0] : 0
                }}
                transition={{ duration: 0.3 }}
                aria-hidden="true"
              >
                <Icon className="h-5 w-5" />
              </motion.div>
              <span className="text-xs font-medium">{label}</span>
              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-1 h-1 bg-purple-600 rounded-full"
                  aria-hidden="true"
                />
              )}
              
              {/* Hidden description for screen readers */}
              <span id={`nav-desc-${index}`} className="sr-only">
                {description}
              </span>
            </Button>
          );
        })}
      </div>
      
      {/* Live region for announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" id="nav-announcements"></div>
    </motion.nav>
  );
}
