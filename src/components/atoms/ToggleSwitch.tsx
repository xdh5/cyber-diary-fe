type ToggleSwitchProps = {
  onToggle: () => void;
};

const ToggleSwitch = ({ onToggle }: ToggleSwitchProps) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="relative inline-flex h-7 w-12 items-center rounded-full bg-slate-200 p-1 transition hover:bg-slate-300"
      aria-label="AI 优化 开关"
    >
      <span className="h-5 w-5 rounded-full bg-white shadow transition-transform duration-200" />
    </button>
  );
};

export default ToggleSwitch;
