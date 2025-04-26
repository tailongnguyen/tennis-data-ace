import React, { useEffect } from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";

interface SafeSheetProps extends React.ComponentProps<typeof Sheet> {
  cleanupDelay?: number;
}

/**
 * A wrapper around the Sheet component that ensures proper cleanup on mobile devices.
 * This helps prevent focus and scroll issues when using sheets repeatedly.
 */
export function SafeSheet({ 
  children, 
  open, 
  onOpenChange, 
  cleanupDelay = 150,
  ...props 
}: SafeSheetProps) {
  // On mobile, ensure scroll lock and focus trap are properly cleaned up
  useEffect(() => {
    if (open === false) {
      const cleanup = () => {
        // Force enable scrolling if it was disabled
        if (document.body.style.overflow === 'hidden') {
          document.body.style.overflow = '';
        }
        
        // Force remove any aria-hidden attributes that might have been left on the body
        if (document.body.getAttribute('aria-hidden') === 'true') {
          document.body.removeAttribute('aria-hidden');
        }
      };
      
      // Use a timeout to ensure cleanup happens after animation completes
      const timer = setTimeout(cleanup, cleanupDelay);
      return () => clearTimeout(timer);
    }
  }, [open, cleanupDelay]);
  
  // Use a custom onOpenChange handler to add a slight delay for cleanup
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Add a slight delay before invoking the original onOpenChange
      // This gives the UI time to clean up any focus or scroll traps
      setTimeout(() => onOpenChange?.(newOpen), 10);
    } else {
      onOpenChange?.(newOpen);
    }
  };
  
  return (
    <Sheet open={open} onOpenChange={handleOpenChange} {...props}>
      {children}
    </Sheet>
  );
}

// Re-export sheet components for convenience
export {
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
  SheetClose,
};
