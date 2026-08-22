import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';
import {
  Platform,
  ScrollView,
  type ScrollViewProps,
} from 'react-native';

import { spacing } from '@/shared/presentation/theme';

type FocusTarget = number | object;

const KeyboardAwareContext = createContext<
  ((target: FocusTarget) => void) | undefined
>(undefined);
const ignoreFocus = () => undefined;

function revealWebTarget(target: FocusTarget): void {
  const element = target as {
    scrollIntoView?: (options: ScrollIntoViewOptions) => void;
  };

  element.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
}

export function KeyboardAwareScrollView({
  children,
  ...props
}: PropsWithChildren<ScrollViewProps>) {
  const scrollView = useRef<ScrollView>(null);
  const revealTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(
    () => () => {
      if (revealTimeout.current) {
        clearTimeout(revealTimeout.current);
      }
    },
    [],
  );

  const revealInput = useCallback((target: FocusTarget) => {
    if (revealTimeout.current) {
      clearTimeout(revealTimeout.current);
    }

    revealTimeout.current = setTimeout(() => {
      if (Platform.OS === 'web') {
        revealWebTarget(target);
        return;
      }

      scrollView.current
        ?.getScrollResponder()
        ?.scrollResponderScrollNativeHandleToKeyboard(
          target,
          spacing.xl,
          true,
        );
    }, Platform.OS === 'web' ? 50 : 180);
  }, []);

  return (
    <KeyboardAwareContext.Provider value={revealInput}>
      <ScrollView
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        ref={scrollView}
        {...props}
      >
        {children}
      </ScrollView>
    </KeyboardAwareContext.Provider>
  );
}

export function useKeyboardAwareInput(): (target: FocusTarget) => void {
  const revealInput = useContext(KeyboardAwareContext);

  return revealInput ?? ignoreFocus;
}
