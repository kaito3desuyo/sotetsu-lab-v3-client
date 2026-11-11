import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LibraryVehicleComponent } from './library-vehicle.component';

describe('LibraryVehicleComponent', () => {
    let component: LibraryVehicleComponent;
    let fixture: ComponentFixture<LibraryVehicleComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [LibraryVehicleComponent],
            providers: [provideRouter([])],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(LibraryVehicleComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('生きている編成の編成番号だけが編成別時刻表へのリンクになる', () => {
        const root = fixture.nativeElement as HTMLElement;
        const links = root.querySelectorAll('table.formation a');

        expect(links).toHaveLength(47);
        expect(
            root.querySelector(
                'td.right-controller > a[href="/timetable/formation;formation_number=8713"]',
            ),
        ).not.toBeNull();
        // 廃車済みの編成はリンクにしない
        expect(
            root.querySelector('a[href$="formation_number=8701"]'),
        ).toBeNull();
    });
});
