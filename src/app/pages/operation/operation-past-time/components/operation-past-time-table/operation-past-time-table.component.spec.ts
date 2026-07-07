import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { UserStateQuery } from 'src/app/global-states/user.state';
import { OperationSightingInvalidationDialogService } from 'src/app/shared/operation-sighting-invalidation-dialog/operation-sighting-invalidation-dialog.service';
import { OperationSightingRestorationDialogService } from 'src/app/shared/operation-sighting-restoration-dialog/operation-sighting-restoration-dialog.service';
import { OperationPastTimeService } from '../../services/operation-past-time.service';
import { OperationPastTimeStore } from '../../stores/operation-past-time.store';
import { OperationPastTimeTableComponent } from './operation-past-time-table.component';

describe('OperationPastTimeTableComponent', () => {
    let component: OperationPastTimeTableComponent;
    let fixture: ComponentFixture<OperationPastTimeTableComponent>;

    beforeEach(async () => {
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
                    useValue: { role$: of('viewer') },
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
});
