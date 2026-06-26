import "@web-renderer/chip/panel/Surface.Panel.css";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@web-renderer/lib/utils";



type DialogContentSurface = "default" | "plain";
type DialogContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  accessibleTitle?: string;
  accessibleDescription?: string;
  overlayClassName?: string;
  contentWrapperClassName?: string;
  surface?: DialogContentSurface;
};



const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DIALOG_CONTENT_POSITION_CLASS = "fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%]";
const DIALOG_CONTENT_SURFACE_CLASS = "surface-panel grid w-full gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg";



const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, accessibleTitle, accessibleDescription, overlayClassName, contentWrapperClassName, surface = "default", ...props }, ref) => {
  const titleId = React.useId();
  const descriptionId = React.useId();
  const { "aria-labelledby": ariaLabelledBy, "aria-describedby": ariaDescribedBy, ...contentProps } = props;

  return (
    <DialogPortal>
      <DialogOverlay className={overlayClassName} />
      <div className={cn(DIALOG_CONTENT_POSITION_CLASS, contentWrapperClassName)}>
        <DialogPrimitive.Content
          ref={ref}
          className={cn(surface === "default" ? DIALOG_CONTENT_SURFACE_CLASS : null, className)}
          aria-labelledby={accessibleTitle ? titleId : ariaLabelledBy}
          aria-describedby={accessibleDescription ? descriptionId : ariaDescribedBy}
          {...contentProps}
        >
          {accessibleTitle ? (
            <DialogPrimitive.Title id={titleId} className="sr-only">{accessibleTitle}</DialogPrimitive.Title>
          ) : null}
          {accessibleDescription ? (
            <DialogPrimitive.Description id={descriptionId} className="sr-only">{accessibleDescription}</DialogPrimitive.Description>
          ) : null}
          {children}
        </DialogPrimitive.Content>
      </div>
    </DialogPortal>
  );
});
const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className,
    )}
    {...props}
  />
);
const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className,
    )}
    {...props}
  />
);
const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className,
    )}
    {...props}
  />
));
const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));



DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;
DialogContent.displayName = DialogPrimitive.Content.displayName;
DialogHeader.displayName = "DialogHeader";
DialogFooter.displayName = "DialogFooter";
DialogTitle.displayName = DialogPrimitive.Title.displayName;
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export { Dialog, DialogPortal, DialogOverlay, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription };
