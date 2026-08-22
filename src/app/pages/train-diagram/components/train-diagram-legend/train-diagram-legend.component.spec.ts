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
            {
                tripClassId: '1',
                tripClassName: '特急（SO）',
                tripClassColor: '#ee7b35',
            },
            {
                tripClassId: '2',
                tripClassName: '特急（SO→TY）',
                tripClassColor: '#ff0000',
            },
            {
                tripClassId: '3',
                tripClassName: '各停（SO）',
                tripClassColor: '#8a8a8a',
            },
        ]);

        const entries = component.legendEntries();

        // 特急（SO）/特急（SO→TY）は「特急」1 行にまとまり、色は最初の #ee7b35
        expect(entries).toEqual([
            { labels: ['特急'], color: '#ee7b35' },
            { labels: ['各停'], color: '#8a8a8a' },
        ]);
    });

    // audit M3: 色はドメインデータで UI 側では変えられないため、同色の種別が
    // 別々のスウォッチとして並ぶと判別できない。色でまとめて種別名を併記する。
    it('異なるベース種別が同じ色を共有する場合はひとつのスウォッチにまとめる', () => {
        fixture.componentRef.setInput('tripClasses', [
            {
                tripClassId: '1',
                tripClassName: '特急',
                tripClassColor: '#ff9800',
            },
            {
                tripClassId: '2',
                tripClassName: 'F特急',
                tripClassColor: '#ff9800',
            },
            {
                tripClassId: '3',
                tripClassName: '各停',
                tripClassColor: '#212121',
            },
            {
                tripClassId: '4',
                tripClassName: '普通',
                tripClassColor: '#212121',
            },
            {
                tripClassId: '5',
                tripClassName: '快速',
                tripClassColor: '#3f51b5',
            },
        ]);

        expect(component.legendEntries()).toEqual([
            { labels: ['特急', 'F特急'], color: '#ff9800' },
            { labels: ['各停', '普通'], color: '#212121' },
            { labels: ['快速'], color: '#3f51b5' },
        ]);
    });

    it('色の表記ゆれ（大文字小文字・前後空白）は同じ色として扱う', () => {
        fixture.componentRef.setInput('tripClasses', [
            {
                tripClassId: '1',
                tripClassName: '急行',
                tripClassColor: '#D50000',
            },
            {
                tripClassId: '2',
                tripClassName: 'F急行',
                tripClassColor: ' #d50000 ',
            },
        ]);

        expect(component.legendEntries()).toEqual([
            { labels: ['急行', 'F急行'], color: '#D50000' },
        ]);
    });
});
