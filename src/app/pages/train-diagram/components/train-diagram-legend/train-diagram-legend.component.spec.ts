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
        fixture.componentRef.setInput('tripClasses', []);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('種別ベース名（"（" 以前）でまとめ、重複は最初の色を代表色にする', () => {
        fixture.componentRef.setInput('tripClasses', [
            { tripClassId: '1', tripClassName: '特急（SO）', tripClassColor: '#ee7b35' },
            { tripClassId: '2', tripClassName: '特急（SO→TY）', tripClassColor: '#ff0000' },
            { tripClassId: '3', tripClassName: '各停（SO）', tripClassColor: '#8a8a8a' },
        ]);

        const entries = component.legendEntries();

        // 特急（SO）/特急（SO→TY）は「特急」1 行にまとまり、色は最初の #ee7b35
        expect(entries).toEqual([
            { label: '特急', color: '#ee7b35' },
            { label: '各停', color: '#8a8a8a' },
        ]);
    });
});
