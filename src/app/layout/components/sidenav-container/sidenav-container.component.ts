import { Component, OnInit } from '@angular/core';
import { SidenavService } from '../../services/sidenav.service';

@Component({
  selector: 'app-sidenav-container',
  templateUrl: './sidenav-container.component.html',
  styleUrls: ['./sidenav-container.component.scss']
})
export class SidenavContainerComponent implements OnInit {
  sidenavState$ = this.sidenavService.getState();
  sidenavState = false;

  constructor(private sidenavService: SidenavService) {}

  ngOnInit() {
    this.sidenavState$.subscribe(bool => {
      this.sidenavState = bool;
    });
  }
}
