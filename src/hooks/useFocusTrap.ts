import { useEffect, useRef } from 'react';

/**
 * useFocusTrap - Trap focus within a modal/dialog
 *
 * Per Vercel React Best Practices and WCAG 2.1
 *
 * Features:
 * - Tab cycles forward through focusable elements
 * - Shift+Tab cycles backward
 * - Focus stays trapped within container
 * - Returns to first element after last
 * - Returns to last element before first (Shift+Tab)
 *
 * @param isActive - Whether the trap is active (modal is open)
 * @returns Ref to attach to the modal container
 */
export const useFocusTrap = (isActive: boolean) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<
      HTMLElement | SVGElement
    >(
      'a[href], button:not([disabled]), textarea:not([disabled]),' +
      'input:not([disabled]), select:not([disabled]),' +
      '[tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element when trap activates
    firstElement?.focus();

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      // If Shift+Tab on first element, move to last
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
      // If Tab on last element, move to first
      else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleTabKey);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleTabKey);
    };
  }, [isActive]);

  return containerRef;
};

/**
 * useFocusRestore - Restore focus to trigger button when modal closes
 *
 * @param isOpen - Whether the modal is open
 */
export const useFocusRestore = (isOpen: boolean) => {
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element (the trigger button)
      triggerRef.current = document.activeElement as HTMLElement;
    } else if (triggerRef.current) {
      // Restore focus when modal closes
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [isOpen]);

  return triggerRef;
};
