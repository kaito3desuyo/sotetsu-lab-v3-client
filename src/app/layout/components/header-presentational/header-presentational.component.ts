import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { SidenavService } from '../../services/sidenav.service';

@Component({
  selector: 'app-header-presentational',
  templateUrl: './header-presentational.component.html',
  styleUrls: ['./header-presentational.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderPresentationalComponent implements OnInit {
  sidenavState$ = this.sidenavService.getState();
  sidenavState: boolean;

  constructor(private sidenavService: SidenavService) {}

  ngOnInit() {
    this.sidenavState$.subscribe(bool => {
      this.sidenavState = bool;
    });
  }

  toggleSidenav() {
    console.log('サイドナビを開閉する');
    this.sidenavService.setState(!this.sidenavState);
  }
}
