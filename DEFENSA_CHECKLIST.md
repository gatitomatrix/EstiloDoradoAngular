# Checklist de defensa — Estilo Dorado (local)

Usa este guion de ~10 minutos. Todo corre en **local** (Laravel `:8000`, Angular `:4200`, emulador Android).

## Antes de empezar

1. Laravel: `php artisan serve --host=0.0.0.0 --port=8000`
2. Angular: `npm start` → `http://localhost:4200`
3. Móvil: `flutter run` (API default `http://10.0.2.2:8000/api`)
4. `git pull` en **Laravel**, **Angular** y **Móvil**

## Demo cliente (web o móvil) — 5 min

| Paso | Qué mostrar |
|------|-------------|
| 1 | Catálogo + **búsqueda** de un producto |
| 2 | Agregar al carrito → toast / snackbar “agregado” |
| 3 | Límite de stock (no pasar del disponible) |
| 4 | Login (email o **Google demo local**) y carrito se mantiene |
| 5 | Entrega: recojo tienda **o** express + mapa |
| 6 | Pago ficticio → pantalla de éxito |
| 7 | Mis compras → detalle / cancelar si pendiente |

## Demo admin (solo web) — 3 min

| Paso | Qué mostrar |
|------|-------------|
| 1 | `/admin/login` con empleado |
| 2 | Dashboard: **clic en KPI** (Pendientes / Pagados) |
| 3 | Pedidos filtrados + badge de estado |
| 4 | Reportes: descargar **CSV**, **Excel** y **PDF** |

## Credenciales / notas locales

- **Admin:** email de la tabla `empleados` (tu BD local)
- **Cliente:** registro normal o **Continuar con Google** (modo demo sin Client ID)
- **Google real (opcional):** `GOOGLE_CLIENT_ID` en Laravel `.env` + `googleClientId` en `environment.ts`
- **Culqi:** modo prueba / ficticio (no produce cargos reales)

## Frases útiles si preguntan

- “Los pagos y SUNAT están en entorno de prueba; el delay es normal por emisión de comprobante.”
- “El panel admin vive en la web; la app móvil es solo cliente, según el alcance del informe.”
- “Reportes sirven para control de clientes, stock y ventas del negocio.”

## No hacer en la defensa

- No entrar a rutas admin en la app móvil
- No usar `flutter clean` a menos que falle el build
- No apuntar a producción todavía (fase local)
