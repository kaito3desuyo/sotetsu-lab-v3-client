import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';
import { StickyDirectionToggleComponent } from './sticky-direction-toggle.component';

describe('StickyDirectionToggleComponent', () => {
    let fixture: ComponentFixture<StickyDirectionToggleComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [StickyDirectionToggleComponent],
        }).compileComponents();
        fixture = TestBed.createComponent(StickyDirectionToggleComponent);
        fixture.componentRef.setInput('value', ETripDirection.OUTBOUND);
        fixture.detectChanges();
    });

    it('上り・下りの 2 つを出し、押した向きを数で流す', () => {
        const emitted: ETripDirection[] = [];
        fixture.componentInstance.valueChange.subscribe((v) => emitted.push(v));
        const el = fixture.nativeElement as HTMLElement;
        const buttons = Array.from(el.querySelectorAll('button'));
        expect(buttons.map((b) => b.textContent?.trim())).toEqual([
            '上り',
            '下り',
        ]);

        buttons[0].click();
        expect(emitted).toEqual([ETripDirection.INBOUND]);
    });

    it('今の向きを押しても流さない', () => {
        const emitted: ETripDirection[] = [];
        fixture.componentInstance.valueChange.subscribe((v) => emitted.push(v));
        const el = fixture.nativeElement as HTMLElement;
        el.querySelectorAll('button')[1].click();
        expect(emitted).toEqual([]);
    });
});
