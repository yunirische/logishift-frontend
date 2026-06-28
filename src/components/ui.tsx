import React from 'react';

export const Button = React.forwardRef<HTMLButtonElement, any>(
  ({ className, children, isLoading, ...props }, ref) => (
    <button
      ref={ref}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${className} ${props.disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      {...props}
    >
      {isLoading ? 'Загрузка...' : children}
    </button>
  )
);

Button.displayName = "Button";

export const Card = ({ children, className, ...props }: any) => (
  <div
    className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const Input = ({ icon: Icon, ...props }: any) => (
  <div className="relative">
    {Icon && <Icon className="absolute left-3 top-3 h-5 w-5 text-slate-400" />}
    <input
      className={`w-full py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${Icon ? 'pl-10 pr-4' : 'px-4'}`}
      {...props}
    />
  </div>
);
