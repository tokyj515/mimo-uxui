// components/Button.tsx
"use client";

import React from "react";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "solid" | "outline";
};

export const Button: React.FC<ButtonProps> = ({
                                                  variant = "solid",
                                                  className = "",
                                                  ...props
                                              }) => {
    const base =
        "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-1";

    const style =
        variant === "outline"
            ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            : "bg-teal-600 text-white hover:bg-teal-700";

    return <button {...props} className={`${base} ${style} ${className}`} />;
};
