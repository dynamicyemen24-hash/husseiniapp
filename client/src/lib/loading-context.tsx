import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  ReactNode,
} from "react";

export interface LoadingState {
  /** Global route/app loading */
  global: boolean;
  /** Named loading states for specific operations */
  named: Record<string, boolean>;
  /** Progress for named operations 0-100 */
  progress: Record<string, number>;
  /** Messages for named operations */
  messages: Record<string, string>;
}

type LoadingAction =
  | { type: "START_GLOBAL" }
  | { type: "STOP_GLOBAL" }
  | { type: "START"; key: string; message?: string }
  | { type: "STOP"; key: string }
  | { type: "SET_PROGRESS"; key: string; value: number }
  | { type: "SET_MESSAGE"; key: string; message: string }
  | { type: "CLEAR_ALL" };

const initialState: LoadingState = {
  global: false,
  named: {},
  progress: {},
  messages: {},
};

function loadingReducer(
  state: LoadingState,
  action: LoadingAction
): LoadingState {
  switch (action.type) {
    case "START_GLOBAL":
      return { ...state, global: true };
    case "STOP_GLOBAL":
      return { ...state, global: false };
    case "START":
      return {
        ...state,
        named: { ...state.named, [action.key]: true },
        messages: action.message
          ? { ...state.messages, [action.key]: action.message }
          : state.messages,
      };
    case "STOP": {
      const { [action.key]: _, ...named } = state.named;
      const { [action.key]: _p, ...progress } = state.progress;
      const { [action.key]: _m, ...messages } = state.messages;
      return { ...state, named, progress, messages };
    }
    case "SET_PROGRESS":
      return {
        ...state,
        progress: { ...state.progress, [action.key]: action.value },
      };
    case "SET_MESSAGE":
      return {
        ...state,
        messages: { ...state.messages, [action.key]: action.message },
      };
    case "CLEAR_ALL":
      return initialState;
    default:
      return state;
  }
}

interface LoadingContextValue {
  state: LoadingState;
  startGlobal: () => void;
  stopGlobal: () => void;
  start: (key: string, message?: string) => void;
  stop: (key: string) => void;
  setProgress: (key: string, value: number) => void;
  setMessage: (key: string, message: string) => void;
  isLoading: (key?: string) => boolean;
  getProgress: (key: string) => number;
  getMessage: (key: string) => string | undefined;
}

const LoadingContext = createContext<LoadingContextValue | null>(null);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(loadingReducer, initialState);

  const startGlobal = useCallback(() => dispatch({ type: "START_GLOBAL" }), []);
  const stopGlobal = useCallback(() => dispatch({ type: "STOP_GLOBAL" }), []);
  const start = useCallback(
    (key: string, message?: string) =>
      dispatch({ type: "START", key, message }),
    []
  );
  const stop = useCallback(
    (key: string) => dispatch({ type: "STOP", key }),
    []
  );
  const setProgress = useCallback(
    (key: string, value: number) =>
      dispatch({ type: "SET_PROGRESS", key, value }),
    []
  );
  const setMessage = useCallback(
    (key: string, message: string) =>
      dispatch({ type: "SET_MESSAGE", key, message }),
    []
  );

  const isLoading = useCallback(
    (key?: string) => {
      if (!key) return state.global;
      return state.named[key] === true;
    },
    [state.global, state.named]
  );

  const getProgress = useCallback(
    (key: string) => state.progress[key] ?? 0,
    [state.progress]
  );
  const getMessage = useCallback(
    (key: string) => state.messages[key],
    [state.messages]
  );

  return (
    <LoadingContext.Provider
      value={{
        state,
        startGlobal,
        stopGlobal,
        start,
        stop,
        setProgress,
        setMessage,
        isLoading,
        getProgress,
        getMessage,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error("useLoading must be used within LoadingProvider");
  }
  return ctx;
}

export function useGlobalLoading() {
  const { global } = useContext(LoadingContext)?.state ?? { global: false };
  return global;
}

export function useNamedLoading(key: string) {
  const ctxState = useContext(LoadingContext)?.state;
  const named = (ctxState?.named ?? {}) as Record<string, boolean>;
  const progress = (ctxState?.progress ?? {}) as Record<string, number>;
  const messages = (ctxState?.messages ?? {}) as Record<string, string>;
  return {
    isLoading: named[key] === true,
    progress: progress[key] ?? 0,
    message: messages[key],
  };
}
