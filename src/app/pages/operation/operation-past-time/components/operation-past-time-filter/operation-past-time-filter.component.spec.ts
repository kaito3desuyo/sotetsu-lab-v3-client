import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AgencyListStateQuery } from 'src/app/global-states/agency-list.state';
import { OperationPastTimeStore } from '../../stores/operation-past-time.store';
import { OperationPastTimeFilterComponent } from './operation-past-time-filter.component';

describe('OperationPastTimeFilterComponent', () => {
    let component: OperationPastTimeFilterComponent;
    let fixture: ComponentFixture<OperationPastTimeFilterComponent>;

    beforeEach(async () => {
        OperationPastTimeStore.setSelectedAgencyIds([]);

        await TestBed.configureTestingModule({
            imports: [OperationPastTimeFilterComponent],
            providers: [
                {
                    provide: AgencyListStateQuery,
                    useValue: {
                        agencies$: of([
                            { agencyId: 'agency-1', agencyName: '相鉄' },
                            { agencyId: 'agency-2', agencyName: 'JR東日本' },
                        ]),
                    },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(OperationPastTimeFilterComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        OperationPastTimeStore.setSelectedAgencyIds([]);
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('agencies から会社チップの選択肢を生成する', () => {
        expect(component.agencyOptions()).toEqual([
            { value: 'agency-1', label: '相鉄' },
            { value: 'agency-2', label: 'JR東日本' },
        ]);
    });

    it('onAgencyChange で選択会社をストアへ書き込む（データ再取得はしない）', () => {
        component.onAgencyChange(['agency-1']);
        fixture.detectChanges();

        expect(component.selectedAgencyIds()).toEqual(['agency-1']);
    });
});
