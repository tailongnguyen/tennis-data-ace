import React, { useEffect } from "react";
import { Dialog as RadixDialog } from "@radix-ui/react-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";

interface SafeDialogProps extends React.ComponentProps<typeof Dialog> {
  cleanupDelay?: number;
}

/**
 * A wrapper around the Dialog component that ensures proper cleanup on mobile devices.
 * This helps prevent focus and scroll issues when using dialogs and navigating between pages.
 */
export function SafeDialog({ 
  children, 
  open, 
  onOpenChange, 
  cleanupDelay = 100,
  ...props 
}: SafeDialogProps) {
  const isMobile = useIsMobile();
  
  // On mobile, ensure scroll lock and focus trap are properly cleaned up
  useEffect(() => {
    if (!isMobile) return;
    
    // If dialog is closing, ensure any lingering event listeners are removed
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
  }, [open, isMobile, cleanupDelay]);
  
  // Use a custom onOpenChange handler to add a slight delay for cleanup on mobile
  const handleOpenChange = (newOpen: boolean) => {
    if (isMobile && !newOpen) {
      // Add a slight delay before invoking the original onOpenChange
      // This gives the UI time to clean up any focus or scroll traps
      setTimeout(() => onOpenChange?.(newOpen), 10);
    } else {
      onOpenChange?.(newOpen);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange} {...props}>
      {children}
    </Dialog>
  );
}

// Re-export dialog components for convenience
export {
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  DialogClose,
};
