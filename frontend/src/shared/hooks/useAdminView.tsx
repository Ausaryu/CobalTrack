import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";

const ADMIN_VIEW_STORAGE_KEY = "cobaltrack.adminView";

interface AdminViewContextValue {
  isAdminView: boolean;
  setIsAdminView: (enabled: boolean) => void;
}

const AdminViewContext = createContext<AdminViewContextValue | null>(null);

function getStoredAdminView() {
  try {
    return window.localStorage.getItem(ADMIN_VIEW_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

interface AdminViewProviderProps extends PropsWithChildren {
  canEnable: boolean;
}

export function AdminViewProvider({ children, canEnable }: AdminViewProviderProps) {
  const [requestedAdminView, setRequestedAdminView] = useState(getStoredAdminView);
  const isAdminView = canEnable && requestedAdminView;

  function setIsAdminView(enabled: boolean) {
    setRequestedAdminView(canEnable && enabled);
  }

  useEffect(() => {
    try {
      window.localStorage.setItem(ADMIN_VIEW_STORAGE_KEY, String(isAdminView));
    } catch {
      // The in-memory setting still works when storage is unavailable.
    }
  }, [isAdminView]);

  return (
    <AdminViewContext.Provider value={{ isAdminView, setIsAdminView }}>
      {children}
    </AdminViewContext.Provider>
  );
}

export function useAdminView() {
  const context = useContext(AdminViewContext);

  if (!context) {
    throw new Error("useAdminView must be used within an AdminViewProvider");
  }

  return context;
}
