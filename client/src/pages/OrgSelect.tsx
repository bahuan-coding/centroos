import { useLocation } from 'wouter';
import { Heart, Sparkles } from 'lucide-react';
import { setOrg, OrgType } from '@/lib/org';

const orgs: { type: OrgType; label: string; icon: typeof Heart; desc: string }[] = [
  { type: 'spiritist_center', label: 'Centro Espírita', icon: Heart, desc: 'Gestão financeira para instituições espíritas' },
  { type: 'fintech', label: 'Fintech', icon: Sparkles, desc: 'SaaS e serviços financeiros' },
];

export default function OrgSelect() {
  const [, setLocation] = useLocation();

  const handleSelect = (type: OrgType) => {
    setOrg(type);
    setLocation('/');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mb-4 animate-scale-in">
        <span className="text-white font-bold text-xl">C</span>
      </div>
      <h1 className="text-fluid-3xl font-bold text-foreground mb-2 animate-fade-in-up">CentrOS</h1>
      <p className="text-muted-foreground text-fluid-base mb-10 animate-fade-in-up stagger-1">Escolha o ambiente para continuar</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-lg">
        {orgs.map((o, i) => (
          <button
            key={o.type}
            onClick={() => handleSelect(o.type)}
            className={`glass glass-hover rounded-3xl p-8 flex flex-col items-center text-center focus:outline-none focus:ring-2 focus:ring-primary/50 animate-fade-in-up stagger-${i + 2}`}
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <o.icon className="w-8 h-8 text-primary" />
            </div>
            <span className="text-lg font-semibold text-foreground">{o.label}</span>
            <span className="text-sm text-muted-foreground mt-1">{o.desc}</span>
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-12 animate-fade-in stagger-5">Você poderá trocar de ambiente a qualquer momento</p>
    </div>
  );
}

