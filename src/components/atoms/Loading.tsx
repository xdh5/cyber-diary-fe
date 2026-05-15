interface LoadingProps {
  text?: string;
}

const Loading = ({ text = '加载中...' }: LoadingProps) => {
  return (
    <div className="py-20 text-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-primary)] border-t-transparent mb-4"></div>
      <p className="text-sm text-slate-400">{text}</p>
    </div>
  );
};

export default Loading;