import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { UserStateQuery } from 'src/app/global-states/user.state';
import { OperationSightingInvalidationDialogService } from 'src/app/shared/operation-sighting-invalidation-dialog/operation-sighting-invalidation-dialog.service';
import { OperationSightingRestorationDialogService } from 'src/app/shared/operation-sighting-restoration-dialog/operation-sighting-restoration-dialog.service';
import { OperationPastTimeService } from '../../services/operation-past-time.service';
import { OperationPastTimeStore } from '../../stores/operation-past-time.store';
import { OperationNumberTagComponent } from 'src/app/shared/operation-number-tag/operation-number-tag.component';
import { OperationPastTimeTableComponent } from './operation-past-time-table.component';

describe('OperationPastTimeTableComponent', () => {
    let component: OperationPastTimeTableComponent;
    let fixture: ComponentFixture<OperationPastTimeTableComponent>;
    let role$: BehaviorSubject<string>;

    beforeEach(async () => {
        role$ = new BehaviorSubject<string>('viewer');
        OperationPastTimeStore.setFormations([
            { formationId: 'f-1', formationNumber: '8708', agencyId: 'agency-1' },
            { formationId: 'f-2', formationNumber: '9704', agencyId: 'agency-2' },
        ] as never);
        OperationPastTimeStore.setSelectedAgencyIds([]);

        await TestBed.configureTestingModule({
            imports: [OperationPastTimeTableComponent],
            providers: [
                provideRouter([]),
                {
                    provide: UserStateQuery,
                    useValue: { role$ },
                },
                {
                    provide: OperationPastTimeService,
                    useValue: { fetchOperationSightingsV3: () => of(undefined) },
                },
                {
                    provide: OperationSightingInvalidationDialogService,
                    useValue: { open: () => ({ afterClosed: () => of(false) }) },
                },
                {
                    provide: OperationSightingRestorationDialogService,
                    useValue: { open: () => ({ afterClosed: () => of(false) }) },
                },
            ],
        })
            .overrideComponent(OperationPastTimeTableComponent, {
                set: { schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(OperationPastTimeTableComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        OperationPastTimeStore.setFormations([]);
        OperationPastTimeStore.setSelectedAgencyIds([]);
        OperationPastTimeStore.setReferenceDate(null);
        OperationPastTimeStore.setDays(null);
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('tableDisplayed: 基準日・日数が揃っていない時は false', () => {
        expect(component.tableDisplayed()).toBe(false);
    });

    it('tableDisplayed: 基準日・日数が揃うと true', () => {
        OperationPastTimeStore.setReferenceDate('2026-07-01');
        OperationPastTimeStore.setDays(2);
        fixture.detectChanges();

        expect(component.tableDisplayed()).toBe(true);
    });

    it('onDefaultSearch: 直近 7 日間（6 日前を基準日に 7 日間）で検索する', () => {
        jest.useFakeTimers().setSystemTime(new Date(2026, 8, 24, 12, 0));
        const navigate = jest
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);

        component.onDefaultSearch();

        expect(navigate).toHaveBeenCalledWith([
            'operation',
            'past-time',
            { reference_date: '2026-09-18', days: 7 },
        ]);
        jest.useRealTimers();
    });

    it('onDefaultSearch: 4 時前は前日を「本日」として数える（運行日）', () => {
        jest.useFakeTimers().setSystemTime(new Date(2026, 8, 24, 0, 37));
        const navigate = jest
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);

        component.onDefaultSearch();

        expect(navigate).toHaveBeenCalledWith([
            'operation',
            'past-time',
            { reference_date: '2026-09-17', days: 7 },
        ]);
        jest.useRealTimers();
    });

    it('contextMenuDisabled: manager/editor 以外は true（B9 の権限制御維持）', () => {
        expect(component.contextMenuDisabled()).toBe(true);
    });

    it('visibleFormations: 会社未選択時は全編成を表示する', () => {
        expect(component.visibleFormations().map((f) => f.formationId)).toEqual([
            'f-1',
            'f-2',
        ]);
    });

    it('visibleFormations: 会社チップ選択で行が絞り込まれる（B9 追加分）', () => {
        OperationPastTimeStore.setSelectedAgencyIds(['agency-1']);
        fixture.detectChanges();

        expect(component.visibleFormations().map((f) => f.formationId)).toEqual([
            'f-1',
        ]);
    });

    it('visibleFormations: 全解除で全編成表示に戻る', () => {
        OperationPastTimeStore.setSelectedAgencyIds(['agency-1']);
        fixture.detectChanges();
        OperationPastTimeStore.setSelectedAgencyIds([]);
        fixture.detectChanges();

        expect(component.visibleFormations().map((f) => f.formationId)).toEqual([
            'f-1',
            'f-2',
        ]);
    });

    describe('引き継いだ目撃', () => {
        const setupCell = () => {
            OperationPastTimeStore.setCalendars([
                { date: '2026-10-12', calendar: {} },
            ] as never);
            OperationPastTimeStore.setReferenceDate('2026-10-12');
            OperationPastTimeStore.setDays(1);
            OperationPastTimeStore.setOperations([
                { operationId: 'o-11', operationNumber: '11K' },
                { operationId: 'o-12', operationNumber: '12K' },
            ] as never);
            OperationPastTimeStore.setOperationSightings([
                {
                    operationSightingId: 's-1',
                    formationId: 'f-1',
                    operationId: 'o-11',
                    sightingTime: '2026-10-12T03:00:00.000Z',
                    invalidation: null,
                },
                {
                    operationSightingId: 's-1#12K',
                    formationId: 'f-1',
                    operationId: 'o-12',
                    sightingTime: '2026-10-12T03:00:00.000Z',
                    invalidation: null,
                    sightedAsOperation: {
                        operationId: 'o-11',
                        operationNumber: '11K',
                    },
                },
            ] as never);
            fixture.detectChanges();
            return fixture.nativeElement.querySelector('tbody td:nth-child(2)')
                .textContent as string;
        };

        afterEach(() => {
            OperationPastTimeStore.setCalendars([]);
            OperationPastTimeStore.setOperations([]);
            OperationPastTimeStore.setOperationSightings([]);
        });

        it('推測した目撃は「?」付きのタグにし、「@11K」は添えない', () => {
            const text = setupCell();

            const inferred = fixture.debugElement
                .queryAll(By.directive(OperationNumberTagComponent))
                .map((d) => d.componentInstance.inferred());
            // 直接（11K）→ 推測（12K）の順
            expect(inferred).toEqual([false, true]);
            expect(text).toContain('12K?');
            expect(text).not.toContain('@');
        });

        it('引き継いだ目撃は無効化・復元できず、直接の目撃はできる', () => {
            role$.next('manager');
            setupCell();

            const menus = fixture.debugElement
                .queryAll(By.directive(OperationNumberTagComponent))
                .map((d) => d.componentInstance.contextMenus());

            // 直接（11K）→ 引き継ぎ（12K）の順
            expect(menus[0].map((m: { disabled: boolean }) => m.disabled)).toEqual([
                false,
                true,
            ]);
            expect(menus[1].map((m: { disabled: boolean }) => m.disabled)).toEqual([
                true,
                true,
            ]);
        });
    });
});
