import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: "default" | "outline" | "ghost";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const base =
      "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:opacity-50 disabled:pointer-events-none";
    const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
      default:
        "bg-white text-black hover:bg-white/90 border border-white/0",
      outline:
        "border border-white/20 bg-transparent text-white hover:bg-white/10",
      ghost:
        "bg-transparent text-white hover:bg-white/10 border border-transparent",
    };
    return (
      <Comp ref={ref} className={cn(base, variants[variant], "px-5 py-3", className)} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button };
