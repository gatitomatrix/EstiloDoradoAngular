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

  @ViewChild('scroller') scroller?: ElementRef<HTMLDivElement>;

  visible = true;
  open = false;
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

  ngOnInit() {
    this.syncRoute(this.router.url);
    this.sub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.syncRoute(e.urlAfterRedirects));

    window.addEventListener('ed-open-asistente', this.openFromEvent);
    this.msgs = [
      {
        from: 'bot',
        text: 'Hola, soy Dori, tu asistente de Estilo Dorado. Dime qué buscas o para quién es el regalo (cumpleaños, papá, novia…) y te muestro opciones del catálogo.',
      },
    ];
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    window.removeEventListener('ed-open-asistente', this.openFromEvent);
  }

  private openFromEvent = () => this.toggle(true);

  private syncRoute(url: string) {
    this.visible = !url.startsWith('/admin');
    if (!this.visible) this.open = false;
  }

  toggle(force?: boolean) {
    this.open = force ?? !this.open;
    if (this.open) setTimeout(() => this.scroll(), 50);
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
      text: `${a.nombre} se agregó al carrito. Puedes seguir comprando o ir al carrito.`,
    });
    this.ui.ok(`${a.nombre} agregado al carrito`, 'Carrito', { link: '/carrito', cta: 'Ver carrito' });
    this.scroll();
  }

  decline() {
    this.msgs.push({ from: 'bot', text: 'Listo, no lo agregué. Elige otra opción cuando quieras.' });
    this.scroll();
  }

  goProduct(id: number) {
    this.router.navigate(['/producto', id]);
  }

  goCart() {
    this.open = false;
    this.router.navigateByUrl('/carrito');
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
      this.loginErr = 'Correo y contraseña';
      return;
    }
    this.loginBusy = true;
    this.auth.login(this.loginEmail.trim(), this.loginPass).subscribe({
      next: () => {
        this.loginBusy = false;
        this.showLogin = false;
        this.send('ya inicié sesión');
      },
      error: (e: { error?: { message?: string } }) => {
        this.loginBusy = false;
        this.loginErr = e?.error?.message || 'No pude iniciar sesión';
      },
    });
  }

  private scroll() {
    setTimeout(() => {
      const el = this.scroller?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 40);
  }
}
