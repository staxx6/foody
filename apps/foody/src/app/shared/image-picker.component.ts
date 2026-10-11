import { inject, Component, computed, model } from '@angular/core';
import { I18n } from './i18n/i18n';
import { IconComponent } from './icon.component';

/**
 * Selects photos for a record and shows them before saving
 */
@Component({
  selector: 'app-image-picker',
  imports: [IconComponent],
  template: `
    @for (preview of previews(); track preview.url) {
      <div class="photo">
        <img [src]="preview.url" alt="" />
        <button
          type="button"
          (click)="remove(preview.file)"
          [attr.aria-label]="t().removePhoto(preview.file.name)"
        >
          <app-icon name="close" />
        </button>
      </div>
    }
    <label class="add">
      <app-icon name="image" />
      {{ t().addPhoto }}
      <input
        #input
        type="file"
        accept="image/*"
        multiple
        (change)="add(input.files); input.value = ''"
      />
    </label>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .photo,
      .add {
        position: relative;
        width: 88px;
        height: 88px;
        border-radius: var(--radius);
        overflow: hidden;
      }

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .photo button {
        position: absolute;
        top: 4px;
        right: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        padding: 0;
        border: none;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.6);
        color: #fff;
        font-size: 12px;
        cursor: pointer;
      }

      .add {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        border: 1px dashed var(--border);
        color: var(--text-muted);
        padding: 4px;
        font-size: 0.7rem;
        font-weight: 600;
        line-height: 1.2;
        text-align: center;
        cursor: pointer;
      }

      .add app-icon {
        font-size: 1.1rem;
      }

      .add:focus-within {
        border-color: var(--primary);
      }

      /* Stays focusable, the label is the visible control */
      .add input {
        position: absolute;
        inset: 0;
        min-height: 0;
        padding: 0;
        opacity: 0;
        cursor: pointer;
      }
    `,
  ],
})
export class ImagePickerComponent {
  protected readonly t = inject(I18n).t;
  readonly files = model<File[]>([]);

  protected readonly previews = computed(() =>
    this.files().map((file) => ({ file, url: URL.createObjectURL(file) })),
  );

  protected add(selected: FileList | null): void {
    this.files.update((files) => [...files, ...Array.from(selected ?? [])]);
  }

  protected remove(file: File): void {
    this.files.update((files) => files.filter((other) => other !== file));
  }
}
