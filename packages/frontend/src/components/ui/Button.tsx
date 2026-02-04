import { forwardRef, type ButtonHTMLAttributes } from "react";
import { clsx } from "clsx";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={clsx(
          "inline-flex items-center justify-center font-medium rounded-lg transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          // Variants
          variant === "primary" && [
            "bg-blue-600 text-white hover:bg-blue-500",
            "focus:ring-blue-500",
          ],
          variant === "secondary" && [
            "bg-zinc-700 text-zinc-100 hover:bg-zinc-600",
            "focus:ring-zinc-500",
          ],
          variant === "ghost" && [
            "bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100",
            "focus:ring-zinc-500",
          ],
          variant === "danger" && [
            "bg-red-600 text-white hover:bg-red-500",
            "focus:ring-red-500",
          ],
          // Sizes
          size === "sm" && "px-2.5 py-1.5 text-xs",
          size === "md" && "px-4 py-2 text-sm",
          size === "lg" && "px-6 py-3 text-base",
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
