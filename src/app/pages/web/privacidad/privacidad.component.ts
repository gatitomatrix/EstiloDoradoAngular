import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BarraSuperiorComponent } from '../../../widgets/web/primero/barra-superior/barra-superior.component';
import { FranjaMarcaComponent } from '../../../widgets/web/primero/franja-marca/franja-marca.component';

@Component({
  selector: 'ed-web-privacidad',
  standalone: true,
  imports: [CommonModule, RouterLink, BarraSuperiorComponent, FranjaMarcaComponent],
  templateUrl: './privacidad.component.html',
  styles: [`
    .ed-legal { max-width: 760px; margin: 16px auto 48px; padding: 0 16px; }
    .ed-legal h1 { font-size: 1.6rem; font-weight: 800; margin-bottom: 8px; }
    .ed-legal h2 { font-size: 1.05rem; font-weight: 700; margin: 22px 0 8px; }
    .ed-legal p, .ed-legal li { color: #4a4033; line-height: 1.55; }
    .ed-legal ul { padding-left: 1.2rem; }
  `],
})
export class PrivacidadComponent {}
