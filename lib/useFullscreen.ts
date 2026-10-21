'use client';

import { useState, useCallback, useEffect } from 'react';

export function useFullscreen(elementRef?: React.RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  const enterFullscreen = useCallback(async () => {
    try {
      const el = elementRef?.current || document.documentElement;
      await el.requestFullscreen();
    } catch (e) {
      // Fallback: browser mungkin tidak support atau ada error
      console.warn('Fullscreen request failed:', e);
    }
  }, [elementRef]);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.warn('Exit fullscreen failed:', e);
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (isFullscreen) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  return { isFullscreen, enterFullscreen, exitFullscreen, toggleFullscreen };
}
