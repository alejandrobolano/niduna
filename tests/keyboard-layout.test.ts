import { describe, expect, it } from 'vitest';

import appConfig from '../app.json';
import { webViewportContent } from '../src/shared/presentation/web-viewport';

describe('software keyboard layout', () => {
  it('resizes the Android app while the keyboard is visible', () => {
    expect(appConfig.expo.android.softwareKeyboardLayoutMode).toBe('resize');
  });

  it('resizes the mobile web viewport while the keyboard is visible', () => {
    expect(webViewportContent).toContain('interactive-widget=resizes-content');
  });
});
