import React from 'react';

type BaseInputProps = React.InputHTMLAttributes<HTMLInputElement>;

const BaseInput: React.FC<BaseInputProps> = ({
  className = '',
  placeholder,
  ...rest
}) => {
  return (
    <input
      placeholder={placeholder}
      className={`w-full px-4 py-3.5 bg-white border border-slate-200 rounded-lg ${className}`}
      {...rest}
    />
  );
};

export default BaseInput;