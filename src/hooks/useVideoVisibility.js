import { useEffect, useRef } from 'react';

export const useVideoVisibility = (options = {}) => {
  const videoRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observerOptions = {
      threshold: 0.5, // 50% of the video must be visible
      rootMargin: '0px',
      ...options
    };

    const handleIntersection = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Video is visible - play it
          video.play().catch(err => {
            // Handle autoplay policy errors silently
            console.debug('Autoplay prevented:', err);
          });
        } else {
          // Video is not visible - pause it
          video.pause();
        }
      });
    };

    observerRef.current = new IntersectionObserver(handleIntersection, observerOptions);
    observerRef.current.observe(video);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [options]);

  return videoRef;
};
