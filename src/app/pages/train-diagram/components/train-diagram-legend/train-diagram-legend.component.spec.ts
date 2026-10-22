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

        expect(fixture.nativeElement).toHaveTextContent(/回送/);
        expect(
            fixture.nativeElement.querySelector('line[stroke-dasharray="6 4"]'),
        ).not.toBeNull();

        fixture.componentRef.setInput('hasDeadhead', false);
        fixture.detectChanges();

        expect(fixture.nativeElement).not.toHaveTextContent(/回送/);
        expect(
            fixture.nativeElement.querySelector('line[stroke-dasharray="6 4"]'),
        ).toBeNull();
    });

    it('showCurrentTimeCursor=true で「現在時刻」が出て、false では出ない', () => {
        fixture.componentRef.setInput('showCurrentTimeCursor', true);
        fixture.detectChanges();

        expect(fixture.nativeElement).toHaveTextContent(/現在時刻/);

        fixture.componentRef.setInput('showCurrentTimeCursor', false);
        fixture.detectChanges();

        expect(fixture.nativeElement).not.toHaveTextContent(/現在時刻/);
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

describe('TrainDiagramLegendComponent の読み込み中', () => {
    let fixture: ComponentFixture<TrainDiagramLegendComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TrainDiagramLegendComponent],
        }).compileComponents();
        fixture = TestBed.createComponent(TrainDiagramLegendComponent);
    });

    it('読み込み中は項目の代わりに棒を出し、現在時刻の見本は残す', () => {
        fixture.componentRef.setInput('loading', true);
        fixture.componentRef.setInput('showCurrentTimeCursor', true);
        fixture.componentRef.setInput('hasDepotOut', true);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;

        expect(
            el.querySelector('[data-testid="train-diagram-legend-skeleton"]'),
        ).not.toBeNull();
        expect(el).not.toHaveTextContent('出庫');
        expect(el).toHaveTextContent('現在時刻');
    });

    it('読み込みが終わったら棒を消して項目を出す', () => {
        fixture.componentRef.setInput('loading', false);
        fixture.componentRef.setInput('hasDepotOut', true);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;

        expect(
            el.querySelector('[data-testid="train-diagram-legend-skeleton"]'),
        ).toBeNull();
        expect(el).toHaveTextContent('出庫');
    });
});
