import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StepNavComponent } from './step-nav.component';
import { StepTarget } from './step-target.type';

describe('StepNavComponent', () => {
    let fixture: ComponentFixture<StepNavComponent>;
    const el = () => fixture.nativeElement as HTMLElement;
    const buttons = () =>
        Array.from(el().querySelectorAll('button')) as HTMLButtonElement[];

    const setup = async (prev: StepTarget[], next: StepTarget[]) => {
        await TestBed.configureTestingModule({
            imports: [StepNavComponent],
        }).compileComponents();
        fixture = TestBed.createComponent(StepNavComponent);
        fixture.componentRef.setInput('prev', prev);
        fixture.componentRef.setInput('next', next);
        fixture.detectChanges();
    };

    it('候補ごとに名前付きのボタンを出し、押すとその候補を流す', async () => {
        await setup(
            [{ id: 'a', label: '鶴ヶ峰' }],
            [
                { id: 'b', label: '希望ヶ丘' },
                { id: 'c', label: '南万騎が原' },
            ],
        );
        const emitted: StepTarget[] = [];
        fixture.componentInstance.step.subscribe((t) => emitted.push(t));

        expect(buttons().map((b) => b.textContent?.trim())).toEqual([
            'chevron_left 鶴ヶ峰',
            '希望ヶ丘 chevron_right',
            '南万騎が原 chevron_right',
        ]);
        buttons()[2].click();
        expect(emitted).toEqual([{ id: 'c', label: '南万騎が原' }]);
    });
});
