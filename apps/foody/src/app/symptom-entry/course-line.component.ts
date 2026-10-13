import { Component, computed, input } from '@angular/core';
import { levelStep } from '../shared/level.component';
import { SymptomEntry } from './symptom-entry-store';

const WIDTH = 64;
const HEIGHT = 22;
/** Room for the stroke and the dot at the end */
const MARGIN = 3;

/**
 * A small line of how a symptom went on: its level when it was logged and
 * the levels of its follow-ups, down to the bottom when it was gone. Shows
 * the course at a glance, the lines below the entry say the rest.
 */
@Component({
  selector: 'app-course-line',
  template: `
    @if (points(); as points) {
      <svg
        [attr.viewBox]="viewBox"
        [attr.width]="width"
        [attr.height]="height"
        aria-hidden="true"
      >
        <polyline [attr.points]="points.line" />
        <circle [attr.cx]="points.end.x" [attr.cy]="points.end.y" r="2.5" />
      </svg>
    }
  `,
  styles: [
    `
      :host {
        flex: none;
        display: flex;
      }

      polyline {
        fill: none;
        stroke: var(--discomfort);
        stroke-width: 1.5;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      circle {
        fill: var(--discomfort);
      }
    `,
  ],
})
export class CourseLineComponent {
  readonly entry = input.required<SymptomEntry>();

  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;
  protected readonly viewBox = `0 0 ${WIDTH} ${HEIGHT}`;

  /** The steps (0-10) over time; null if there are too few to draw a line */
  protected readonly points = computed(() => {
    const entry = this.entry();
    const steps = [
      entry.discomfortLevel,
      // A follow-up without a level says nothing about how high it was
      ...entry.followUps.map((followUp) =>
        followUp.course === 'gone' ? 0 : followUp.discomfortLevel,
      ),
    ]
      .filter((level): level is number => level !== null)
      .map((level) => (level === 0 ? 0 : levelStep(level)));
    if (steps.length < 2) return null;

    const points = steps.map((step, index) => ({
      x: MARGIN + (index / (steps.length - 1)) * (WIDTH - 2 * MARGIN),
      y: HEIGHT - MARGIN - (step / 10) * (HEIGHT - 2 * MARGIN),
    }));
    return {
      line: points.map(({ x, y }) => `${x},${y}`).join(' '),
      end: points[points.length - 1],
    };
  });
}
