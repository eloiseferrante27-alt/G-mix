'use client';

import * as React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', children, placeholder, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`w-full px-3 py-2 border border-slate-300 rounded-lg text-sm 
          focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
          bg-white
          ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled selected>
            {placeholder}
          </option>
        )}
        {children}
      </select>
    );
  }
);

Select.displayName = 'Select';

interface SelectItemProps extends React.OptionHTMLAttributes<HTMLOptionElement> {}

export const SelectItem = React.forwardRef<HTMLOptionElement, SelectItemProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <option
        ref={ref}
        className={`px-2 py-1 ${className}`}
        {...props}
      >
        {children}
      </option>
    );
  }
);

SelectItem.displayName = 'SelectItem';

// Composants pour compatibilité avec l'ancienne API
export const SelectTrigger = Select;
export const SelectValue = React.Fragment;
export const SelectContent = React.Fragment;
