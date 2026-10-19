import { effect, inject, Injectable } from '@angular/core';
import { OfflineDataAccessService } from '@foody/pocketbase-access';
import { I18n } from './i18n/i18n';

/** Photos of records, which are only there if they were shown before */
const FILE_URL = '/api/files/';
/** Where the address of a photo is kept while its placeholder is shown */
const FAILED = 'failedSrc';
/** From this width on, the placeholder also says why */
const MIN_WIDTH_FOR_TEXT = 100;
/** Lucide "image-off", drawn in a 24 by 24 box */
const ICON =
  '<path d="M2 2l20 20"/><path d="M10.41 10.41a2 2 0 1 1-2.83-2.83"/>' +
  '<path d="M13.5 13.5 6 21"/><path d="m18 12 3 3"/>' +
  '<path d="M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.05-.22 1.41-.59"/>' +
  '<path d="M21 15V5a2 2 0 0 0-2-2H9"/>';

function escapeXml(text: string): string {
  return text.replace(/[<>&"]/g, (char) => `&#${char.charCodeAt(0)};`);
}

/**
 * A placeholder as an image, so it takes the place of the photo with the
 * styles of the photo. A grey that reads on light and dark backgrounds, as
 * the colors of the theme do not reach into it.
 */
function placeholder(text: string | null): string {
  const svg = text
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">` +
      `<rect width="160" height="160" fill="#8882"/>` +
      `<g transform="translate(62 46) scale(1.5)" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON}</g>` +
      `<text x="80" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-size="15" fill="#888">${escapeXml(text)}</text>` +
      `</svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">` +
      `<rect width="40" height="40" fill="#8882"/>` +
      `<g transform="translate(10 10) scale(0.83)" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON}</g>` +
      `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Shows a placeholder that says "offline" instead of a photo that could not
 * be loaded, rather than the broken image of the browser, and loads the
 * photos again once the server is reached
 */
@Injectable({ providedIn: 'root' })
export class PhotoFallback {
  private readonly t = inject(I18n).t;
  private readonly sync = inject(OfflineDataAccessService);

  constructor() {
    // Errors of images do not bubble, but they can be caught on the way down
    document.addEventListener('error', (event) => this.replace(event), true);

    effect(() => {
      if (this.sync.isOnline()) this.retry();
    });
  }

  private replace(event: Event): void {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    // Not the placeholder itself, whose address is a data URL
    if (!image.src.includes(FILE_URL)) return;

    // Mostly the reason; a sync may not have noticed it yet
    const reason = this.t().offline;
    const width = image.getBoundingClientRect().width;
    image.dataset[FAILED] = image.src;
    image.title = reason;
    image.src = placeholder(width >= MIN_WIDTH_FOR_TEXT ? reason : null);
  }

  /** The photos that failed get another chance */
  private retry(): void {
    document
      .querySelectorAll<HTMLImageElement>('img[data-failed-src]')
      .forEach((image) => {
        const src = image.dataset[FAILED] ?? '';
        delete image.dataset[FAILED];
        image.removeAttribute('title');
        image.src = src;
      });
  }
}
