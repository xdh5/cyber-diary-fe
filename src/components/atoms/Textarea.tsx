type TextareaProps = {
  placeholder?: string;
};

const Textarea = ({ placeholder }: TextareaProps) => {
  return (
    <textarea
      className="min-h-56 w-full rounded-3xl border border-slate-200 bg-slate-50 p-5 text-base leading-7 text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
      placeholder={placeholder}
    />
  );
};

export default Textarea;
