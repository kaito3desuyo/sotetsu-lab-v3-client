import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SidenavComponent } from './sidenav.component';

describe('SidenavComponent', () => {
    let component: SidenavComponent;
    let fixture: ComponentFixture<SidenavComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SidenavComponent],
            providers: [provideRouter([])],
        }).compileComponents();

        fixture = TestBed.createComponent(SidenavComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('駅を選ばなければ上り/下りの行き先は「全線時刻表」と書く', () => {
        expect(component.timetableLinkPrefix()).toBe('全線時刻表');
    });

    it('一覧に無い駅が選ばれたら「駅別時刻表」と書く', () => {
        component.stationId.setValue('unknown-station');
        expect(component.timetableLinkPrefix()).toBe('駅別時刻表');
    });
});
