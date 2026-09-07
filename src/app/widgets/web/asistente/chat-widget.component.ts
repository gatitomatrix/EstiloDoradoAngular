import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription, filter } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AsistenteService, AsistenteProducto, AsistenteAction, AsistenteReply, AsistentePedidoChip, AsistenteComplaint } from '../../../services/asistente/asistente.service';
import { CartService } from '../../../services/cart/cart.service';
import { UiService } from '../../../core/services/ui.service';
import { AuthService } from '../../../services/auth/auth.service';
import { GoogleAuthService } from '../../../core/services/google-auth.service';

interface ChatMsg {
  from: 'user' | 'bot';
  text: string;
  products?: AsistenteProducto[];
  action?: AsistenteAction | null;
  actions?: AsistenteAction[];
  pedidos?: AsistentePedidoChip[];
}

interface OrderViewItem {
  nombre: string;
  cantidad: number;
  imagen_url?: string | null;
  id?: number;
}

@Component({
  selector: 'ed-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-widget.component.html',
  styleUrls: ['./chat-widget.component.css'],
})
export class ChatWidgetComponent implements OnInit, OnDestroy {
  private api = inject(AsistenteService);
  private cart = inject(CartService);
  private ui = inject(UiService);
  private router = inject(Router);
  readonly auth = inject(AuthService);
  private http = inject(HttpClient);
  private googleAuth = inject(GoogleAuthService);

  @ViewChild('scroller') scroller?: ElementRef<HTMLDivElement>;

  visible = true;
  open = false;
  showHint = true;
  sending = false;
  draft = '';
  msgs: ChatMsg[] = [];
  suggestions: string[] = [];
  offered: AsistenteProducto[] = [];
  awaiting: string | null = null;
  complaint: AsistenteComplaint | null = null;
  showLogin = false;
  loginEmail = '';
  loginPass = '';
  loginErr = '';
  loginBusy = false;
  votes: Record<number, 'up' | 'down'> = {};
  readonly placeholderImg = '/assets/img/no-image.png';
  orderView: {
    id_pedido: number;
    total?: string | number;
    estado?: string;
    fecha?: string;
    items: OrderViewItem[];
  } | null = null;
  orderLoading = false;
  private sub?: Subscription;
  private authSub?: Subscription;
  private pausedForPago = false;
  private wasLoggedIn = false;
  private readonly storeKey = 'ed_dori_sesion';

  ngOnInit() {
    this.wasLoggedIn = this.auth.isLoggedIn;
    this.syncRoute(this.router.url);
    this.sub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.syncRoute(e.urlAfterRedirects));
    this.authSub = this.auth.user$.subscribe((u) => {
      const now = !!u;
      if (now && !this.wasLoggedIn) this.onLoggedInGuide();
      this.wasLoggedIn = now;
    });

    window.addEventListener('ed-open-asistente', this.openFromEvent);
    if (!this.restore()) {
      this.msgs = [
        {
          from: 'bot',
          text: 'Hola, soy Dori. ¿Te ayudo a elegir un regalo? Dime qué buscas o para quién es.',
        },
      ];
    }
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.authSub?.unsubscribe();
    window.removeEventListener('ed-open-asistente', this.openFromEvent);
  }

  private openFromEvent = () => this.toggle(true);

  private syncRoute(url: string) {
    const path = (url || '').split('?')[0];
    this.visible = !path.startsWith('/panel-ed-k7m2');
    const enPago = /\/pago|culqi|pagar-pedido/.test(path);
    if (!this.visible) {
      this.open = false;
      return;
    }
    if (enPago) {
      if (this.open) this.pausedForPago = true;
      this.open = false;
    } else if (this.pausedForPago) {
      this.open = true;
      this.pausedForPago = false;
      this.persist();
    }
  }

  toggle(force?: boolean) {
    this.open = force ?? !this.open;
    if (this.open) {
      this.showHint = false;
      this.pausedForPago = false;
      setTimeout(() => this.scroll(), 50);
    }
    this.persist();
  }

  hideHint(ev?: Event) {
    ev?.stopPropagation();
    this.showHint = false;
  }

  send(preset?: string) {
    const text = (preset ?? this.draft).trim();
    if (!text || this.sending) return;
    this.draft = '';
    this.msgs.push({ from: 'user', text });
    this.sending = true;
    this.scroll();

    const ids = this.offered.map((p) => p.id).filter(Boolean);
    this.api.send(text, ids, this.awaiting, this.complaint).subscribe({
      next: (res: AsistenteReply) => {
        if (res.products?.length) this.offered = res.products;
        this.awaiting = res.awaiting || null;
        this.complaint = res.complaint || this.complaint;
        this.msgs.push({
          from: 'bot',
          text: res.reply || '…',
          products: res.products || [],
          action: res.action,
          actions: res.actions?.length ? res.actions : (res.action ? [res.action] : []),
          pedidos: res.pedidos || [],
        });
        if (res.actions?.some((a) => a.type === 'login') || res.action?.type === 'login') {
          this.showLogin = true;
        }
        this.sending = false;
        this.scroll();
        this.persist();
      },
      error: (err: { error?: { reply?: string; message?: string } }) => {
        const msg =
          err?.error?.reply ||
          err?.error?.message ||
          'No pude consultar a Dori. ¿Laravel está en marcha y Gemini tiene la API key?';
        this.msgs.push({ from: 'bot', text: msg });
        this.sending = false;
        this.scroll();
      },
    });
  }

  askConfirm(p: AsistenteProducto) {
    if ((p.stock ?? 0) < 1) {
      this.ui.warn(`${p.nombre} está agotado`);
      return;
    }
    this.msgs.push({
      from: 'bot',
      text: `¿Agrego ${p.nombre} × 1 (S/ ${Number(p.precio).toFixed(2)}) al carrito?`,
      action: {
        type: 'confirm_add',
        id: p.id,
        qty: 1,
        nombre: p.nombre,
        precio: Number(p.precio),
        stock: p.stock,
        imagen_url: p.imagen_url,
      },
    });
    this.scroll();
  }

  confirmAdd(a: AsistenteAction) {
    if (!a?.id) return;
    const stock = a.stock ?? 0;
    if (stock < 1) {
      this.ui.warn('Producto agotado');
      return;
    }
    this.cart.add({
      id: a.id,
      nombre: a.nombre || 'Producto',
      imagen: a.imagen_url || null,
      precio: Number(a.precio || 0),
      qty: Math.min(a.qty || 1, stock),
      stockMax: stock,
    });
    this.msgs.push({
      from: 'bot',
      text: `${a.nombre} se agregó al carrito. Siguiente: carrito → entrega (recojo o envío) → pago. Si aún no inicias sesión, te lo pediremos al pagar. Yo me quedo aquí.`,
    });
    this.ui.ok(`${a.nombre} agregado al carrito`, 'Carrito', { link: '/carrito', cta: 'Ver carrito' });
    this.http.post(`${environment.apiBaseUrl}/asistente/feedback`, { id_producto: a.id, voto: 'add' }).subscribe({ error: () => {} });
    this.scroll();
    this.persist();
  }

  decline() {
    this.msgs.push({ from: 'bot', text: 'Listo, no lo agregué. Elige otra opción cuando quieras.' });
    this.scroll();
  }

  goProduct(id: number) {
    this.router.navigate(['/producto', id]);
  }

  goCart() {
    this.open = true;
    this.persist();
    this.router.navigateByUrl('/carrito');
  }

  vote(p: AsistenteProducto, voto: 'up' | 'down') {
    if (!p?.id || this.votes[p.id] === voto) return;
    this.votes[p.id] = voto;
    this.http.post(`${environment.apiBaseUrl}/asistente/feedback`, { id_producto: p.id, voto }).subscribe({ error: () => {} });
  }

  imgOf(url?: string | null): string {
    return url?.trim() || this.placeholderImg;
  }

  onImgError(ev: Event) {
    const el = ev.target as HTMLImageElement | null;
    if (el && el.src !== this.placeholderImg) el.src = this.placeholderImg;
  }

  viewOrder(o: AsistentePedidoChip) {
    this.orderLoading = true;
    const seed: OrderViewItem[] = o.resumen
      ? [{ nombre: o.resumen, cantidad: 1, imagen_url: o.imagen_url || null }]
      : [];
    this.orderView = {
      id_pedido: o.id_pedido,
      total: o.total,
      estado: o.estado,
      fecha: o.fecha,
      items: seed,
    };
    this.http.get<any>(`${environment.apiBaseUrl}/mis-pedidos/${o.id_pedido}`).subscribe({
      next: (p) => {
        const raw = p?.detalles ?? p?.data?.detalles ?? [];
        const dets = Array.isArray(raw) ? raw : [];
        const items = dets.length
          ? dets.map((d: {
              nombre?: string;
              cantidad?: number;
              imagen_url?: string;
              producto?: { nombre?: string; imagen?: string; imagen_url?: string; id_producto?: number; id?: number };
              Producto?: { nombre?: string; imagen?: string; imagen_url?: string; id_producto?: number; id?: number };
            }) => {
              const prod = d.producto || d.Producto || {};
              return {
                nombre: prod.nombre || d.nombre || 'Ítem',
                cantidad: Number(d.cantidad ?? 1) || 1,
                imagen_url: prod.imagen_url || prod.imagen || d.imagen_url || o.imagen_url || null,
                id: prod.id_producto || prod.id,
              } as OrderViewItem;
            })
          : seed;
        this.orderView = {
          id_pedido: p.id_pedido ?? p?.data?.id_pedido ?? o.id_pedido,
          total: p.total ?? p?.data?.total ?? o.total,
          estado: p.estado ?? p?.data?.estado ?? o.estado,
          fecha: o.fecha,
          items,
        };
        this.orderLoading = false;
      },
      error: () => { this.orderLoading = false; },
    });
  }

  doLogin() {
    this.loginErr = '';
    if (!this.loginEmail.trim() || !this.loginPass) {
      this.loginErr = 'Correo y contraseña, o usa Google.';
      return;
    }
    this.loginBusy = true;
    this.auth.login(this.loginEmail.trim(), this.loginPass).subscribe({
      next: () => this.afterChatLogin(),
      error: (e: { error?: { message?: string } }) => {
        this.loginBusy = false;
        this.loginErr = e?.error?.message || 'Correo o contraseña incorrectos. Si te registraste con Google, usa ese botón.';
      },
    });
  }

  async doGoogleLogin() {
    this.loginErr = '';
    this.loginBusy = true;
    try {
      if (!this.googleAuth.configured) {
        this.loginBusy = false;
        this.loginErr = 'Google no está configurado en este entorno.';
        return;
      }
      const tokens = await this.googleAuth.signIn();
      this.http.post<any>(`${environment.apiBaseUrl}/auth/google`, tokens).subscribe({
        next: (res) => {
          this.auth.applyExternalLogin(res);
          this.afterChatLogin();
        },
        error: (e: { error?: { message?: string } }) => {
          this.loginBusy = false;
          this.loginErr = e?.error?.message || 'No pude entrar con Google';
        },
      });
    } catch (e: any) {
      this.loginBusy = false;
      this.loginErr = e?.message || 'Google cancelado';
    }
  }

  private afterChatLogin() {
    this.loginBusy = false;
    this.showLogin = false;
    this.open = true;
    this.persist();
  }

  private onLoggedInGuide() {
    this.open = true;
    this.msgs.push({
      from: 'bot',
      text: 'Listo, ya estás dentro. Puedes agregar al carrito, elegir recojo o envío y pagar. Sigo en esta ventana; en el pago me minimizo para no tapar Culqi o Yape.',
    });
    this.persist();
    this.scroll();
  }

  private persist() {
    try {
      sessionStorage.setItem(this.storeKey, JSON.stringify({
        msgs: this.msgs.slice(-40),
        offered: this.offered,
        awaiting: this.awaiting,
        complaint: this.complaint,
        open: this.open,
      }));
    } catch { /* cuota */ }
  }

  private restore(): boolean {
    try {
      const raw = sessionStorage.getItem(this.storeKey);
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (!Array.isArray(d?.msgs) || !d.msgs.length) return false;
      this.msgs = d.msgs;
      this.offered = d.offered || [];
      this.awaiting = d.awaiting || null;
      this.complaint = d.complaint || null;
      this.open = !!d.open;
      return true;
    } catch {
      return false;
    }
  }

  private scroll() {
    setTimeout(() => {
      const el = this.scroller?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 40);
  }
}
