import { useLocation } from 'wouter';
import { Building2, Heart, Sparkles } from 'lucide-react';
import { setOrg, getAvailableOrgs, Organization } from '@/lib/org';
import { clearQueryCache } from '@/main';

function getOrgIcon(type: string) {
  switch (type) {
    case 'spiritist_center':
      return Heart;
    case 'tech_company':
      return Sparkles;
    default:
      return Building2;
  }
}

function getOrgDescription(org: Organization): string {
  if (org.isDemo) {
    return 'Ambiente de demonstração';
  }
  switch (org.type) {
    case 'spiritist_center':
      return 'Gestão financeira para instituições espíritas';
    case 'tech_company':
      return 'Stack financeiro para empresas de tecnologia';
    default:
      return 'Gestão financeira empresarial';
  }
}

export default function OrgSelect() {
  const [, setLocation] = useLocation();
  const organizations = getAvailableOrgs();

  const handleSelect = (org: Organization) => {
    setOrg(org.id);
    clearQueryCache(); // Clear all cached data for clean start
    setLocation('/');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mb-4 animate-scale-in">
        <span className="text-white font-bold text-xl">C</span>
      </div>
      <h1 className="text-fluid-3xl font-bold text-foreground mb-2 animate-fade-in-up">CentrOS</h1>
      <p className="text-muted-foreground text-fluid-base mb-10 animate-fade-in-up stagger-1">
        Selecione a empresa para continuar
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        {organizations.map((org, i) => {
          const Icon = getOrgIcon(org.type);
          return (
            <button
              key={org.id}
              onClick={() => handleSelect(org)}
              className={`glass glass-hover rounded-3xl p-8 flex flex-col items-center text-center focus:outline-none focus:ring-2 focus:ring-primary/50 animate-fade-in-up stagger-${i + 2} ${
                org.isDemo ? 'border-2 border-dashed border-amber-300' : ''
              }`}
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
                org.isDemo ? 'bg-amber-100' : 'bg-primary/10'
              }`}>
                <Icon className={`w-8 h-8 ${org.isDemo ? 'text-amber-600' : 'text-primary'}`} />
              </div>
              <span className="text-lg font-semibold text-foreground">{org.name}</span>
              <span className="text-xs text-muted-foreground mt-1">{org.legalName}</span>
              <span className="text-xs text-muted-foreground">{org.taxId}</span>
              <span className="text-sm text-muted-foreground mt-3">{getOrgDescription(org)}</span>
              {org.isDemo && (
                <span className="mt-2 px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                  Demo
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-12 animate-fade-in stagger-5">
        A empresa selecionada ficará ativa durante toda a sessão
      </p>
    </div>
  );
}
