const SUPABASE_URL = 'https://lczsedswyzhakjvefspn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_0ydAxpxrkkQq4ZAIDZhefA_d3rIiBNj';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let productos = [];

async function cargarProductos() {
  setSyncStatus('Cargando...');
  const { data, error } = await sb.from('productos').select('*').order('nombre');
  if (error) { setSyncStatus('Error: ' + error.message); return; }
  productos = data || [];
  render();
  setSyncStatus('Sincronizado ✓');
}

async function agregarProducto(e) {
  e.preventDefault();
  const p = {
    nombre: document.getElementById('nombre').value.trim(),
    categoria: document.getElementById('categoria').value.trim(),
    cantidad: parseInt(document.getElementById('cantidad').value) || 0,
    precio: parseFloat(document.getElementById('precio').value) || 0,
    minimo: parseInt(document.getElementById('minimo').value) || 0,
  };
  setSyncStatus('Guardando...');
  const { error } = await sb.from('productos').insert(p);
  if (error) return setSyncStatus('Error: ' + error.message);
  e.target.reset();
  await cargarProductos();
}

async function eliminarProducto(id) {
  if (!confirm('¿Eliminar este producto?')) return;
  setSyncStatus('Eliminando...');
  const { error } = await sb.from('productos').delete().eq('id', id);
  if (error) return setSyncStatus('Error: ' + error.message);
  await cargarProductos();
}

async function ajustarStock(id, delta) {
  const prod = productos.find(x => x.id === id);
  const nuevaCantidad = Math.max(0, (prod.cantidad || 0) + delta);
  const { error } = await sb.from('productos').update({ cantidad: nuevaCantidad }).eq('id', id);
  if (error) return setSyncStatus('Error: ' + error.message);
  await cargarProductos();
}

function statusBadge(p) {
  if (p.cantidad === 0) return '<span class="status-badge empty">Agotado</span>';
  if (p.cantidad <= (p.minimo || 0)) return '<span class="status-badge low">Bajo stock</span>';
  return '<span class="status-badge ok">OK</span>';
}

function render() {
  const q = (document.getElementById('buscar').value || '').toLowerCase();
  const filtrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(q) || (p.categoria || '').toLowerCase().includes(q));
  document.getElementById('stat-total').textContent = productos.length;
  document.getElementById('stat-valor').textContent = '$' + productos.reduce((s, p) => s + (p.cantidad * p.precio), 0).toFixed(2);
  document.getElementById('stat-bajos').textContent = productos.filter(p => p.cantidad <= (p.minimo || 0)).length;
  const tbody = document.getElementById('tabla-body');
  if (!filtrados.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty-msg">Sin productos</td></tr>'; return; }
  tbody.innerHTML = filtrados.map(p => `
    <tr>
      <td><strong>${esc(p.nombre)}</strong></td>
      <td>${esc(p.categoria || '—')}</td>
      <td>$${(p.precio || 0).toFixed(2)}</td>
      <td><button class="btn-edit" onclick="ajustarStock(${p.id}, -1)">−</button> <strong> ${p.cantidad} </strong> <button class="btn-edit" onclick="ajustarStock(${p.id}, 1)">+</button></td>
      <td>${statusBadge(p)}</td>
      <td><button class="btn-danger" onclick="eliminarProducto(${p.id})">✕</button></td>
    </tr>`).join('');
}

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function setSyncStatus(msg) { document.getElementById('sync-status').textContent = msg; }

document.getElementById('form-producto').addEventListener('submit', agregarProducto);
document.getElementById('buscar').addEventListener('input', render);

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');

cargarProductos();

sb.channel('productos-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, cargarProductos)
  .subscribe();
