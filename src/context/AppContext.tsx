import React, { createContext, useContext, useState } from 'react';

interface AppContextType {
  addApplianceVisible: boolean;
  openAddAppliance: () => void;
  closeAddAppliance: () => void;
}

const AppContext = createContext<AppContextType>({
  addApplianceVisible: false,
  openAddAppliance: () => {},
  closeAddAppliance: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [addApplianceVisible, setAddApplianceVisible] = useState(false);

  return (
    <AppContext.Provider value={{
      addApplianceVisible,
      openAddAppliance: () => setAddApplianceVisible(true),
      closeAddAppliance: () => setAddApplianceVisible(false),
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);