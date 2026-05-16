import React from 'react';

type BaseTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const BaseTextarea: React.FC<BaseTextareaProps> = ({
  className = '',
  placeholder,
  ...rest
}) => {
  return (
    <textarea
      placeholder={placeholder}
      className={`min-h-56 w-full rounded-lg border border-slate-200 bg-slate-50 p-5 text-base leading-7 text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-100 ${className}`}
      {...rest}
    />
  );
};

export default BaseTextarea;
