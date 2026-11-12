import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 
    | "default" 
    | "secondary" 
    | "destructive" 
    | "destructive-light" 
    | "success" 
    | "warning" 
    | "outline" 
    | "info";
  size?: "sm" | "md" | "default";
}

const variantStyles: Record<string, string> = {
  default: "bg-indigo-600 text-white border-transparent",
  secondary: "bg-slate-100 text-slate-800 border-slate-200",
  destructive: "bg-rose-600 text-white border-transparent",
  "destructive-light": "bg-rose-50 text-rose-700 border-rose-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
  outline: "text-slate-700 border-slate-200 bg-transparent",
};

const sizeStyles: Record<string, string> = {
  sm: "px-2 py-0.5 text-[11px] font-semibold",
  md: "px-2.5 py-1 text-xs font-semibold",
  default: "px-2.5 py-0.5 text-xs font-semibold",
};

export function Badge({
  className = "",
  variant = "default",
  size = "default",
  ...props
}: BadgeProps) {
  const vStyle = variantStyles[variant] || variantStyles.default;
  const sStyle = sizeStyles[size] || sizeStyles.default;

  return (
    <div
      className={`inline-flex items-center rounded-full border transition-colors select-none ${vStyle} ${sStyle} ${className}`}
      {...props}
    />
  );
}

export default Badge;

