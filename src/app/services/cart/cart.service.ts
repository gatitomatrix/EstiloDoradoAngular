import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { CartItem } from '../../models/cart/cart-item';
import { AuthService } from '../auth/auth.service';

/**
 * Comportamiento:
 *  - Invitado: usa sessionStorage ('ed_cart_guest') -> se vacía al cerrar/abrir la app.
 *  - Usuario:  usa localStorage por usuario ('ed_cart_user_<id_cliente>') -> persistente por cuenta.
 *  - En login:  NO se migra lo del invitado (se descarta). Se carga el carrito propio del usuario.
 *  - En logout: se guarda el carrito del usuario y se inicializa un carrito invitado vacío.
 */

type Mode = 'guest' | 'user';

const GUEST_KEY = 'ed_cart_guest';
const USER_KEY_PREFIX = 'ed_cart_user_';



@Injectable({ providedIn: 'root' })
export class CartService {
  private auth = inject(AuthService);

  private _items$ = new BehaviorSubject<CartItem[]>([]);
  public  items$  = this._items$.asObservable();

  private mode: Mode = 'guest';
  private currentUserId: number | null = null;
  private sub?: Subscription;

  constructor() {
    // Init según el estado actual del AuthService
    const u = this.auth.user;
    if (u) {
      this.mode = 'user';
      this.currentUserId = u.id_cliente;
      this._items$.next(this.readUser(u.id_cliente));
    } else {
      this.mode = 'guest';
      this.currentUserId = null;
      this._items$.next(this.readGuest());
    }

    // Reaccionar a cambios de sesión (login / logout / cambio de usuario)
    this.sub = this.auth.user$.subscribe((user) => {
      const prevMode = this.mode;
      const prevUserId = this.currentUserId;

      if (!prevUserId && user) {
        // LOGIN (guest -> user)
        this.writeGuest([]); // descarta el carrito invitado
        this.mode = 'user';
        this.currentUserId = user.id_cliente;
        this._items$.next(this.readUser(user.id_cliente));
        return;
      }

      if (prevUserId && !user) {
        // LOGOUT (user -> guest)
        // persiste el carrito del usuario actual antes de salir
        this.writeUser(prevUserId, this._items$.value);
        this.mode = 'guest';
        this.currentUserId = null;
        this.writeGuest([]); // carrito invitado comienza vacío
        this._items$.next([]);
        return;
      }

      if (prevUserId && user && user.id_cliente !== prevUserId) {
        // CAMBIO DE USUARIO (user A -> user B)
        this.writeUser(prevUserId, this._items$.value);
        this.mode = 'user';
        this.currentUserId = user.id_cliente;
        this._items$.next(this.readUser(user.id_cliente));
        return;
      }

      // Si no cambió nada relevante, no hacemos nada.
    });
  }

  // --- API pública (igual que antes) ----------------------------------------

  /** Snapshot actual */
  get items(): CartItem[] { return this._items$.value; }

  getItems() {
    return this.items; // devuelve this._items$.value, que ya está tipado
  }

  add(item: CartItem) {
    const list = [...this._items$.getValue()];
    const idx = list.findIndex(x => x.id === item.id);

    if (idx >= 0) {
      const current = list[idx];
      const nuevaQty = Math.min(current.qty + item.qty, current.stockMax);
      list[idx] = { ...current, qty: nuevaQty };
    } else {
      list.push({ ...item, qty: Math.min(item.qty, item.stockMax) });
    }

    this.updateAndPersist(list);
  }

  updateQty(id: CartItem['id'], qty: number) {
    const safeQty = Math.max(1, qty);
    const list = this.items.map(x =>
      x.id === id ? { ...x, qty: Math.min(safeQty, x.stockMax) } : x
    );
    this.updateAndPersist(list);
  }

  remove(id: CartItem['id']) {
    const list = this.items.filter(x => x.id !== id);
    this.updateAndPersist(list);
  }

  clear() {
    this.updateAndPersist([]);
  }

  getSubtotal(): number {
    return this.items.reduce((acc, x) => acc + x.precio * x.qty, 0);
  }

  // --- Persistencia según modo ----------------------------------------------

  private updateAndPersist(list: CartItem[]) {
    this._items$.next(list);
    try {
      if (this.mode === 'guest') {
        this.writeGuest(list);
      } else if (this.mode === 'user' && this.currentUserId != null) {
        this.writeUser(this.currentUserId, list);
      }
    } catch (e) {
      // Si storage falla (quota, private mode), al menos mantenemos en memoria.
      console.warn('Cart storage error:', e);
    }
  }

  private readGuest(): CartItem[] {
    try {
      const raw = sessionStorage.getItem(GUEST_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  private writeGuest(items: CartItem[]) {
    try {
      sessionStorage.setItem(GUEST_KEY, JSON.stringify(items));
    } catch { /* noop */ }
  }

  private keyForUser(userId: number) {
    return `${USER_KEY_PREFIX}${userId}`;
  }

  private readUser(userId: number): CartItem[] {
    try {
      const raw = localStorage.getItem(this.keyForUser(userId));
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  private writeUser(userId: number, items: CartItem[]) {
    try {
      localStorage.setItem(this.keyForUser(userId), JSON.stringify(items));
    } catch { /* noop */ }
  }

  // --- Limpieza --------------------------------------------------------------

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
