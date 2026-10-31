import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type InputIntent =
  | "insert"
  | "delete"
  | "backspace"
  | "enter"
  | "shift-enter"
  | "escape"
  | "tab"
  | "shift-tab"
  | "arrow-up"
  | "arrow-down"
  | "arrow-left"
  | "arrow-right"
  | "paste"
  | "cut"
  | "copy"
  | "select-all"
  | "undo"
  | "redo"
  | "composition-start"
  | "composition-update"
  | "composition-end"
  | "before-input"
  | "unknown";

export type KeyboardModifiers = {
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  meta: boolean;
  altGraph: boolean;
};

export type InputEventDetail = {
  intent: InputIntent;
  data: string | null;
  dataTransfer: DataTransfer | null;
  target: EventTarget | null;
  isComposing: boolean;
  modifiers: KeyboardModifiers;
  rawEvent:
    | React.KeyboardEvent
    | React.CompositionEvent
    | React.ClipboardEvent
    | React.FormEvent
    | InputEvent;
  preventDefault: () => void;
  stopPropagation: () => void;
};

export type InputIntentHandler = (detail: InputEventDetail) => boolean | void;

export type UseInputIntentOptions = {
  onIntent?: InputIntentHandler;
  onCompositionStart?: (detail: InputEventDetail) => void;
  onCompositionUpdate?: (detail: InputEventDetail) => void;
  onCompositionEnd?: (detail: InputEventDetail) => void;
  onBeforeInput?: (detail: InputEventDetail) => boolean | void;
  preventSubmitDuringComposition?: boolean;
  enabled?: boolean;
  target?: HTMLElement | null;
};

const KEY_MAP: Record<string, InputIntent> = {
  Enter: "enter",
  Escape: "escape",
  Tab: "tab",
  ArrowUp: "arrow-up",
  ArrowDown: "arrow-down",
  ArrowLeft: "arrow-left",
  ArrowRight: "arrow-right",
  Backspace: "backspace",
  Delete: "delete",
  Paste: "paste",
  Cut: "cut",
  Copy: "copy",
  SelectAll: "select-all",
  Undo: "undo",
  Redo: "redo",
};

function getModifiers(e: React.KeyboardEvent): KeyboardModifiers {
  return {
    shift: e.shiftKey,
    ctrl: e.ctrlKey,
    alt: e.altKey,
    meta: e.metaKey,
    altGraph: e.getModifierState?.("AltGraph") ?? false,
  };
}

function getKeyboardIntent(e: React.KeyboardEvent): InputIntent {
  const key = e.key;
  const mods = getModifiers(e);

  if (mods.ctrl || mods.meta) {
    switch (key.toLowerCase()) {
      case "v":
        return "paste";
      case "x":
        return "cut";
      case "c":
        return "copy";
      case "a":
        return "select-all";
      case "z":
        return mods.shift ? "redo" : "undo";
      case "y":
        return "redo";
      case "enter":
        return "shift-enter";
      case "/":
        return "select-all";
    }
  }

  if (mods.shift) {
    if (key === "Enter") return "shift-enter";
    if (key === "Tab") return "shift-tab";
  }

  return KEY_MAP[key] ?? "unknown";
}

function getCompositionIntent(type: string): InputIntent {
  switch (type) {
    case "compositionstart":
      return "composition-start";
    case "compositionupdate":
      return "composition-update";
    case "compositionend":
      return "composition-end";
    default:
      return "unknown";
  }
}

export function useInputIntent(options: UseInputIntentOptions = {}) {
  const {
    onIntent,
    onCompositionStart,
    onCompositionUpdate,
    onCompositionEnd,
    onBeforeInput,
    preventSubmitDuringComposition = true,
    enabled = true,
    target,
  } = options;

  const isComposingRef = useRef(false);
  // Mutable flag (the option value alone is a const from destructuring, but the
  // API exposes a runtime toggle for it).
  const [blockCompositionSubmit, setBlockCompositionSubmit] = useState(
    preventSubmitDuringComposition
  );
  const compositionDataRef = useRef<string>("");
  const pendingBeforeInputRef = useRef<InputEvent | null>(null);
  const isSafariRef = useRef(false);
  const isAndroidRef = useRef(false);
  const isIOSRef = useRef(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    isSafariRef.current = /^((?!chrome|android).)*safari/i.test(ua);
    isAndroidRef.current = /android/i.test(ua);
    isIOSRef.current = /iphone|ipad|ipod/i.test(ua);
  }, []);

  const createDetail = useCallback(
    (
      intent: InputIntent,
      rawEvent:
        | React.KeyboardEvent
        | React.CompositionEvent
        | React.ClipboardEvent
        | React.FormEvent
        | InputEvent,
      extra: Partial<InputEventDetail> = {}
    ): InputEventDetail => {
      const baseEvent = rawEvent as React.SyntheticEvent;
      const targetEl = baseEvent.currentTarget ?? baseEvent.target ?? null;

      return {
        intent,
        data: extra.data ?? null,
        dataTransfer: extra.dataTransfer ?? null,
        target: targetEl,
        isComposing: isComposingRef.current,
        modifiers: extra.modifiers ?? {
          shift: false,
          ctrl: false,
          alt: false,
          meta: false,
          altGraph: false,
        },
        rawEvent,
        preventDefault: () => baseEvent.preventDefault?.(),
        stopPropagation: () => baseEvent.stopPropagation?.(),
        ...extra,
      };
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!enabled) return;
      if (e.nativeEvent.isComposing) return;

      const intent = getKeyboardIntent(e);
      if (intent === "unknown") return;

      const detail = createDetail(intent, e, {
        modifiers: getModifiers(e),
      });

      const handled = onIntent?.(detail) ?? false;
      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [createDetail, enabled, onIntent]
  );

  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent) => {
      if (!enabled) return;
    },
    [enabled]
  );

  const handleCompositionStart = useCallback(
    (e: React.CompositionEvent) => {
      if (!enabled) return;
      isComposingRef.current = true;
      compositionDataRef.current = e.data;

      const detail = createDetail("composition-start", e, { data: e.data });
      onCompositionStart?.(detail);
      onIntent?.(detail);
    },
    [createDetail, enabled, onCompositionStart, onIntent]
  );

  const handleCompositionUpdate = useCallback(
    (e: React.CompositionEvent) => {
      if (!enabled) return;
      compositionDataRef.current = e.data;

      const detail = createDetail("composition-update", e, { data: e.data });
      onCompositionUpdate?.(detail);
      onIntent?.(detail);
    },
    [createDetail, enabled, onCompositionUpdate, onIntent]
  );

  const handleCompositionEnd = useCallback(
    (e: React.CompositionEvent) => {
      if (!enabled) return;
      const finalData = e.data;
      isComposingRef.current = false;
      compositionDataRef.current = "";

      const detail = createDetail("composition-end", e, { data: finalData });
      onCompositionEnd?.(detail);
      onIntent?.(detail);

      if (isSafariRef.current && finalData) {
        setTimeout(() => {
          const inputEvent = new InputEvent("beforeinput", {
            inputType: "insertCompositionText",
            data: finalData,
            bubbles: true,
            cancelable: true,
            composed: true,
          });
          (e.target as HTMLInputElement)?.dispatchEvent(inputEvent);
        }, 0);
      }
    },
    [createDetail, enabled, onCompositionEnd, onIntent]
  );

  const handleBeforeInput = useCallback(
    (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (!enabled) return;

      const nativeEvent = e.nativeEvent as InputEvent;
      if (isComposingRef.current) return;

      const detail = createDetail("before-input", e as any, {
        data: nativeEvent.data,
        dataTransfer: null,
      });

      const handled = onBeforeInput?.(detail) ?? false;
      if (handled) {
        e.preventDefault();
      }
      return !handled;
    },
    [createDetail, enabled, onBeforeInput]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (!enabled) return;
      if (isComposingRef.current) {
        e.preventDefault();
        return;
      }

      const detail = createDetail("paste", e, {
        data: e.clipboardData.getData("text"),
        dataTransfer: e.clipboardData,
      });

      const handled = onIntent?.(detail) ?? false;
      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [createDetail, enabled, onIntent]
  );

  const handleCut = useCallback(
    (e: React.ClipboardEvent) => {
      if (!enabled) return;

      const detail = createDetail("cut", e, {
        data: e.clipboardData.getData("text"),
        dataTransfer: e.clipboardData,
      });

      onIntent?.(detail);
    },
    [createDetail, enabled, onIntent]
  );

  const handleCopy = useCallback(
    (e: React.ClipboardEvent) => {
      if (!enabled) return;

      const detail = createDetail("copy", e, {
        data: e.clipboardData.getData("text"),
        dataTransfer: e.clipboardData,
      });

      onIntent?.(detail);
    },
    [createDetail, enabled, onIntent]
  );

  const handleSelect = useCallback(
    (e: React.SyntheticEvent) => {
      if (!enabled) return;
    },
    [enabled]
  );

  const handleFormSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      if (!enabled) return;
      if (blockCompositionSubmit && isComposingRef.current) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    },
    [enabled, blockCompositionSubmit]
  );

  const attachListeners = useCallback(
    (element: HTMLElement | null) => {
      if (!element) return;

      element.addEventListener(
        "keydown",
        handleKeyDown as unknown as EventListener
      );
      element.addEventListener(
        "keyup",
        handleKeyUp as unknown as EventListener
      );
      element.addEventListener(
        "compositionstart",
        handleCompositionStart as unknown as EventListener
      );
      element.addEventListener(
        "compositionupdate",
        handleCompositionUpdate as unknown as EventListener
      );
      element.addEventListener(
        "compositionend",
        handleCompositionEnd as unknown as EventListener
      );
      element.addEventListener(
        "beforeinput",
        handleBeforeInput as unknown as EventListener
      );
      element.addEventListener(
        "paste",
        handlePaste as unknown as EventListener
      );
      element.addEventListener("cut", handleCut as unknown as EventListener);
      element.addEventListener("copy", handleCopy as unknown as EventListener);
      element.addEventListener(
        "select",
        handleSelect as unknown as EventListener
      );
      element.addEventListener(
        "submit",
        handleFormSubmit as unknown as EventListener
      );

      return () => {
        element.removeEventListener(
          "keydown",
          handleKeyDown as unknown as EventListener
        );
        element.removeEventListener(
          "keyup",
          handleKeyUp as unknown as EventListener
        );
        element.removeEventListener(
          "compositionstart",
          handleCompositionStart as unknown as EventListener
        );
        element.removeEventListener(
          "compositionupdate",
          handleCompositionUpdate as unknown as EventListener
        );
        element.removeEventListener(
          "compositionend",
          handleCompositionEnd as unknown as EventListener
        );
        element.removeEventListener(
          "beforeinput",
          handleBeforeInput as unknown as EventListener
        );
        element.removeEventListener(
          "paste",
          handlePaste as unknown as EventListener
        );
        element.removeEventListener(
          "cut",
          handleCut as unknown as EventListener
        );
        element.removeEventListener(
          "copy",
          handleCopy as unknown as EventListener
        );
        element.removeEventListener(
          "select",
          handleSelect as unknown as EventListener
        );
        element.removeEventListener(
          "submit",
          handleFormSubmit as unknown as EventListener
        );
      };
    },
    [
      handleKeyDown,
      handleKeyUp,
      handleCompositionStart,
      handleCompositionUpdate,
      handleCompositionEnd,
      handleBeforeInput,
      handlePaste,
      handleCut,
      handleCopy,
      handleSelect,
      handleFormSubmit,
    ]
  );

  useEffect(() => {
    const element = target ?? (document.activeElement as HTMLElement);
    return attachListeners(element);
  }, [target, attachListeners, enabled]);

  const api = useMemo(
    () => ({
      isComposing: isComposingRef.current,
      compositionData: compositionDataRef.current,
      preventSubmitDuringComposition: blockCompositionSubmit,
      setPreventSubmitDuringComposition: setBlockCompositionSubmit,
      focus: (el?: HTMLElement) => (el ?? (target as HTMLElement))?.focus(),
      blur: (el?: HTMLElement) => (el ?? (target as HTMLElement))?.blur(),
      select: (el?: HTMLElement) =>
        (
          (el ?? target) as HTMLInputElement | HTMLTextAreaElement | null
        )?.select(),
      setSelectionRange: (
        start: number,
        end: number,
        direction?: "forward" | "backward" | "none"
      ) =>
        (target as HTMLInputElement | HTMLTextAreaElement)?.setSelectionRange(
          start,
          end,
          direction
        ),
    }),
    [target, blockCompositionSubmit]
  );

  return api;
}

export function useGlobalInputIntent(options: UseInputIntentOptions = {}) {
  return useInputIntent({ ...options, target: null });
}

export function createInputIntentController() {
  const handlers = new Set<InputIntentHandler>();

  return {
    subscribe: (handler: InputIntentHandler) => {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    emit: (detail: InputEventDetail) => {
      for (const handler of handlers) {
        try {
          handler(detail);
        } catch (e) {
          console.error("[InputIntent] Handler error:", e);
        }
      }
    },
  };
}

export type InputIntentController = ReturnType<
  typeof createInputIntentController
>;

export const InputIntentContext =
  React.createContext<InputIntentController | null>(null);

export function InputIntentProvider({
  children,
  ...options
}: UseInputIntentOptions & { children: React.ReactNode }) {
  const controller = useMemo(() => createInputIntentController(), []);
  const api = useInputIntent({ ...options, onIntent: controller.emit });

  return (
    <InputIntentContext.Provider value={controller}>
      {children}
    </InputIntentContext.Provider>
  );
}

export function useInputIntentContext() {
  return React.useContext(InputIntentContext);
}
