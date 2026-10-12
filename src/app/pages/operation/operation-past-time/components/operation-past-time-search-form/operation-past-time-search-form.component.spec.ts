import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { OperationPastTimeStore } from '../../stores/operation-past-time.store';
import { OperationPastTimeSearchFormComponent } from './operation-past-time-search-form.component';

describe('OperationPastTimeSearchFormComponent', () => {
    let component: OperationPastTimeSearchFormComponent;
    let fixture: ComponentFixture<OperationPastTimeSearchFormComponent>;
    let navigate: jest.Mock;

    beforeEach(async () => {
        navigate = jest.fn();

        await TestBed.configureTestingModule({
            imports: [OperationPastTimeSearchFormComponent],
            providers: [{ provide: Router, useValue: { navigate } }],
        })
            .overrideComponent(OperationPastTimeSearchFormComponent, {
                set: { template: '', imports: [] },
            })
            .compileComponents();

        OperationPastTimeStore.setReferenceDate('2026-10-08');
        OperationPastTimeStore.setDays(7);
        OperationPastTimeStore.setIncludeInvalidated(false);

        fixture = TestBed.createComponent(OperationPastTimeSearchFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('ストアの条件をフォームに入れ、空になればフォームも空にする', () => {
        expect(component.form.getRawValue()).toEqual({
            referenceDate: new Date(2026, 9, 8),
            days: 7,
            includeInvalidated: false,
        });

        OperationPastTimeStore.setReferenceDate(null);
        OperationPastTimeStore.setDays(null);
        OperationPastTimeStore.setIncludeInvalidated(true);
        fixture.detectChanges();

        expect(component.form.getRawValue()).toEqual({
            referenceDate: null,
            days: null,
            includeInvalidated: true,
        });
    });

    it('条件で検索画面に移り、無効化を含めないときはその条件を付けない', () => {
        component.onClickSearch();

        expect(navigate).toHaveBeenCalledWith([
            'operation',
            'past-time',
            { reference_date: '2026-10-08', days: 7 },
        ]);
    });

    it('無効化を含めるときだけ include_invalidated を付ける', () => {
        component.form.patchValue({ includeInvalidated: true });

        component.onClickSearch();

        expect(navigate).toHaveBeenCalledWith([
            'operation',
            'past-time',
            {
                reference_date: '2026-10-08',
                days: 7,
                include_invalidated: true,
            },
        ]);
    });

    it('日数が範囲外なら移らない', () => {
        component.form.patchValue({ days: 31 });

        component.onClickSearch();

        expect(navigate).not.toHaveBeenCalled();
    });
});
