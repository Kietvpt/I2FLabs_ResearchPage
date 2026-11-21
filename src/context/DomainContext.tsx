import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  createResearchDomain,
  deleteResearchDomain,
  fetchResearchDomains,
  updateResearchDomain,
} from '@/features/domains/api';
import type { DomainInput, ResearchDomain, ResearchDomainWithRelations } from '@/types/database';

interface DomainContextValue {
  domains: ResearchDomainWithRelations[];
  myDomains: ResearchDomainWithRelations[];
  selectedDomainId: string | 'all';
  selectedDomain: ResearchDomainWithRelations | null;
  setSelectedDomainId: (id: string | 'all') => void;
  isLoading: boolean;
  refreshDomains: () => Promise<void>;
  createDomain: (input: DomainInput) => Promise<ResearchDomain>;
  updateDomain: (id: string, updates: Partial<DomainInput>) => Promise<ResearchDomain>;
  deleteDomain: (id: string) => Promise<void>;
  canManageDomain: (domain: ResearchDomain) => boolean;
  isMyDomain: (domain: ResearchDomain) => boolean;
}

const DomainContext = createContext<DomainContextValue | undefined>(undefined);

const SELECTED_DOMAIN_STORAGE_KEY = 'i2flabs_selected_research_domain';

export function DomainProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  const [domains, setDomains] = useState<ResearchDomainWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDomainId, setSelectedDomainIdState] = useState<string | 'all'>(() => {
    try {
      return localStorage.getItem(SELECTED_DOMAIN_STORAGE_KEY) || 'all';
    } catch {
      return 'all';
    }
  });

  const setSelectedDomainId = useCallback((id: string | 'all') => {
    setSelectedDomainIdState(id);
    try {
      localStorage.setItem(SELECTED_DOMAIN_STORAGE_KEY, id);
    } catch {
      // ignore
    }
  }, []);

  const refreshDomains = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchResearchDomains();
      setDomains(data);
    } catch (err) {
      console.error('[DomainContext] Lỗi khi tải domains:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshDomains();
  }, [refreshDomains]);

  const isMyDomain = useCallback(
    (domain: ResearchDomain): boolean => {
      if (!user) return false;
      return domain.created_by === user.id;
    },
    [user]
  );

  const canManageDomain = useCallback(
    (domain: ResearchDomain): boolean => {
      if (isAdmin) return true;
      if (!user) return false;
      return domain.created_by === user.id;
    },
    [user, isAdmin]
  );

  const myDomains = useMemo(() => {
    if (!user) return [];
    return domains.filter((d) => isMyDomain(d));
  }, [domains, user, isMyDomain]);

  const selectedDomain = useMemo(() => {
    if (selectedDomainId === 'all') return null;
    return domains.find((d) => d.id === selectedDomainId || d.slug === selectedDomainId) ?? null;
  }, [domains, selectedDomainId]);

  const handleCreateDomain = async (input: DomainInput): Promise<ResearchDomain> => {
    const created = await createResearchDomain(input, user?.id);
    await refreshDomains();
    setSelectedDomainId(created.id);
    return created;
  };

  const handleUpdateDomain = async (
    id: string,
    updates: Partial<DomainInput>
  ): Promise<ResearchDomain> => {
    const updated = await updateResearchDomain(id, updates);
    await refreshDomains();
    return updated;
  };

  const handleDeleteDomain = async (id: string): Promise<void> => {
    await deleteResearchDomain(id);
    if (selectedDomainId === id) {
      setSelectedDomainId('all');
    }
    await refreshDomains();
  };

  return (
    <DomainContext.Provider
      value={{
        domains,
        myDomains,
        selectedDomainId,
        selectedDomain,
        setSelectedDomainId,
        isLoading,
        refreshDomains,
        createDomain: handleCreateDomain,
        updateDomain: handleUpdateDomain,
        deleteDomain: handleDeleteDomain,
        canManageDomain,
        isMyDomain,
      }}
    >
      {children}
    </DomainContext.Provider>
  );
}

export function useDomains(): DomainContextValue {
  const context = useContext(DomainContext);
  if (!context) {
    throw new Error('useDomains phải được sử dụng bên trong DomainProvider.');
  }
  return context;
}
