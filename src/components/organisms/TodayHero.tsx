import { ReactNode } from 'react';

type TodayHeroProps = {
  children: ReactNode;
};

const TodayHero = ({ children }: TodayHeroProps) => {
  return (
    <section className="space-y-5 rounded-[2.5rem] bg-gradient-to-br from-slate-100 via-slate-50 to-sky-100 p-6 shadow-soft">
      {children}
    </section>
  );
};

export default TodayHero;
