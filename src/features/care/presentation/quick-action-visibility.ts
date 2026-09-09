interface QuickActionLayout {
  height: number;
  y: number;
}

interface QuickActionViewport {
  bottomInset: number;
  height: number;
  scrollOffset: number;
  topInset: number;
}

export function shouldShowQuickActionAccess(
  layout: QuickActionLayout,
  viewport: QuickActionViewport,
): boolean {
  const top = layout.y - viewport.scrollOffset;
  const bottom = top + layout.height;
  const viewportBottom = viewport.height - viewport.bottomInset;

  return top < viewport.topInset || bottom > viewportBottom;
}
