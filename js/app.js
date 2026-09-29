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

    btnLogin.style.color = "white"; // Aseguramos que el texto sea blanco

    if (token) {
        btnLogin.textContent = "🔓 Cerrar Sesión";
        btnLogin.style.backgroundColor = "#6d5f4d"; // Bronce oscuro
        panelCreacion.style.display = "block";
    } else {
        btnLogin.textContent = "🔒 Modo Admin";
        btnLogin.style.backgroundColor = "#8C7B65"; // Bronce normal
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
    const esAdmin = !!getToken();

    if (items.length === 0) {
        contenedor.innerHTML = '<p class="sin-resultados">No hay piezas que coincidan con la búsqueda.</p>';
        return;
    }

    items.forEach(item => {
        const tarjeta = document.createElement('article');
        tarjeta.className = 'tarjeta-moneda';
        tarjeta.setAttribute('onclick', `abrirDetalles('${item.id}')`);

        const esMoneda = item.tipo === 'moneda';
        
        // 1. Contexto Histórico
        const pais = item.identificacion.pais || 'Desconocido';
        const epoca = item.identificacion.epoca || 'Sin época';
        const subtitulo = `${pais} · ${epoca}`;

        // 2. Rasgo Distintivo (Material + Ceca/Motivo, sin estrellas)
        const rasgoDistintivo = esMoneda 
            ? `<span>${item.tecnica.material || 'Material desc.'}</span> • <span>${item.identificacion.ceca || 'Sin ceca'}</span>`
            : `<span>${item.tecnica.material || 'Material desc.'}</span> • <span>${item.identificacion.motivo || 'Sin motivo'}</span>`;

        const valorAno = item.identificacion.ano_visible || '-';

        // 3. Botón de borrar
        const btnBorrar = esAdmin 
            ? `<button class="btn-eliminar" onclick="event.stopPropagation(); eliminarPieza('${item.id}', '${item.tipo}')" title="Eliminar pieza">🗑️</button>` 
            : '';

        // Inyección de imágenes o placeholder
        const imgAnv = item.multimedia?.img_anverso 
            ? `<img class="img-moneda-recorte img-moneda" src="${item.multimedia.img_anverso}" alt="Anverso" onclick="event.stopPropagation(); abrirLightbox(this.src);">` 
            : `<div class="img-placeholder">Sin<br>anverso</div>`;
            
        const imgRev = item.multimedia?.img_reverso 
            ? `<img class="img-moneda-recorte img-moneda" src="${item.multimedia.img_reverso}" alt="Reverso" onclick="event.stopPropagation(); abrirLightbox(this.src);">` 
            : `<div class="img-placeholder">Sin<br>reverso</div>`;

        // El HTML con el título encima de las fotos (ajustando los padding inline)
        tarjeta.innerHTML = `
            <div class="cabecera-tarjeta" style="padding: 1.5rem 1.5rem 0 1.5rem; text-align: center;">
                <h2>${item.identificacion.valor_facial} (${valorAno})</h2>
            </div>
            <div class="imagenes-container">
                ${imgAnv}
                ${imgRev}
            </div>
            <div class="info-container" style="padding-top: 0.5rem;">
                <p class="detalle-secundario">${subtitulo}</p>
                <div class="especificaciones">
                    ${rasgoDistintivo}
                </div>
                <div class="pie-tarjeta">
                    <span class="id-tag">${item.id}</span>
                    <div style="display: flex; gap: 0.8rem; align-items: center;">
                        <span style="color: var(--accent-color); font-weight: bold; font-size: 0.9rem;">${item.coleccionismo.estado || '-'}</span>
                        ${btnBorrar}
                    </div>
                </div>
            </div>
        `;
        contenedor.appendChild(tarjeta);
    });
}

// --- LÓGICA DE BÚSQUEDA Y FILTROS ---
function configurarFiltros() {
    const sidebar = document.getElementById('sidebar-filtros');
    const btnToggle = document.getElementById('btn-toggle-filtros');
    const btnCerrar = document.getElementById('btn-cerrar-filtros');
    
    const inBusqueda = document.getElementById('in-busqueda');
    const btnAplicar = document.getElementById('btn-aplicar-filtros');
    const btnLimpiar = document.getElementById('btn-limpiar-filtros');
    const selectOrden = document.getElementById('filtro-orden');

    // 1. Abrir / Cerrar panel
    btnToggle.addEventListener('click', () => sidebar.style.right = '0');
    btnCerrar.addEventListener('click', () => sidebar.style.right = '-350px');

    // 2. Motor unificado de filtrado y ordenación
    function aplicarFiltros() {
        const textoLibre = inBusqueda.value.toLowerCase().trim();
        const tipo = document.getElementById('filtro-tipo').value;
        const pais = document.getElementById('filtro-pais').value.toLowerCase().trim();
        const estado = document.getElementById('filtro-estado').value;
        const anoMin = parseInt(document.getElementById('filtro-ano-min').value) || -Infinity;
        const anoMax = parseInt(document.getElementById('filtro-ano-max').value) || Infinity;
        const precioMin = parseFloat(document.getElementById('filtro-precio-min').value) || 0;
        const precioMax = parseFloat(document.getElementById('filtro-precio-max').value) || Infinity;
        const criterioOrden = selectOrden ? selectOrden.value : 'ano-asc';

        // Filtrar
        let resultados = coleccionGlobal.filter(item => {
            const campoBusqueda = `${item.id} ${item.identificacion.pais || ''} ${item.identificacion.epoca || ''} ${item.identificacion.valor_facial} ${item.identificacion.motivo || ''} ${item.identificacion.ano_visible || ''} ${item.identificacion.ceca || ''} ${item.notas || ''}`.toLowerCase();
            const pasaTexto = campoBusqueda.includes(textoLibre);

            const pasaTipo = (tipo === 'todos') || (item.tipo === tipo);
            const pasaPais = !pais || (item.identificacion.pais || '').toLowerCase().includes(pais);
            const pasaEstado = (estado === 'todos') || (item.coleccionismo.estado === estado);
            
            const anoPieza = item.identificacion.ano_visible;
            let pasaAno = true;
            if (anoMin !== -Infinity || anoMax !== Infinity) {
                if (!anoPieza) pasaAno = false; 
                else pasaAno = (anoPieza >= anoMin && anoPieza <= anoMax);
            }

            const precioPieza = item.adquisicion.precio_eur || 0;
            const pasaPrecio = (precioPieza >= precioMin && precioPieza <= precioMax);

            return pasaTexto && pasaTipo && pasaPais && pasaEstado && pasaAno && pasaPrecio;
        });

        // Ordenar
        resultados.sort((a, b) => {
            const anoA = a.identificacion.ano_visible ?? 9999;
            const anoB = b.identificacion.ano_visible ?? 9999;
            const paisA = (a.identificacion.pais || '').toLowerCase();
            const paisB = (b.identificacion.pais || '').toLowerCase();

            switch (criterioOrden) {
                case 'ano-asc':
                    return anoA - anoB;
                case 'ano-desc':
                    return anoB - anoA;
                case 'pais-asc':
                    return paisA.localeCompare(paisB);
                case 'pais-desc':
                    return paisB.localeCompare(paisA); // Invertimos A y B
                case 'id-asc':
                    return a.id.localeCompare(b.id);
                default:
                    return 0;
            }
        });

        renderizarCatalogo(resultados);
    }

    // Disparadores
    inBusqueda.addEventListener('input', aplicarFiltros);
    if (selectOrden) selectOrden.addEventListener('change', aplicarFiltros);
    
    btnAplicar.addEventListener('click', () => {
        aplicarFiltros();
        sidebar.style.right = '-350px'; 
    });
    
    btnLimpiar.addEventListener('click', () => {
        document.getElementById('filtro-tipo').value = 'todos';
        document.getElementById('filtro-pais').value = '';
        document.getElementById('filtro-estado').value = 'todos';
        document.getElementById('filtro-ano-min').value = '';
        document.getElementById('filtro-ano-max').value = '';
        document.getElementById('filtro-precio-min').value = '';
        document.getElementById('filtro-precio-max').value = '';
        if (selectOrden) selectOrden.value = 'ano-asc';
        inBusqueda.value = '';
        aplicarFiltros();
    });
}

// --- INTELIGENCIA DEL FORMULARIO ---
document.addEventListener('DOMContentLoaded', () => {
    const inTipo = document.getElementById('in-tipo');
    const grupoBillete = document.getElementById('grupo-billete');
    const inMaterial = document.getElementById('in-material');
    const inPeso = document.getElementById('in-peso');
    const inDiametro = document.getElementById('in-diametro');
    const inDimensiones = document.getElementById('in-dimensiones');
    const inSerie = document.getElementById('in-serie');

    if (inTipo) {
        inTipo.addEventListener('change', (e) => {
            const esBillete = e.target.value === 'billete';
            if(grupoBillete) grupoBillete.style.display = esBillete ? 'block' : 'none';
            if(inMaterial) inMaterial.style.display = esBillete ? 'none' : 'block';
            if(inPeso) inPeso.style.display = esBillete ? 'none' : 'block';
            if(inDiametro) inDiametro.style.display = esBillete ? 'none' : 'block';
            if(inDimensiones) inDimensiones.style.display = esBillete ? 'block' : 'none';
            if(inSerie) inSerie.style.display = esBillete ? 'block' : 'none';
        });
    }
});

// --- FUNCIÓN AUXILIAR PARA SUBIR FOTOS ---
async function subirFotoNube(file, token) {
    const formData = new FormData();
    formData.append("file", file);
    
    const res = await fetch("/api/upload-imagen", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
    });
    
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.ruta_generada;
}

// --- LÓGICA PRINCIPAL: GUARDAR PIEZA ---
document.getElementById('form-nueva-moneda').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const token = getToken(); // Usamos la función correcta
    if (!token) return alert("Debes iniciar sesión");

    const btnSubmit = e.target.querySelector('button[type="submit"]') || e.target.querySelector('button');
    btnSubmit.textContent = "⏳ Subiendo fotos y guardando...";
    btnSubmit.disabled = true;

    try {
        // 1. Subir Anverso (Obligatorio)
        const fileAnv = document.getElementById('in-foto-anv').files[0];
        const urlAnv = await subirFotoNube(fileAnv, token);

        // 2. Subir Reverso (Opcional)
        const fileRev = document.getElementById('in-foto-rev').files[0];
        let urlRev = null;
        if (fileRev) {
            urlRev = await subirFotoNube(fileRev, token);
        }

        // 3. Construir el objeto con TODOS los campos
        const nuevaPieza = {
            id: document.getElementById('in-id').value,
            tipo: document.getElementById('in-tipo').value,
            identificacion: {
                pais: document.getElementById('in-pais').value,
                epoca: document.getElementById('in-epoca').value,
                valor_facial: document.getElementById('in-valor').value,
                ano_visible: parseInt(document.getElementById('in-ano').value) || null,
                ceca: document.getElementById('in-ceca').value,
                motivo: document.getElementById('in-motivo').value
            },
            tecnica: {
                material: document.getElementById('in-material').value,
                peso_g: parseFloat(document.getElementById('in-peso').value) || null,
                diametro_mm: parseFloat(document.getElementById('in-diametro').value) || null,
                dimensiones: document.getElementById('in-dimensiones').value,
                numero_serie: document.getElementById('in-serie').value
            },
            coleccionismo: {
                estado: document.getElementById('in-estado').value
            },
            adquisicion: {
                precio_eur: parseFloat(document.getElementById('in-precio').value) || 0.0
            },
            multimedia: {
                img_anverso: urlAnv,
                img_reverso: urlRev
            },
            notas: document.getElementById('in-notas').value
        };

        // Si no se subió foto nueva, mantenemos la URL original (si estamos editando)
        if (idEdicionActual) {
            const piezaOriginal = coleccionGlobal.find(p => p.id === idEdicionActual);
            if (!fileAnv) nuevaPieza.multimedia.img_anverso = piezaOriginal.multimedia.img_anverso;
            if (!fileRev) nuevaPieza.multimedia.img_reverso = piezaOriginal.multimedia.img_reverso;
        }

        // 4. Enviar a la base de datos (Decidimos si es POST o PUT)
        const metodo = idEdicionActual ? "PUT" : "POST";
        const ruta = idEdicionActual ? `/api/piezas/${idEdicionActual}` : "/api/piezas";

        const resGuardar = await fetch(ruta, {
            method: metodo,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(nuevaPieza)
        });

        if (resGuardar.ok) {
            alert(idEdicionActual ? "✅ Pieza actualizada con éxito" : "✅ Pieza guardada con éxito");
            e.target.reset(); 
            window.location.reload(); 
        } else {
            const errData = await resGuardar.json();
            alert("❌ Error al guardar: " + errData.detail);
            if (resGuardar.status === 401) throw new Error("Sesión caducada");
        }

    } catch (error) {
        alert("❌ Error: " + error.message);
        if (error.message.includes("caducada")) {
            localStorage.removeItem('numismatica_token');
            actualizarInterfazAdmin();
        }
    } finally {
        btnSubmit.textContent = "Procesar y Guardar Pieza";
        btnSubmit.disabled = false;
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

// --- LÓGICA DEL LIGHTBOX (Corregida) ---
function abrirLightbox(src) {
    const lightbox = document.getElementById('lightbox');
    document.getElementById('lightbox-img').src = src;
    lightbox.classList.add('activo');
    document.body.style.overflow = 'hidden'; // Bloqueamos scroll
}

document.addEventListener('DOMContentLoaded', () => {
    const lightbox = document.getElementById('lightbox');
    const btnCerrar = document.getElementById('lightbox-cerrar');

    function cerrarLightbox() {
        lightbox.classList.remove('activo');
        
        // Magia: Solo restauramos el scroll si la ventana de detalles NO está abierta
        const modal = document.getElementById('modal-detalles');
        if (!modal || modal.style.display === 'none' || modal.style.display === '') {
            document.body.style.overflow = ''; 
        }
    }

    if(btnCerrar) btnCerrar.addEventListener('click', cerrarLightbox);

    if(lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) cerrarLightbox();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox && lightbox.classList.contains('activo')) {
            cerrarLightbox();
        }
    });
});

// --- LÓGICA DE LA VENTANA DE DETALLES ---
function abrirDetalles(id) {
    const pieza = coleccionGlobal.find(p => p.id === id);
    if (!pieza) return;

    const modal = document.getElementById('modal-detalles');
    const contenedor = document.getElementById('contenido-detalles');
    const esAdmin = !!getToken();
    const esMoneda = pieza.tipo === 'moneda';

    // 1. Imágenes (Sin círculos en la vista de detalle. Texto sutil si falta)
    const imgAnv = pieza.multimedia?.img_anverso 
        ? `<img class="img-moneda" src="${pieza.multimedia.img_anverso}" style="max-width: 100%; height: auto; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 1rem; cursor: zoom-in;" onclick="event.stopPropagation(); abrirLightbox(this.src);">` 
        : `<p style="color: #95A5A6; font-style: italic; font-size: 0.9rem; margin-bottom: 1rem;">(Sin imagen de anverso)</p>`;
        
    const imgRev = pieza.multimedia?.img_reverso 
        ? `<img class="img-moneda" src="${pieza.multimedia.img_reverso}" style="max-width: 100%; height: auto; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: zoom-in;" onclick="event.stopPropagation(); abrirLightbox(this.src);">` 
        : `<p style="color: #95A5A6; font-style: italic; font-size: 0.9rem;">(Sin imagen de reverso)</p>`;

    // 2. Técnica y Conservación (Solo campos reales de la BD)
    const especificaciones = esMoneda 
        ? `<li><strong>Material:</strong> ${pieza.tecnica.material || '-'}</li>
           <li><strong>Peso:</strong> ${pieza.tecnica.peso_g ? pieza.tecnica.peso_g + ' g' : '-'}</li>
           <li><strong>Diámetro:</strong> ${pieza.tecnica.diametro_mm ? pieza.tecnica.diametro_mm + ' mm' : '-'}</li>`
        : `<li><strong>Material:</strong> ${pieza.tecnica.material || '-'}</li>
           <li><strong>Dimensiones:</strong> ${pieza.tecnica.dimensiones || '-'}</li>
           <li><strong>Nº Serie:</strong> ${pieza.tecnica.numero_serie || '-'}</li>`;

    // 3. Adquisición
    const precio = (pieza.adquisicion && pieza.adquisicion.precio_eur) ? `${pieza.adquisicion.precio_eur.toFixed(2)} €` : '-';

    // Botón de edición reservado para administradores
    const btnEditar = esAdmin 
        ? `<button onclick="iniciarEdicion('${pieza.id}')" style="margin-top: 2rem; padding: 0.8rem; background: #8C7B65; color: white; border: none; border-radius: 4px; cursor: pointer; width: 100%; font-weight: bold; font-size: 1.1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: background 0.3s;">✏️ Modificar Datos de la Pieza</button>` 
        : '';

    // Inyección de HTML
    contenedor.innerHTML = `
        <!-- Etiqueta ID arriba a la izquierda -->
        <div style="position: absolute; top: 1.2rem; left: 1.5rem; font-family: monospace; font-size: 0.85rem; color: #7F8C8D; background: #F8F9FA; padding: 0.3rem 0.6rem; border-radius: 4px; border: 1px solid #E5E0D8;">
            Ref: ${pieza.id}
        </div>

        <h2 style="font-family: 'Georgia', serif; font-size: 2.2rem; margin-top: 1rem; color: #2C3E50; border-bottom: 2px solid #C5B79F; padding-bottom: 0.5rem; text-align: center;">
            ${pieza.identificacion.valor_facial} <span style="color: #8C7B65; font-size: 1.6rem;">(${pieza.identificacion.ano_visible || '-'})</span>
        </h2>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 3rem; margin-top: 2rem;">
            
            <!-- Columna Izquierda: Fotos -->
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: start;">
                ${imgAnv}
                ${imgRev}
            </div>
            
            <!-- Columna Derecha: Todos los Datos Reales -->
            <div>
                <!-- Histórica -->
                <h3 style="color: #8C7B65; margin-top: 0; font-family: 'Georgia', serif; border-bottom: 1px dashed #E5E0D8; padding-bottom: 0.3rem;">Identificación Histórica</h3>
                <ul style="list-style: none; padding: 0; margin: 0 0 1.5rem 0; line-height: 1.8; color: #34495E; font-size: 0.95rem;">
                    <li><strong>País:</strong> ${pieza.identificacion.pais || '-'}</li>
                    <li><strong>Época:</strong> ${pieza.identificacion.epoca || '-'}</li>
                    <li><strong>Ceca/Marca:</strong> ${pieza.identificacion.ceca || '-'}</li>
                    <li><strong>Motivo:</strong> ${pieza.identificacion.motivo || '-'}</li>
                </ul>

                <!-- Técnica y Conservación -->
                <h3 style="color: #8C7B65; font-family: 'Georgia', serif; border-bottom: 1px dashed #E5E0D8; padding-bottom: 0.3rem;">Detalles Técnicos y Conservación</h3>
                <ul style="list-style: none; padding: 0; margin: 0 0 1.5rem 0; line-height: 1.8; color: #34495E; font-size: 0.95rem;">
                    ${especificaciones}
                    <li><strong>Estado de Conservación:</strong> <span style="background: #E5E0D8; padding: 0.1rem 0.5rem; border-radius: 4px; font-weight: bold; color: #2C3E50;">${pieza.coleccionismo.estado || '-'}</span></li>
                </ul>

                <!-- Adquisición -->
                <h3 style="color: #8C7B65; font-family: 'Georgia', serif; border-bottom: 1px dashed #E5E0D8; padding-bottom: 0.3rem;">Procedencia y Adquisición</h3>
                <ul style="list-style: none; padding: 0; margin: 0 0 1.5rem 0; line-height: 1.8; color: #34495E; font-size: 0.95rem;">
                    <li><strong>Coste de la pieza:</strong> ${precio}</li>
                </ul>

                <!-- Notas -->
                <h3 style="color: #8C7B65; font-family: 'Georgia', serif; border-bottom: 1px dashed #E5E0D8; padding-bottom: 0.3rem;">Anotaciones Adicionales</h3>
                <p style="background: #FCFBF9; padding: 1rem; border-left: 4px solid #C5B79F; font-size: 0.95rem; color: #2C3E50; white-space: pre-wrap; font-style: italic; margin-top: 0.5rem;">${pieza.notas || 'Sin anotaciones.'}</p>
                
                ${btnEditar}
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; 
}

// Eventos para cerrar el modal
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modal-detalles');
    const btnCerrar = document.getElementById('btn-cerrar-modal');
    
    if (modal && btnCerrar) {
        btnCerrar.addEventListener('click', () => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                document.body.style.overflow = '';
            }
        });
    }
});

// Variable global para saber si estamos creando o editando
let idEdicionActual = null;

function iniciarEdicion(id) {
    const pieza = coleccionGlobal.find(p => p.id === id);
    if (!pieza) return;

    // 1. Cerrar el modal
    document.getElementById('modal-detalles').style.display = 'none';
    document.body.style.overflow = '';

    // 2. Rellenar el formulario con los datos de la pieza
    document.getElementById('in-id').value = pieza.id;
    document.getElementById('in-id').disabled = true; // Bloqueamos el ID para no romper la BD
    
    document.getElementById('in-tipo').value = pieza.tipo;
    document.getElementById('in-tipo').dispatchEvent(new Event('change')); // Dispara la lógica de ocultar/mostrar campos

    document.getElementById('in-pais').value = pieza.identificacion.pais || '';
    document.getElementById('in-epoca').value = pieza.identificacion.epoca || '';
    document.getElementById('in-valor').value = pieza.identificacion.valor_facial || '';
    document.getElementById('in-ano').value = pieza.identificacion.ano_visible || '';
    document.getElementById('in-ceca').value = pieza.identificacion.ceca || '';
    document.getElementById('in-motivo').value = pieza.identificacion.motivo || '';

    document.getElementById('in-material').value = pieza.tecnica.material || '';
    document.getElementById('in-peso').value = pieza.tecnica.peso_g || '';
    document.getElementById('in-diametro').value = pieza.tecnica.diametro_mm || '';
    document.getElementById('in-dimensiones').value = pieza.tecnica.dimensiones || '';
    document.getElementById('in-serie').value = pieza.tecnica.numero_serie || '';

    document.getElementById('in-estado').value = pieza.coleccionismo.estado || 'MBC';
    document.getElementById('in-precio').value = pieza.adquisicion.precio_eur || '';
    document.getElementById('in-notas').value = pieza.notas || '';

    // Nota: Las fotos no se rellenan en los <input type="file"> por seguridad del navegador, 
    // pero si los dejamos vacíos, el backend mantendrá las que ya tenía.

    // 3. Cambiar el modo del formulario
    idEdicionActual = pieza.id;
    const btnSubmit = document.querySelector('#form-nueva-moneda button[type="submit"]');
    btnSubmit.textContent = "🔄 Actualizar Datos de la Pieza";
    btnSubmit.style.backgroundColor = "#6d5f4d";

    // Mostramos el botón de cancelar
    const btnCancelar = document.getElementById('btn-cancelar-edicion');
    if (btnCancelar) btnCancelar.style.display = "inline-block";

    // 4. Hacer scroll automático hasta el formulario
    document.getElementById('panel-creacion').scrollIntoView({ behavior: 'smooth' });
}

function cancelarEdicion() {
    idEdicionActual = null;

    const form = document.getElementById('form-nueva-moneda');
    form.reset();

    // Restauramos el campo ID
    const inId = document.getElementById('in-id');
    inId.disabled = false;

    // Restauramos el botón principal
    const btnSubmit = form.querySelector('button[type="submit"]');
    btnSubmit.textContent = "Guardar Pieza";
    btnSubmit.style.backgroundColor = "var(--accent-color)";

    // Ocultamos el botón de cancelar
    const btnCancelar = document.getElementById('btn-cancelar-edicion');
    if (btnCancelar) btnCancelar.style.display = "none";
}