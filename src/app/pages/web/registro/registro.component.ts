import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth/auth.service';
import { BarraSuperiorComponent } from '../../../widgets/web/primero/barra-superior/barra-superior.component';
import { FranjaMarcaComponent } from '../../../widgets/web/primero/franja-marca/franja-marca.component';

@Component({
    selector: 'ed-web-registro',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, BarraSuperiorComponent, FranjaMarcaComponent],
    templateUrl: './registro.component.html',
    styleUrls: ['./registro.component.css']
})
export class RegistroComponent {
    private fb = inject(FormBuilder);
    private auth = inject(AuthService);
    private router = inject(Router);

    hide = true;
    form = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        nombre: ['', [Validators.required]],
        apellido: [''],                          // singular (tu DB)
        telefono: [''],
        direccion: [''],
        password: ['', [Validators.required, Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^\s]+$/)]],
    });

    get p() { return this.form.get('password')!; }
    toggle() { this.hide = !this.hide; }

    // Valor seguro de la contraseña (evita "possibly undefined")
    get pass(): string {
        return (this.form.get('password')?.value as string) || '';
    }

    // Reglas evaluadas en TS (no en el template)
    get reqLen(): boolean { return this.pass.length >= 8; }
    get reqLower(): boolean { return /[a-z]/.test(this.pass); }
    get reqUpper(): boolean { return /[A-Z]/.test(this.pass); }
    get reqNumber(): boolean { return /\d/.test(this.pass); }
    get reqNoSpace(): boolean { return !/\s/.test(this.pass); }


    submit() {
        if (this.form.invalid) return;
        const v = this.form.value;
        this.auth.register({
            nombre: v.nombre!, apellido: v.apellido || '', telefono: v.telefono || '',
            direccion: v.direccion || '', email: v.email!, contrasena: v.password!
        }).subscribe({
            next: () => this.router.navigateByUrl('/mis-compras'),
            error: (e) => console.error(e)
        });
    }
}
