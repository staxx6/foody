import { effect, Injectable, signal } from '@angular/core';

export type Theme = 'system' | 'light' | 'dark';

export const ACCENTS = ['indigo', 'teal', 'coral', 'plum', 'green'] as const;
export type Accent = (typeof ACCENTS)[number];

type Settings = { theme: Theme; accent: Accent };

const STORAGE_KEY = 'foody-settings';
const DEFAULTS: Settings = { theme: 'system', accent: 'indigo' };

function load(): Settings {
  try {
    return {
      ...DEFAULTS,
      ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'),
    };
  } catch {
    return DEFAULTS;
  }
}

/**
 * Appearance settings of this device. The colors themselves are defined in
 * styles.scss and selected by attributes of the root element.
 */
@Injectable({ providedIn: 'root' })
export class SettingsStore {
  private readonly prefersDark = matchMedia('(prefers-color-scheme: dark)');
  private readonly systemIsDark = signal(this.prefersDark.matches);

  readonly theme = signal(load().theme);
  readonly accent = signal(load().accent);

  constructor() {
    this.prefersDark.addEventListener('change', (event) =>
      this.systemIsDark.set(event.matches),
    );

    effect(() => {
      const theme = this.theme();
      const accent = this.accent();
      const isDark =
        theme === 'dark' || (theme === 'system' && this.systemIsDark());

      const root = document.documentElement;
      root.dataset['theme'] = isDark ? 'dark' : 'light';
      root.dataset['accent'] = accent;
      // Color of the browser and status bar on the phone
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute(
          'content',
          getComputedStyle(root).getPropertyValue('--surface').trim(),
        );

      localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, accent }));
    });
  }
}
