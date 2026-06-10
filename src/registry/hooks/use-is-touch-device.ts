'use client';

import * as React from 'react';

const useIsTouchDevice = () => {
  const [isTouchDevice, setIsTouchDevice] = React.useState(false);

  React.useEffect(() => {
    function onResize() {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.maxTouchPoints > 0);
    }

    window.addEventListener('resize', onResize);
    onResize();

    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return isTouchDevice;
};

export { useIsTouchDevice };
