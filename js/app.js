let coleccionGlobal = [];

document.addEventListener('DOMContentLoaded', () => {
    cargarCatalogoCompleto();
    configurarFiltros();
    configurarAuth();
});

// --- AUTENTICACIÓN ---
function configurarAuth() {
    const btnLogin = document.getElementById('btn-login');
    const panelCreacion = document.getElementById('panel-creacion');
    
    actualizarInterfazAdmin();

    btnLogin.addEventListener('click', async () => {
        const tokenActual = localStorage.getItem('numismatica_token');
        
        // Si ya estamos logueados, el botón sirve para cerrar sesión
        if (tokenActual) {
            localStorage.removeItem('numismatica_token');
            actualizarInterfazAdmin();
            renderizarCatalogo(coleccionGlobal); // Recargar para quitar papeleras
            return;
        }

        // Si no estamos logueados, pedimos contraseña
        const pass = prompt("Introduce la contraseña maestra:");
        if (!pass) return;

        try {
            const resp = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pass })
            });

            if (resp.ok) {
                const data = await resp.json();
                localStorage.setItem('numismatica_token', data.access_token);
                actualizarInterfazAdmin();
                renderizarCatalogo(coleccionGlobal); // Recargar para mostrar papeleras
            } else {
                alert("❌ Contraseña incorrecta");
            }
        } catch (error) {
            console.error("Error de login:", error);
        }
    });
}

function actualizarInterfazAdmin() {
    const btnLogin = document.getElementById('btn-login');
    const panelCreacion = document.getElementById('panel-creacion');
    const token = localStorage.getItem('numismatica_token');

    if (token) {
        btnLogin.textContent = "🔓 Cerrar Sesión";
        btnLogin.style.backgroundColor = "#e53e3e"; // Rojo
        panelCreacion.style.display = "block";
    } else {
        btnLogin.textContent = "🔒 Modo Admin";
        btnLogin.style.backgroundColor = "var(--text-primary)"; // Oscuro
        panelCreacion.style.display = "none";
    }
}

function getToken() {
    return localStorage.getItem('numismatica_token');
}

// --- CARGA Y RENDERIZADO ---
async function cargarCatalogoCompleto() {
    try {
        const [respMonedas, respBilletes] = await Promise.all([
            fetch('/api/monedas'),
            fetch('/api/billetes')
        ]);

        const monedas = respMonedas.ok ? await respMonedas.json() : [];
        const billetes = respBilletes.ok ? await respBilletes.json() : [];

        coleccionGlobal = [...monedas, ...billetes];
        renderizarCatalogo(coleccionGlobal);
    } catch (error) {
        console.error("Error al cargar la base de datos:", error);
    }
}

function renderizarCatalogo(items) {
    const contenedor = document.getElementById('galeria');
    contenedor.innerHTML = '';
    const esAdmin = !!getToken(); // Comprobar si somos admin

    if (items.length === 0) {
        contenedor.innerHTML = '<p class="sin-resultados">No hay piezas registradas.</p>';
        return;
    }

    items.forEach(item => {
        const tarjeta = document.createElement('article');
        tarjeta.className = 'tarjeta-moneda';

        const esMoneda = item.tipo === 'moneda';
        const detalleEspecifico = esMoneda 
            ? `<span><strong>Material:</strong> ${item.tecnica.material}</span>
               <span><strong>Peso:</strong> ${item.tecnica.peso_g} g</span>
               <span><strong>Diámetro:</strong> ${item.tecnica.diametro_mm} mm</span>`
            : `<span><strong>Material:</strong> ${item.tecnica.material}</span>
               <span><strong>Nº Serie:</strong> ${item.tecnica.numero_serie}</span>
               <span><strong>Emisión:</strong> ${item.identificacion.fecha_emision}</span>`;

        const subtitulo = esMoneda
            ? `${item.identificacion.epoca} · ${item.identificacion.ceca}`
            : `${item.identificacion.epoca} · Motivo: ${item.identificacion.motivo}`;

        const estrellas = esMoneda && item.identificacion.ano_estrellas?.length > 0
            ? ` *${item.identificacion.ano_estrellas.join(' *')}`
            : '';

        const valorAno = item.identificacion.ano_visible || item.identificacion.fecha_emision?.slice(0, 4) || '';

        // El botón de borrar SOLO se inyecta si eres admin
        const btnBorrar = esAdmin 
            ? `<button class="btn-eliminar" onclick="eliminarPieza('${item.id}', '${item.tipo}')">🗑️</button>` 
            : '';

        tarjeta.innerHTML = `
            <div class="imagenes-container">
                <img src="${item.multimedia.img_anverso}" alt="Anverso" loading="lazy" class="img-moneda" onerror="this.onerror=null; this.src='https://placehold.co/130x130/e2e8f0/718096?text=Anverso';">
                <img src="${item.multimedia.img_reverso}" alt="Reverso" loading="lazy" class="img-moneda" onerror="this.onerror=null; this.src='https://placehold.co/130x130/e2e8f0/718096?text=Reverso';">
            </div>
            <div class="info-container">
                <div class="cabecera-tarjeta">
                    <h2>${item.identificacion.valor_facial} (${valorAno})</h2>
                    <span class="badge-estado">${item.coleccionismo.estado}</span>
                </div>
                <p class="detalle-secundario">${subtitulo}${estrellas}</p>
                <div class="especificaciones">
                    ${detalleEspecifico}
                </div>
                <p class="notas">${item.notas || ''}</p>
                <div class="pie-tarjeta">
                    <span class="precio">${item.adquisicion.precio_eur.toFixed(2)} €</span>
                    <span class="id-tag">${item.id}</span>
                    ${btnBorrar}
                </div>
            </div>
        `;
        contenedor.appendChild(tarjeta);
    });
}

function configurarFiltros() {
    const header = document.querySelector('header');
    const navFiltros = document.createElement('div');
    navFiltros.className = 'filtros-container';
    navFiltros.innerHTML = `
        <button class="btn-filtro activo" data-filtro="todos">Todos</button>
        <button class="btn-filtro" data-filtro="moneda">Monedas</button>
        <button class="btn-filtro" data-filtro="billete">Billetes</button>
    `;
    header.appendChild(navFiltros);

    navFiltros.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelectorAll('.btn-filtro').forEach(b => b.classList.remove('activo'));
            e.target.classList.add('activo');

            const tipo = e.target.getAttribute('data-filtro');
            if (tipo === 'todos') {
                renderizarCatalogo(coleccionGlobal);
            } else {
                const filtrados = coleccionGlobal.filter(item => item.tipo === tipo);
                renderizarCatalogo(filtrados);
            }
        }
    });
}

// --- LÓGICA CRUD PROTEGIDA ---
document.getElementById('form-nueva-moneda').addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = getToken();
    if (!token) return alert("Debes iniciar sesión");

    const btnSubmit = e.target.querySelector('button');
    btnSubmit.textContent = 'Procesando...';
    btnSubmit.disabled = true;

    try {
        const fotoInput = document.getElementById('in-foto-anv');
        const formData = new FormData();
        formData.append('file', fotoInput.files[0]);

        // 1. Subir imagen (Añadimos el Token)
        const respFoto = await fetch('/api/upload-imagen', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        
        if (respFoto.status === 401) throw new Error("Sesión caducada");
        const dataFoto = await respFoto.json();
        if (dataFoto.error) throw new Error(dataFoto.error);

        const nuevaMoneda = {
            id: document.getElementById('in-id').value,
            tipo: "moneda",
            identificacion: {
                pais: "Desconocido",
                epoca: "Sin especificar",
                valor_facial: document.getElementById('in-valor').value,
                ano_visible: parseInt(document.getElementById('in-ano').value),
                ceca: "Sin especificar"
            },
            tecnica: { material: "Desconocido", peso_g: 0, diametro_mm: 0 },
            coleccionismo: { estado: "MBC" },
            adquisicion: {
                origen: "Panel Web",
                fecha_compra: new Date().toISOString().split('T')[0],
                precio_eur: parseFloat(document.getElementById('in-precio').value),
                gastos_envio_eur: 0
            },
            multimedia: { img_anverso: dataFoto.ruta_generada, img_reverso: "" },
            notas: "Añadida mediante el sistema web v2.0."
        };

        // 2. Guardar moneda (Añadimos el Token)
        const respGuardar = await fetch('/api/monedas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(nuevaMoneda)
        });

        if (respGuardar.ok) {
            alert('✅ ¡Pieza guardada!');
            e.target.reset();
            cargarCatalogoCompleto();
        } else {
            throw new Error("Error de autorización al guardar");
        }
        
    } catch (error) {
        console.error(error);
        alert(`❌ Error: ${error.message}`);
        if (error.message === "Sesión caducada") localStorage.removeItem('numismatica_token');
    } finally {
        btnSubmit.textContent = 'Procesar y Guardar Pieza';
        btnSubmit.disabled = false;
        actualizarInterfazAdmin();
    }
});

async function eliminarPieza(id, tipo) {
    const token = getToken();
    if (!token) return alert("Debes iniciar sesión");

    if (!confirm(`¿Eliminar la pieza con ID: ${id}?`)) return;

    try {
        const endpoint = tipo === 'moneda' ? `/api/monedas/${id}` : `/api/billetes/${id}`;
        const respuesta = await fetch(endpoint, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (respuesta.ok) {
            cargarCatalogoCompleto();
        } else {
            throw new Error(respuesta.status === 401 ? 'Sesión caducada' : 'Error en el servidor');
        }
    } catch (error) {
        console.error(error);
        alert(`❌ ${error.message}`);
        if (error.message === 'Sesión caducada') {
            localStorage.removeItem('numismatica_token');
            actualizarInterfazAdmin();
            renderizarCatalogo(coleccionGlobal);
        }
    }
}