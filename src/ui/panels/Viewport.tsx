import { useRef, useEffect, type ForwardedRef, forwardRef } from 'react';

interface ViewportProps {
  onMount?: (container: HTMLDivElement) => void;
  onUnmount?: () => void;
}

const Viewport = forwardRef(function Viewport(
  { onMount, onUnmount }: ViewportProps,
  ref: ForwardedRef<HTMLDivElement>,
) {
  const internalRef = useRef<HTMLDivElement>(null);
  const containerRef = (ref as React.RefObject<HTMLDivElement>) ?? internalRef;

  useEffect(() => {
    if (containerRef.current && onMount) {
      onMount(containerRef.current);
    }
    return () => {
      onUnmount?.();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full cursor-crosshair bg-gray-200"
    />
  );
});

export default Viewport;
