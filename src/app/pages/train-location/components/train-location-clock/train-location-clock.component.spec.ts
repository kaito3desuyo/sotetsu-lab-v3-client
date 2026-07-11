import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrainLocationClockComponent } from './train-location-clock.component';

describe('TrainLocationClockComponent', () => {
    let component: TrainLocationClockComponent;
    let fixture: ComponentFixture<TrainLocationClockComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TrainLocationClockComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(TrainLocationClockComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    it('mode="now" のとき時刻入力を表示しない', () => {
        fixture.componentRef.setInput('mode', 'now');
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('input')).toBeNull();
    });

    it('mode="specified" のとき時刻入力を表示する', () => {
        fixture.componentRef.setInput('mode', 'specified');
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('input[type="time"]')).not.toBeNull();
    });

    it('時刻入力は mat-form-field でラップされ matInput が付与される（Material デザイン）', () => {
        fixture.componentRef.setInput('mode', 'specified');
        fixture.detectChanges();

        const formField = fixture.nativeElement.querySelector('mat-form-field');
        expect(formField).not.toBeNull();
        const input = formField.querySelector('input[type="time"]');
        expect(input).not.toBeNull();
        expect(input.classList.contains('mat-mdc-input-element')).toBe(true);
    });

    it('onTimeInputChange: 入力値を emit する', () => {
        const spy = jest.spyOn(component.timeInputValueChange, 'emit');
        component.onTimeInputChange('07:30');
        expect(spy).toHaveBeenCalledWith('07:30');
    });

    it('mode="now" と "specified" で description が異なる', () => {
        fixture.componentRef.setInput('mode', 'now');
        expect(component.description()).toContain('現在時刻');

        fixture.componentRef.setInput('mode', 'specified');
        expect(component.description()).toContain('指定時刻');
    });
});
