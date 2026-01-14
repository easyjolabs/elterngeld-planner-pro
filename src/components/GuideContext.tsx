import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface GuideContextType {
  // State
  canGoBack: boolean;
  
  // Actions
  goBack: () => void;
  restart: () => void;
  openChat: (prefill?: string) => void;
  
  // Setters (called by Guide component)
  setCanGoBack: (value: boolean) => void;
  setGoBackHandler: (handler: () => void) => void;
  setRestartHandler: (handler: () => void) => void;
  setOpenChatHandler: (handler: (prefill?: string) => void) => void;
}

const GuideContext = createContext<GuideContextType | null>(null);

export const GuideProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [canGoBack, setCanGoBack] = useState(false);
  const [goBackHandler, setGoBackHandler] = useState<() => void>(() => () => {});
  const [restartHandler, setRestartHandler] = useState<() => void>(() => () => {});
  const [openChatHandler, setOpenChatHandler] = useState<(prefill?: string) => void>(() => () => {});

  const goBack = useCallback(() => {
    goBackHandler();
  }, [goBackHandler]);

  const restart = useCallback(() => {
    restartHandler();
  }, [restartHandler]);

  const openChat = useCallback((prefill?: string) => {
    openChatHandler(prefill);
  }, [openChatHandler]);

  // Wrapper functions to properly set function state
  const setGoBackHandlerWrapper = useCallback((handler: () => void) => {
    setGoBackHandler(() => handler);
  }, []);

  const setRestartHandlerWrapper = useCallback((handler: () => void) => {
    setRestartHandler(() => handler);
  }, []);

  const setOpenChatHandlerWrapper = useCallback((handler: (prefill?: string) => void) => {
    setOpenChatHandler(() => handler);
  }, []);

  return (
    <GuideContext.Provider
      value={{
        canGoBack,
        goBack,
        restart,
        openChat,
        setCanGoBack,
        setGoBackHandler: setGoBackHandlerWrapper,
        setRestartHandler: setRestartHandlerWrapper,
        setOpenChatHandler: setOpenChatHandlerWrapper,
      }}
    >
      {children}
    </GuideContext.Provider>
  );
};

export const useGuide = () => {
  const context = useContext(GuideContext);
  if (!context) {
    // Return dummy functions when not in guide context
    return {
      canGoBack: false,
      goBack: () => {},
      restart: () => {},
      openChat: () => {},
      setCanGoBack: () => {},
      setGoBackHandler: () => {},
      setRestartHandler: () => {},
      setOpenChatHandler: () => {},
    };
  }
  return context;
};

export default GuideContext;
