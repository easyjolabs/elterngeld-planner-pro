import { useRef, useState, useCallback } from 'react';

/**
 * Custom Hook für Chat-Scroll-Verhalten
 * Basiert auf dem funktionierenden POC
 */
export function useChatScroll() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const bottomSpacerRef = useRef<HTMLDivElement>(null);

  const [spacerHeight, setSpacerHeight] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  const targetScrollTopRef = useRef<number | null>(null);

  const expandSpacerForMessage = useCallback((messageElement: HTMLElement) => {
    if (!scrollContainerRef.current) return;

    const viewportHeight = scrollContainerRef.current.clientHeight;
    const messageHeight = messageElement.offsetHeight;
    const newSpacerHeight = Math.max(0, viewportHeight - messageHeight - 32);
    setSpacerHeight(newSpacerHeight);
  }, []);

  const smoothScrollTo = useCallback((targetPosition: number, duration: number = 500): Promise<void> => {
    return new Promise((resolve) => {
      const container = scrollContainerRef.current;
      if (!container) {
        resolve();
        return;
      }

      const startPosition = container.scrollTop;
      const distance = targetPosition - startPosition;

      if (Math.abs(distance) < 1) {
        resolve();
        return;
      }

      setIsScrolling(true);
      const startTime = performance.now();

      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

      const animateScroll = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutCubic(progress);

        container.scrollTop = startPosition + (distance * eased);

        if (progress < 1) {
          requestAnimationFrame(animateScroll);
        } else {
          container.scrollTop = targetPosition;
          setIsScrolling(false);
          resolve();
        }
      };

      requestAnimationFrame(animateScroll);
    });
  }, []);

  const scrollMessageToTop = useCallback(async (messageElement: HTMLElement, duration: number = 500): Promise<void> => {
    if (!scrollContainerRef.current) return;

    const targetScrollTop = messageElement.offsetTop - 16;
    targetScrollTopRef.current = targetScrollTop;

    await smoothScrollTo(targetScrollTop, duration);
  }, [smoothScrollTo]);

  const stabilizeScrollPosition = useCallback(() => {
    const container = scrollContainerRef.current;
    const messagesContainer = messagesContainerRef.current;
    const spacer = bottomSpacerRef.current;
    const targetScrollTop = targetScrollTopRef.current;

    if (!container || !messagesContainer || !spacer || targetScrollTop === null) return;

    const viewportHeight = container.clientHeight;
    const messagesHeight = messagesContainer.offsetHeight;

    const neededScrollHeight = targetScrollTop + viewportHeight;
    const newSpacerHeight = Math.max(0, neededScrollHeight - messagesHeight);

    // WICHTIG: Direkt DOM manipulieren (wie im POC)
    spacer.style.transition = 'none';  // Transition aus
    spacer.style.height = `${newSpacerHeight}px`;  // Höhe setzen
    void spacer.offsetHeight;  // Force layout recalc
    container.scrollTop = targetScrollTop;  // Position setzen
    spacer.style.transition = 'height 0.3s ease';  // Transition wieder an

    // State synchronisieren
    setSpacerHeight(newSpacerHeight);
  }, []);

  const releaseScrollLock = useCallback(() => {
    targetScrollTopRef.current = null;
    setSpacerHeight(0);
  }, []);

  const hasContentBelow = useCallback((): boolean => {
    const container = scrollContainerRef.current;
    const messagesContainer = messagesContainerRef.current;

    if (!container || !messagesContainer) return false;

    const lastMessage = messagesContainer.lastElementChild as HTMLElement;
    if (!lastMessage) return false;

    const lastMessageBottom = lastMessage.offsetTop + lastMessage.offsetHeight;
    const viewportBottom = container.scrollTop + container.clientHeight;

    return lastMessageBottom > viewportBottom + 5;
  }, []);

  const scrollToBottom = useCallback(async (duration: number = 400) => {
    const container = scrollContainerRef.current;
    const messagesContainer = messagesContainerRef.current;

    if (!container || !messagesContainer) return;

    releaseScrollLock();

    const lastMessage = messagesContainer.lastElementChild as HTMLElement;
    if (!lastMessage) return;

    const lastMessageBottom = lastMessage.offsetTop + lastMessage.offsetHeight + 16;
    const targetScroll = Math.max(0, lastMessageBottom - container.clientHeight);

    await smoothScrollTo(targetScroll, duration);
  }, [smoothScrollTo, releaseScrollLock]);

  return {
    scrollContainerRef,
    messagesContainerRef,
    bottomSpacerRef,
    spacerHeight,
    isScrolling,
    expandSpacerForMessage,
    scrollMessageToTop,
    stabilizeScrollPosition,
    releaseScrollLock,
    hasContentBelow,
    scrollToBottom,
  };
}
