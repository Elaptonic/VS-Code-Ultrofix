import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface AppContextType {
  savedServices: string[];
  toggleSavedService: (serviceId: string) => void;
  selectedAddress: string;
  setSelectedAddress: (address: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [savedServices, setSavedServices] = useState<string[]>([]);
  const [selectedAddress, setSelectedAddressState] = useState<string>(
    "123 MG Road, Bangalore 560001"
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [savedData, addrData] = await Promise.all([
        AsyncStorage.getItem("savedServices"),
        AsyncStorage.getItem("selectedAddress"),
      ]);
      if (savedData) setSavedServices(JSON.parse(savedData));
      if (addrData) setSelectedAddressState(addrData);
    } catch {
      // ignore
    }
  };

  const toggleSavedService = useCallback(
    async (serviceId: string) => {
      const newSaved = savedServices.includes(serviceId)
        ? savedServices.filter((id) => id !== serviceId)
        : [...savedServices, serviceId];
      setSavedServices(newSaved);
      await AsyncStorage.setItem("savedServices", JSON.stringify(newSaved));
    },
    [savedServices]
  );

  const setSelectedAddress = useCallback(async (address: string) => {
    setSelectedAddressState(address);
    await AsyncStorage.setItem("selectedAddress", address);
  }, []);

  return (
    <AppContext.Provider
      value={{
        savedServices,
        toggleSavedService,
        selectedAddress,
        setSelectedAddress,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
