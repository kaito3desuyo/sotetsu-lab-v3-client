import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SkeletonBarComponent } from './skeleton-bar.component';

@Component({
    imports: [SkeletonBarComponent],
    template: `<app-skeleton-bar class="tw-h-5 tw-w-24"></app-skeleton-bar>`,
})
class HostComponent {}

describe('SkeletonBarComponent', () => {
    it('骨組みの見た目に、使う側の大きさの class を足す', () => {
        const fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();
        const bar = (fixture.nativeElement as HTMLElement).querySelector(
            'app-skeleton-bar',
        ) as HTMLElement;

        for (const name of [
            'tw-block',
            'tw-animate-pulse',
            'tw-rounded-control',
            'tw-bg-paper-3',
            'motion-reduce:tw-animate-none',
            'tw-h-5',
            'tw-w-24',
        ]) {
            expect(bar.classList).toContain(name);
        }
    });

    it('棒 1 本は読み上げない（読み上げは包む側の aria-label）', () => {
        const fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();
        const bar = (fixture.nativeElement as HTMLElement).querySelector(
            'app-skeleton-bar',
        ) as HTMLElement;

        expect(bar).toHaveAttribute('aria-hidden', 'true');
    });
});
