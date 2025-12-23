import { useState } from 'react';
import { useLocation } from 'wouter';
import { Building2, Check, ChevronDown, Heart, Sparkles } from 'lucide-react';
import { getOrg, setOrg, getAvailableOrgs, Organization } from '@/lib/org';
import { clearQueryCache } from '@/main';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

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

export function OrgSwitcher() {
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const currentOrg = getOrg();
  const organizations = getAvailableOrgs();

  const handleSwitch = (org: Organization) => {
    if (org.id === currentOrg?.id) {
      setIsOpen(false);
      return;
    }
    
    setOrg(org.id);
    clearQueryCache(); // Clear all cached data to prevent data leak
    setIsOpen(false);
    
    // Force reload to ensure clean state
    window.location.reload();
  };

  const handleGoToSelect = () => {
    setLocation('/org-select');
  };

  if (!currentOrg) {
    return (
      <Button variant="outline" size="sm" onClick={handleGoToSelect}>
        <Building2 className="h-4 w-4 mr-2" />
        Selecionar Empresa
      </Button>
    );
  }

  const CurrentIcon = getOrgIcon(currentOrg.type);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 max-w-[200px]">
          <CurrentIcon className="h-4 w-4 shrink-0" />
          <span className="truncate">{currentOrg.name}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Trocar Empresa</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => {
          const Icon = getOrgIcon(org.type);
          const isSelected = org.id === currentOrg.id;
          return (
            <DropdownMenuItem
              key={org.id}
              onClick={() => handleSwitch(org)}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-3 w-full">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  org.isDemo ? 'bg-amber-100' : 'bg-primary/10'
                }`}>
                  <Icon className={`h-4 w-4 ${org.isDemo ? 'text-amber-600' : 'text-primary'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{org.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{org.code}</p>
                </div>
                {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                {org.isDemo && !isSelected && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                    Demo
                  </span>
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

