import '@testing-library/jest-dom';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrainDiagramLegendComponent } from './train-diagram-legend.component';

describe('TrainDiagramLegendComponent', () => {
    let component: TrainDiagramLegendComponent;
    let fixture: ComponentFixture<TrainDiagramLegendComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TrainDiagramLegendComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(TrainDiagramLegendComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('hasDeadhead=true で「回送」と破線の見本が出て、false では出ない', () => {
        fixture.componentRef.setInput('hasDeadhead', true);
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('回送');
        expect(
            fixture.nativeElement.querySelector('line[stroke-dasharray="6 4"]'),
        ).not.toBeNull();

        fixture.componentRef.setInput('hasDeadhead', false);
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).not.toContain('回送');
        expect(
            fixture.nativeElement.querySelector('line[stroke-dasharray="6 4"]'),
        ).toBeNull();
    });

    it('showCurrentTimeCursor=true で「現在時刻」が出て、false では出ない', () => {
        fixture.componentRef.setInput('showCurrentTimeCursor', true);
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('現在時刻');

        fixture.componentRef.setInput('showCurrentTimeCursor', false);
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).not.toContain('現在時刻');
    });

    it('Task 14: hasDepotOut=true で「出庫」と◯の見本が出て、false では出ない', () => {
        fixture.componentRef.setInput('hasDepotOut', true);
        fixture.detectChanges();

        expect(fixture.nativeElement).toHaveTextContent('出庫');
        expect(fixture.nativeElement.querySelector('circle')).not.toBeNull();

        fixture.componentRef.setInput('hasDepotOut', false);
        fixture.detectChanges();

        expect(fixture.nativeElement).not.toHaveTextContent('出庫');
        expect(fixture.nativeElement.querySelector('circle')).toBeNull();
    });

    it('Task 14: hasDepotIn=true で「入庫」と△の見本が出て、false では出ない', () => {
        fixture.componentRef.setInput('hasDepotIn', true);
        fixture.detectChanges();

        expect(fixture.nativeElement).toHaveTextContent('入庫');
        expect(fixture.nativeElement.querySelector('polygon')).not.toBeNull();

        fixture.componentRef.setInput('hasDepotIn', false);
        fixture.detectChanges();

        expect(fixture.nativeElement).not.toHaveTextContent('入庫');
        expect(fixture.nativeElement.querySelector('polygon')).toBeNull();
    });

    it('全部 false なら項目は 0（種別の色分けは出さない）', () => {
        fixture.componentRef.setInput('hasDeadhead', false);
        fixture.componentRef.setInput('showCurrentTimeCursor', false);
        fixture.componentRef.setInput('hasDepotOut', false);
        fixture.componentRef.setInput('hasDepotIn', false);
        fixture.detectChanges();

        const items = fixture.nativeElement.querySelectorAll('div > span');
        expect(items.length).toBe(0);
    });
});
