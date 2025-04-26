import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import DesktopRankings from './Rankings';
import MobileRankings from './MobileRankings';

/**
 * Wrapper component that conditionally renders either the mobile-optimized
 * or desktop version of the Rankings page based on device type
 */
const RankingsWrapper: React.FC = () => {
  const isMobile = useIsMobile();
  
  // On mobile devices, use the simplified, optimized version
  if (isMobile) {
    return <MobileRankings />;
  }
  
  // On desktop, use the full-featured version
  return <DesktopRankings />;
};

export default RankingsWrapper;
