import {
  Component,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { I18n } from './i18n/i18n';
import { IconComponent } from './icon.component';

// A swipe has to be mostly horizontal and long enough to be meant
const SWIPE_MIN_DISTANCE = 50;

/**
 * Shows a photo as large as the screen allows, and the others of the same
 * thing next to it. Opened with `open()`.
 */
@Component({
  selector: 'app-photo-viewer',
  imports: [IconComponent],
  // On the host, as the dialog itself is not interactive; its events reach it
  host: {
    '(keydown)': 'onKey($event)',
    '(touchstart)': 'onTouchStart($event)',
    '(touchend)': 'onTouchEnd($event)',
  },
  template: `
    <dialog #dialog (close)="index.set(null)">
      @if (index() !== null) {
        <!-- Anywhere around the photo closes it, like the backdrop -->
        <button
          type="button"
          class="backdrop"
          tabindex="-1"
          (click)="close()"
          [attr.aria-label]="t().close"
        ></button>
        <img [src]="photos()[index() ?? 0]" alt="" />

        <button
          type="button"
          class="round close"
          (click)="close()"
          [attr.aria-label]="t().close"
        >
          <app-icon name="close" />
        </button>
        @if (photos().length > 1) {
          <button
            type="button"
            class="round previous"
            (click)="move(-1)"
            [attr.aria-label]="t().previousPhoto"
          >
            <app-icon name="chevron-left" />
          </button>
          <button
            type="button"
            class="round next"
            (click)="move(1)"
            [attr.aria-label]="t().nextPhoto"
          >
            <app-icon name="chevron-right" />
          </button>
          <span class="count">
            {{ (index() ?? 0) + 1 }} / {{ photos().length }}
          </span>
        }
      }
    </dialog>
  `,
  styles: [
    `
      dialog {
        width: 100vw;
        max-width: none;
        height: 100dvh;
        max-height: none;
        margin: 0;
        padding: 0;
        border: none;
        background: rgba(0, 0, 0, 0.9);
        overflow: hidden;
      }

      dialog[open] {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      dialog::backdrop {
        background: transparent;
      }

      .backdrop {
        position: absolute;
        inset: 0;
        padding: 0;
        border: none;
        background: none;
        cursor: zoom-out;
      }

      img {
        position: relative;
        max-width: calc(100vw - 16px);
        max-height: calc(100dvh - 16px);
        object-fit: contain;
        border-radius: var(--radius);
        /* Clicks go through to the backdrop, so the photo closes too */
        pointer-events: none;
      }

      .round {
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        padding: 0;
        border: none;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.55);
        color: #fff;
        font-size: 1.3rem;
        cursor: pointer;
      }

      .close {
        top: 12px;
        right: 12px;
      }

      .previous {
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
      }

      .next {
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
      }

      .count {
        position: absolute;
        bottom: 16px;
        left: 50%;
        transform: translateX(-50%);
        padding: 4px 12px;
        border-radius: 999px;
        background: rgba(0, 0, 0, 0.55);
        color: #fff;
        font-size: 0.85rem;
        font-variant-numeric: tabular-nums;
      }
    `,
  ],
})
export class PhotoViewerComponent {
  protected readonly t = inject(I18n).t;

  /** The addresses of the photos that can be paged through */
  readonly photos = input.required<string[]>();

  /** The photo that is shown; null while closed */
  protected readonly index = signal<number | null>(null);
  private readonly dialog =
    viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private touchStartX: number | null = null;

  /** Shows the photo at the index */
  open(index: number): void {
    this.index.set(index);
    const dialog = this.dialog().nativeElement;
    if (!dialog.open) dialog.showModal();
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  /** Pages through the photos; after the last one comes the first */
  protected move(step: number): void {
    const count = this.photos().length;
    this.index.update((index) => ((index ?? 0) + step + count) % count);
  }

  /** The arrow keys page, Escape is handled by the dialog itself */
  protected onKey(event: KeyboardEvent): void {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (!step || this.photos().length < 2) return;
    event.preventDefault();
    this.move(step);
  }

  protected onTouchStart(event: TouchEvent): void {
    this.touchStartX =
      event.touches.length === 1 ? event.touches[0].clientX : null;
  }

  protected onTouchEnd(event: TouchEvent): void {
    const start = this.touchStartX;
    const touch = event.changedTouches[0];
    this.touchStartX = null;
    if (start === null || !touch || this.photos().length < 2) return;

    const distance = touch.clientX - start;
    if (Math.abs(distance) < SWIPE_MIN_DISTANCE) return;
    // Swiping to the left shows the next photo, like turning a page
    this.move(distance < 0 ? 1 : -1);
  }
}
