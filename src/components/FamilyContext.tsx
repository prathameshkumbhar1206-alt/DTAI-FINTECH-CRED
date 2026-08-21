'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type FamilyId = string | null;

interface FamilyContextType {
  activeFamilyId: FamilyId;
  setActiveFamilyId: (id: FamilyId) => void;
  householdData: any;
  setHouseholdData: (data: any) => void;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const [activeFamilyId, setActiveFamilyId] = useState<FamilyId>(null);
  const [householdData, setHouseholdData] = useState<any>(null);
  
  // Try to load from localStorage on mount (client-side only)
  useEffect(() => {
    const saved = localStorage.getItem('cred_legacy_family');
    if (saved) {
      setActiveFamilyId(saved as FamilyId);
    }
  }, []);

  const handleSetFamily = useCallback((id: FamilyId) => {
    setActiveFamilyId(id);
    if (id) {
      localStorage.setItem('cred_legacy_family', id);
    } else {
      localStorage.removeItem('cred_legacy_family');
      setHouseholdData(null);
    }
  }, []);

  return (
    <FamilyContext.Provider value={{ activeFamilyId, setActiveFamilyId: handleSetFamily, householdData, setHouseholdData }}>
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamily() {
  const context = useContext(FamilyContext);
  if (context === undefined) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  return context;
}
