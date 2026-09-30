let coleccionGlobal = [];
let paginaActual = 1;

document.addEventListener('DOMContentLoaded', () => {
    cargarCatalogoCompleto();
    configurarFiltros();
    configurarAuth();
});

// --- SISTEMA DE MENSAJES PERSONALIZADO ---
function mostrarMensaje(titulo, texto, tipo = 'alerta') {
    return new Promise((resolve) => {
        const modal = document.getElementById('modal-sistema');
        const input = document.getElementById('modal-sistema-input');
        const btnCancelar = document.getElementById('btn-modal-cancelar');
        const btnAceptar = document.getElementById('btn-modal-aceptar');
        
        document.getElementById('modal-sistema-titulo').textContent = titulo;
        document.getElementById('modal-sistema-texto').textContent = texto;
        
        // Configuramos los elementos visibles según el tipo de ventana
        const passContainer = document.getElementById('modal-password-container');
        passContainer.style.display = tipo === 'password' ? 'block' : 'none';
        input.value = '';
        btnCancelar.style.display = (tipo === 'confirmacion' || tipo === 'password') ? 'block' : 'none';
        
        const limpiar = () => {
            modal.style.display = 'none';
            btnAceptar.removeEventListener('click', onAceptar);
            btnCancelar.removeEventListener('click', onCancelar);
        };

        const onAceptar = () => {
            limpiar();
            if (tipo === 'password') resolve(input.value);
            else resolve(true);
        };
        const onCancelar = () => {
            limpiar();
            if (tipo === 'password') resolve(null);
            else resolve(false);
        };

        btnAceptar.addEventListener('click', onAceptar);
        btnCancelar.addEventListener('click', onCancelar);
        
        modal.style.display = 'flex';
        if (tipo === 'password') input.focus();
    });
}

const trazadoOjoAbierto = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
const trazadoOjoTachado = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`;

// DELEGACIÓN DE EVENTOS: Escuchamos en todo el documento
document.addEventListener('click', (e) => {
    // Buscamos si el clic se hizo dentro de nuestro botón del ojo
    const btnOjo = e.target.closest('#btn-toggle-password');
    
    // Si no han hecho clic en el ojo, ignoramos y salimos
    if (!btnOjo) return;
    
    e.preventDefault();
    const input = document.getElementById('modal-sistema-input');
    const icono = document.getElementById('icono-ojo');
    
    if (input.type === 'password') {
        input.type = 'text';
        icono.innerHTML = trazadoOjoTachado;
    } else {
        input.type = 'password';
        icono.innerHTML = trazadoOjoAbierto;
    }
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
        const pass = await mostrarMensaje("Acceso Restringido", "Introduce la contraseña:", "password");
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
                await mostrarMensaje("Error", "La contraseña es incorrecta.", "alerta");
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
        const respuesta = await fetch('/api/piezas');
        
        if (!respuesta.ok) {
            throw new Error(`Error del servidor: ${respuesta.status}`);
        }
        
        const piezas = await respuesta.json();
        
        // Guardamos todo en la variable global y renderizamos
        coleccionGlobal = piezas;
        
        // Si hay algún orden seleccionado en el panel, lo aplicamos, si no, mostramos tal cual
        const selectOrden = document.getElementById('filtro-orden');
        if (selectOrden) {
            // Reutilizamos la lógica de filtrado que ya incluye la ordenación
            document.getElementById('in-busqueda').dispatchEvent(new Event('input'));
        } else {
            renderizarCatalogo(coleccionGlobal, selectOrden ? selectOrden.value : 'pais-asc');
        }
        
    } catch (error) {
        console.error("Error al cargar la base de datos:", error);
        document.getElementById('galeria').innerHTML = '<p class="sin-resultados">Error al conectar con la base de datos.</p>';
    }
}

function renderizarCatalogo(items, criterioOrden = 'pais-asc') {
    const contenedor = document.getElementById('galeria');
    const paginacionContenedor = document.getElementById('paginacion-container');
    
    contenedor.innerHTML = '';
    const esAdmin = !!getToken();

    if (items.length === 0) {
        contenedor.innerHTML = '<p class="sin-resultados" style="grid-column: 1 / -1; text-align: center;">No hay piezas que coincidan con la búsqueda.</p>';
        if (paginacionContenedor) paginacionContenedor.innerHTML = '';
        return;
    }

    // --- 1. LÓGICA DE PAGINACIÓN ---
    // Magia responsive: 12 en móvil (<768px), 24 en ordenador
    const ITEMS_POR_PAGINA = window.innerWidth < 768 ? 12 : 24;
    const totalItems = items.length;
    const totalPaginas = Math.ceil(totalItems / ITEMS_POR_PAGINA);
    
    // Seguridad por si borramos elementos y la página se queda vacía
    if (paginaActual > totalPaginas) paginaActual = totalPaginas;
    if (paginaActual < 1) paginaActual = 1;

    const indiceInicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    const indiceFin = indiceInicio + ITEMS_POR_PAGINA;
    const itemsPagina = items.slice(indiceInicio, indiceFin);

    // --- 2. LÓGICA DE AGRUPACIÓN (SEPARADORES) ---
    let grupoActual = null;

    itemsPagina.forEach(item => {
        let valorGrupo = null;
        
        // Usamos includes para que cace tanto 'pais-asc' como 'pais-desc'
        if (criterioOrden.includes('pais')) {
            valorGrupo = (item.identificacion?.pais || 'SIN PAÍS').toUpperCase().trim();
        } else if (criterioOrden.includes('ano')) {
            valorGrupo = item.identificacion?.ano_visible ? `AÑO ${item.identificacion.ano_visible}` : 'SIN AÑO';
        }

        // Si detectamos un cambio de grupo, inyectamos la cabecera
        if (valorGrupo !== null && valorGrupo !== grupoActual) {
            grupoActual = valorGrupo;
            const separador = document.createElement('div');
            separador.style.cssText = "grid-column: 1 / -1; border-bottom: 3px solid var(--accent-light); margin: 2rem 0 1rem 0; padding-bottom: 0.5rem;";
            separador.innerHTML = `<h2 style="margin: 0; color: var(--accent-color); font-family: 'Georgia', serif; font-size: 1.8rem; letter-spacing: 2px;">${valorGrupo}</h2>`;
            contenedor.appendChild(separador);
        }

        // --- 3. DIBUJAR LA TARJETA ---
        const tarjeta = document.createElement('article');
        tarjeta.className = 'tarjeta-moneda';
        tarjeta.setAttribute('onclick', `abrirDetalles('${item.id}')`);

        const esMoneda = item.tipo === 'moneda';
        
        const pais = item.identificacion.pais || 'S/D';
        const epoca = item.identificacion.epoca || 'S/D';
        const subtitulo = `${pais} · ${epoca}`;

        const rasgoDistintivo = esMoneda 
            ? `<span>${item.tecnica.material || 'Material desc.'}</span> • <span>${item.identificacion.ceca || 'Sin ceca'}</span>`
            : `<span>${item.tecnica.material || 'Material desc.'}</span> • <span>${item.identificacion.motivo || 'Sin motivo'}</span>`;

        const valorAno = item.identificacion.ano_visible || 'S/F';

        const btnBorrar = esAdmin 
            ? `<button class="btn-eliminar" onclick="event.stopPropagation(); eliminarPieza('${item.id}', '${item.tipo}')" title="Eliminar pieza">🗑️</button>` 
            : '';

        const imgAnv = item.multimedia?.img_anverso 
            ? `<img class="img-moneda-recorte img-moneda" src="${item.multimedia.img_anverso}" alt="Anverso" onclick="event.stopPropagation(); abrirLightbox(this.src);">` 
            : `<div class="img-placeholder">Sin<br>anverso</div>`;
            
        const imgRev = item.multimedia?.img_reverso 
            ? `<img class="img-moneda-recorte img-moneda" src="${item.multimedia.img_reverso}" alt="Reverso" onclick="event.stopPropagation(); abrirLightbox(this.src);">` 
            : `<div class="img-placeholder">Sin<br>reverso</div>`;

        tarjeta.innerHTML = `
            <div class="cabecera-tarjeta" style="padding: 1.5rem 1.5rem 0 1.5rem; text-align: center;">
                <h2>${item.identificacion.valor_facial || 'S/D'} (${valorAno})</h2>
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
                        <span style="color: var(--accent-color); font-weight: bold; font-size: 0.9rem;">${item.coleccionismo.estado || 'S/D'}</span>
                        ${btnBorrar}
                    </div>
                </div>
            </div>
        `;
        contenedor.appendChild(tarjeta);
    });

    // --- 4. ACTUALIZAR CONTROLES DE PAGINACIÓN ---
    if (paginacionContenedor) {
        const mostrarDesde = indiceInicio + 1;
        const mostrarHasta = Math.min(indiceFin, totalItems);
        
        paginacionContenedor.innerHTML = `
            <button id="btn-prev-page" style="padding: 0.5rem 1rem; background: var(--accent-color); color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;" ${paginaActual === 1 ? 'disabled style="background: #C5B79F; cursor: not-allowed;"' : ''}>&laquo; Anterior</button>
            
            <span style="font-size: 0.95rem; font-weight: bold; color: var(--text-primary);">
                Mostrando ${mostrarDesde} a ${mostrarHasta} de ${totalItems} (Pág. ${paginaActual}/${totalPaginas})
            </span>
            
            <button id="btn-next-page" style="padding: 0.5rem 1rem; background: var(--accent-color); color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;" ${paginaActual === totalPaginas ? 'disabled style="background: #C5B79F; cursor: not-allowed;"' : ''}>Siguiente &raquo;</button>
        `;

        // Eventos para cambiar de página y scrollear arriba suavemente
        const btnPrev = document.getElementById('btn-prev-page');
        const btnNext = document.getElementById('btn-next-page');

        if (btnPrev && paginaActual > 1) {
            btnPrev.addEventListener('click', () => {
                paginaActual--;
                renderizarCatalogo(items, criterioOrden);
                document.getElementById('galeria').scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        }
        if (btnNext && paginaActual < totalPaginas) {
            btnNext.addEventListener('click', () => {
                paginaActual++;
                renderizarCatalogo(items, criterioOrden);
                document.getElementById('galeria').scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        }
    }
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
        const tipo = document.getElementById('filtro-tipo').value.toLowerCase();
        const pais = document.getElementById('filtro-pais').value.toLowerCase().trim();
        const estado = document.getElementById('filtro-estado').value;
        const anoMin = parseInt(document.getElementById('filtro-ano-min').value) || -Infinity;
        const anoMax = parseInt(document.getElementById('filtro-ano-max').value) || Infinity;
        const precioMin = parseFloat(document.getElementById('filtro-precio-min').value) || 0;
        const precioMax = parseFloat(document.getElementById('filtro-precio-max').value) || Infinity;
        const criterioOrden = selectOrden ? selectOrden.value : 'pais-asc';

        // Filtrar
        let resultados = coleccionGlobal.filter(item => {
            const campoBusqueda = `${item.id} ${item.identificacion.pais || ''} ${item.identificacion.epoca || ''} ${item.identificacion.valor_facial} ${item.identificacion.motivo || ''} ${item.identificacion.ano_visible || ''} ${item.identificacion.ceca || ''} ${item.notas || ''}`.toLowerCase();
            const pasaTexto = campoBusqueda.includes(textoLibre);

            const pasaTipo = (tipo === 'todos') || (item.tipo && item.tipo.toLowerCase() === tipo);
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

        // Ordenar (Algoritmo Multi-nivel en Cascada)
        resultados.sort((a, b) => {
            const paisA = (a.identificacion.pais || 'Z_SIN_PAIS').toLowerCase();
            const paisB = (b.identificacion.pais || 'Z_SIN_PAIS').toLowerCase();
            const valNumA = a.identificacion.valor_num || 0;
            const valNumB = b.identificacion.valor_num || 0;
            const anoA = a.identificacion.ano_visible ?? 9999;
            const anoB = b.identificacion.ano_visible ?? 9999;
            const idA = a.id.toLowerCase();
            const idB = b.id.toLowerCase();

            // Extra para desempatar si dos piezas tienen el mismo valor numérico (ej. no se rellenó)
            const valTextA = (a.identificacion.valor_facial || '').toLowerCase();
            const valTextB = (b.identificacion.valor_facial || '').toLowerCase();

            switch (criterioOrden) {
                case 'pais-asc':
                    if (paisA !== paisB) return paisA.localeCompare(paisB);
                    if (valNumA !== valNumB) return valNumA - valNumB;
                    if (anoA !== anoB) return anoA - anoB;
                    return idA.localeCompare(idB);
                    
                case 'pais-desc':
                    // Invertimos país, pero MANTENEMOS el orden lógico interno (menor valor, año más antiguo)
                    if (paisA !== paisB) return paisB.localeCompare(paisA);
                    if (valNumA !== valNumB) return valNumA - valNumB;
                    if (anoA !== anoB) return anoA - anoB;
                    return idA.localeCompare(idB);

                case 'ano-asc':
                    // Año -> País -> Valor -> ID
                    if (anoA !== anoB) return anoA - anoB;
                    if (paisA !== paisB) return paisA.localeCompare(paisB);
                    if (valNumA !== valNumB) return valNumA - valNumB;
                    if (valTextA !== valTextB) return valTextA.localeCompare(valTextB);
                    return idA.localeCompare(idB);

                case 'ano-desc':
                    // Año invertido, pero dentro del mismo año, orden lógico estándar
                    if (anoA !== anoB) return anoB - anoA;
                    if (paisA !== paisB) return paisA.localeCompare(paisB);
                    if (valNumA !== valNumB) return valNumA - valNumB;
                    if (valTextA !== valTextB) return valTextA.localeCompare(valTextB);
                    return idA.localeCompare(idB);

                case 'id-asc':
                    return idA.localeCompare(idB);
                    
                default:
                    return 0;
            }
        });

        // CADA VEZ QUE FILTRAMOS O CAMBIAMOS EL ORDEN, VOLVEMOS A LA PÁGINA 1
        paginaActual = 1;
        renderizarCatalogo(resultados, criterioOrden);
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
        if (selectOrden) selectOrden.value = 'pais-asc';
        inBusqueda.value = '';
        aplicarFiltros();
    });
}

// --- INTELIGENCIA DEL FORMULARIO ---
document.addEventListener('DOMContentLoaded', () => {
    const inTipo = document.getElementById('in-tipo');
    const inCeca = document.getElementById('in-ceca'); 
    
    const inPeso = document.getElementById('in-peso');
    const inDiametro = document.getElementById('in-diametro');
    const inAncho = document.getElementById('in-ancho');
    const inAlto = document.getElementById('in-alto');
    const inSerie = document.getElementById('in-serie');

    if (inTipo) {
        const aplicarLogicaFormulario = () => {
            // Pasamos el valor a minúsculas por seguridad y comprobamos si es moneda o medalla
            const tipoSeleccionado = inTipo.value.toLowerCase();
            const esMonedaOMedalla = tipoSeleccionado === 'moneda' || tipoSeleccionado === 'medalla';
            
            // 1. Placeholder dinámico en vez de etiqueta
            if (inCeca) inCeca.placeholder = esMonedaOMedalla ? 'Ceca / Marca (Ej. Madrid)' : 'Impresor (Ej. FNMT)';
            
            // 2. Mostrar/Ocultar los campos directamente
            if (inPeso) inPeso.style.display = esMonedaOMedalla ? 'block' : 'none';
            if (inDiametro) inDiametro.style.display = esMonedaOMedalla ? 'block' : 'none';
            
            if (inAncho) inAncho.style.display = esMonedaOMedalla ? 'none' : 'block';
            if (inAlto) inAlto.style.display = esMonedaOMedalla ? 'none' : 'block';
            if (inSerie) inSerie.style.display = esMonedaOMedalla ? 'none' : 'block';
        };

        // Escuchar el cambio en el desplegable
        inTipo.addEventListener('change', aplicarLogicaFormulario);
        
        // Ejecutarlo una vez al cargar la página
        aplicarLogicaFormulario();
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
    if (!token) {
        await mostrarMensaje("Atención", "Debes iniciar sesión para guardar piezas.");
        return;
    }

    const btnSubmit = e.target.querySelector('button[type="submit"]') || e.target.querySelector('button');
    btnSubmit.textContent = "⏳ Subiendo fotos y guardando...";
    btnSubmit.disabled = true;

    try {
        // 1. Subir Anverso (Solo si se ha seleccionado un archivo)
        const inputAnv = document.getElementById('in-foto-anv');
        let urlAnv = null;
        if (inputAnv && inputAnv.files.length > 0) {
            urlAnv = await subirFotoNube(inputAnv.files[0], token);
        }

        // 2. Subir Reverso (Solo si se ha seleccionado un archivo)
        const inputRev = document.getElementById('in-foto-rev');
        let urlRev = null;
        if (inputRev && inputRev.files.length > 0) {
            urlRev = await subirFotoNube(inputRev.files[0], token);
        }

        // 3. Construir el objeto con TODOS los campos (Modo Indestructible)
        const nuevaPieza = {
            id: document.getElementById('in-id')?.value,
            tipo: document.getElementById('in-tipo')?.value,
            identificacion: {
                pais: document.getElementById('in-pais')?.value || null,
                epoca: document.getElementById('in-epoca')?.value || null,
                valor_facial: document.getElementById('in-valor')?.value || null,
                valor_num: parseFloat(document.getElementById('in-valor-num')?.value) || 0,
                ano_visible: parseInt(document.getElementById('in-ano')?.value) || null,
                ceca: document.getElementById('in-ceca')?.value || null,
                motivo: document.getElementById('in-motivo')?.value || null
            },
            tecnica: {
                material: document.getElementById('in-material')?.value || null,
                peso_g: parseFloat(document.getElementById('in-peso')?.value) || null,
                diametro_mm: parseFloat(document.getElementById('in-diametro')?.value) || null,
                ancho_mm: parseFloat(document.getElementById('in-ancho')?.value) || null,
                alto_mm: parseFloat(document.getElementById('in-alto')?.value) || null,
                numero_serie: document.getElementById('in-serie')?.value || null
            },
            coleccionismo: {
                estado: document.getElementById('in-estado')?.value || null
            },
            adquisicion: {
                precio_eur: parseFloat(document.getElementById('in-precio')?.value) || null
            },
            multimedia: {
                img_anverso: urlAnv,
                img_reverso: urlRev
            },
            notas: document.getElementById('in-notas')?.value || null
        };

        // Si no se subió foto nueva, mantenemos la URL original (si estamos editando)
        if (idEdicionActual) {
            const piezaOriginal = coleccionGlobal.find(p => p.id === idEdicionActual);
            if (!urlAnv && piezaOriginal.multimedia) nuevaPieza.multimedia.img_anverso = piezaOriginal.multimedia.img_anverso;
            if (!urlRev && piezaOriginal.multimedia) nuevaPieza.multimedia.img_reverso = piezaOriginal.multimedia.img_reverso;
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
            await mostrarMensaje("Catálogo Actualizado", idEdicionActual ? "Pieza actualizada con éxito." : "Pieza guardada con éxito.");
            e.target.reset(); 
            window.location.reload(); 
        } else {
            const errData = await resGuardar.json();
            await mostrarMensaje("Error al guardar", errData.detail);
            if (resGuardar.status === 401) throw new Error("Sesión caducada");
        }

    } catch (error) {
        await mostrarMensaje("Error Inesperado", error.message);
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
    if (!token) {
        await mostrarMensaje("Atención", "Debes iniciar sesión para poder eliminar piezas.");
        return;
    }

    const seguro = await mostrarMensaje("Eliminar Pieza", `¿Eliminar permanentemente la pieza con ID: ${id}?`, "confirmacion");
    if (!seguro) return;

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
        await mostrarMensaje("Error al eliminar", error.message);
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

    // 1. Imágenes (Sin círculos en la vista de detalle)
    const imgAnv = pieza.multimedia?.img_anverso 
        ? `<img class="img-moneda" src="${pieza.multimedia.img_anverso}" style="max-width: 100%; height: auto; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 1rem; cursor: zoom-in;" onclick="event.stopPropagation(); abrirLightbox(this.src);">` 
        : `<p style="color: #95A5A6; font-style: italic; font-size: 0.9rem; margin-bottom: 1rem;">(Sin imagen de anverso)</p>`;
        
    const imgRev = pieza.multimedia?.img_reverso 
        ? `<img class="img-moneda" src="${pieza.multimedia.img_reverso}" style="max-width: 100%; height: auto; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: zoom-in;" onclick="event.stopPropagation(); abrirLightbox(this.src);">` 
        : `<p style="color: #95A5A6; font-style: italic; font-size: 0.9rem;">(Sin imagen de reverso)</p>`;

    // Lógicas dinámicas
    const lblCeca = esMoneda ? "Ceca / Marca" : "Impresor";
    const strDimensiones = (pieza.tecnica.ancho_mm && pieza.tecnica.alto_mm) 
        ? `${pieza.tecnica.ancho_mm} x ${pieza.tecnica.alto_mm} mm` 
        : 'S/D';

    const material = pieza.tecnica.material || 'S/D';

    // 2. Técnica y Conservación ('S/D' aplicado)
    const especificaciones = esMoneda 
        ? `<li><strong>Material:</strong> ${material}</li>
           <li><strong>Peso:</strong> ${pieza.tecnica.peso_g ? pieza.tecnica.peso_g + ' g' : 'S/D'}</li>
           <li><strong>Diámetro:</strong> ${pieza.tecnica.diametro_mm ? pieza.tecnica.diametro_mm + ' mm' : 'S/D'}</li>`
        : `<li><strong>Material:</strong> ${material}</li>
           <li><strong>Dimensiones:</strong> ${strDimensiones}</li>
           <li><strong>Nº Serie:</strong> ${pieza.tecnica.numero_serie || 'S/D'}</li>`;

    // 3. Adquisición
    const precio = (pieza.adquisicion && pieza.adquisicion.precio_eur) ? `${pieza.adquisicion.precio_eur.toFixed(2)} €` : 'S/D';

    // Botón de edición reservado para administradores
    const btnEditar = esAdmin 
        ? `<button onclick="iniciarEdicion('${pieza.id}')" style="margin-top: 2rem; padding: 0.8rem; background: #8C7B65; color: white; border: none; border-radius: 4px; cursor: pointer; width: 100%; font-weight: bold; font-size: 1.1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: background 0.3s;">✏️ Modificar Datos de la Pieza</button>` 
        : '';

    // Inyección de HTML
    contenedor.innerHTML = `
        <div style="position: absolute; top: 1.2rem; left: 1.5rem; font-family: monospace; font-size: 0.85rem; color: #7F8C8D; background: #F8F9FA; padding: 0.3rem 0.6rem; border-radius: 4px; border: 1px solid #E5E0D8;">
            Ref: ${pieza.id}
        </div>

        <h2 style="font-family: 'Georgia', serif; font-size: 2.2rem; margin-top: 1rem; color: #2C3E50; border-bottom: 2px solid #C5B79F; padding-bottom: 0.5rem; text-align: center;">
            ${pieza.identificacion.valor_facial || 'S/D'} <span style="color: #8C7B65; font-size: 1.6rem;">(${pieza.identificacion.ano_visible || 'S/F'})</span>
        </h2>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 3rem; margin-top: 2rem;">
            
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: start;">
                ${imgAnv}
                ${imgRev}
            </div>
            
            <div>
                <h3 style="color: #8C7B65; margin-top: 0; font-family: 'Georgia', serif; border-bottom: 1px dashed #E5E0D8; padding-bottom: 0.3rem;">Identificación Histórica</h3>
                <ul style="list-style: none; padding: 0; margin: 0 0 1.5rem 0; line-height: 1.8; color: #34495E; font-size: 0.95rem;">
                    <li><strong>País:</strong> ${pieza.identificacion.pais || 'S/D'}</li>
                    <li><strong>Época:</strong> ${pieza.identificacion.epoca || 'S/D'}</li>
                    <li><strong>${lblCeca}:</strong> ${pieza.identificacion.ceca || 'S/D'}</li>
                    <li><strong>Motivo:</strong> ${pieza.identificacion.motivo || 'S/D'}</li>
                </ul>

                <h3 style="color: #8C7B65; font-family: 'Georgia', serif; border-bottom: 1px dashed #E5E0D8; padding-bottom: 0.3rem;">Detalles Técnicos y Conservación</h3>
                <ul style="list-style: none; padding: 0; margin: 0 0 1.5rem 0; line-height: 1.8; color: #34495E; font-size: 0.95rem;">
                    ${especificaciones}
                    <li><strong>Estado de Conservación:</strong> <span style="background: #E5E0D8; padding: 0.1rem 0.5rem; border-radius: 4px; font-weight: bold; color: #2C3E50;">${pieza.coleccionismo.estado || 'S/D'}</span></li>
                </ul>

                <h3 style="color: #8C7B65; font-family: 'Georgia', serif; border-bottom: 1px dashed #E5E0D8; padding-bottom: 0.3rem;">Procedencia y Adquisición</h3>
                <ul style="list-style: none; padding: 0; margin: 0 0 1.5rem 0; line-height: 1.8; color: #34495E; font-size: 0.95rem;">
                    <li><strong>Coste de la pieza:</strong> ${precio}</li>
                </ul>

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
    const modal = document.getElementById('modal-detalles');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';

    // 2. Rellenar el formulario de forma segura (Helper interno)
    const safeSet = (idElemento, valor) => {
        const el = document.getElementById(idElemento);
        if (el) el.value = valor || '';
    };

    // Aplicamos los valores de forma segura sin importar si el HTML existe o no
    safeSet('in-id', pieza.id);
    const inId = document.getElementById('in-id');
    if (inId) inId.disabled = true; 
    
    const inTipo = document.getElementById('in-tipo');
    if (inTipo) {
        inTipo.value = pieza.tipo;
        inTipo.dispatchEvent(new Event('change')); 
    }

    safeSet('in-pais', pieza.identificacion?.pais);
    safeSet('in-epoca', pieza.identificacion?.epoca);
    safeSet('in-valor', pieza.identificacion?.valor_facial);
    safeSet('in-valor-num', pieza.identificacion?.valor_num);
    safeSet('in-ano', pieza.identificacion?.ano_visible);
    safeSet('in-ceca', pieza.identificacion?.ceca);
    safeSet('in-motivo', pieza.identificacion?.motivo);

    safeSet('in-material', pieza.tecnica?.material);
    safeSet('in-peso', pieza.tecnica?.peso_g);
    safeSet('in-diametro', pieza.tecnica?.diametro_mm);
    safeSet('in-ancho', pieza.tecnica?.ancho_mm);
    safeSet('in-alto', pieza.tecnica?.alto_mm);
    safeSet('in-serie', pieza.tecnica?.numero_serie);

    safeSet('in-estado', pieza.coleccionismo?.estado);
    safeSet('in-precio', pieza.adquisicion?.precio_eur);
    safeSet('in-notas', pieza.notas);

    // 3. Cambiar el modo del formulario
    idEdicionActual = pieza.id;
    
    // Selección robusta del botón de envío
    const form = document.getElementById('form-nueva-moneda');
    if (form) {
        const btnSubmit = form.querySelector('button[type="submit"]') || form.querySelector('button');
        if (btnSubmit) {
            btnSubmit.textContent = "🔄 Actualizar Datos de la Pieza";
            btnSubmit.style.backgroundColor = "#6d5f4d";
        }
    }

    // Mostramos el botón de cancelar
    const btnCancelar = document.getElementById('btn-cancelar-edicion');
    if (btnCancelar) btnCancelar.style.display = "inline-block";

    // 4. Hacer scroll automático
    const panel = document.getElementById('panel-creacion');
    if (panel) panel.scrollIntoView({ behavior: 'smooth' });
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

// --- LÓGICA DE RECORTE DE IMÁGENES (CROPPER.JS AVANZADO) ---

// Inyectamos el CSS para el círculo sin tocar el HTML
if (!document.getElementById('css-cropper-circular')) {
    const style = document.createElement('style');
    style.id = 'css-cropper-circular';
    style.innerHTML = `
        .recorte-circular .cropper-view-box,
        .recorte-circular .cropper-face {
            border-radius: 50%;
        }
    `;
    document.head.appendChild(style);
}

let cropperInstance = null;
let inputArchivoActual = null; 

// Función mágica para troquelar el cuadrado y hacerlo círculo con fondo transparente
function obtenerCanvasRedondo(sourceCanvas) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;

    canvas.width = width;
    canvas.height = height;
    context.imageSmoothingEnabled = true;
    context.drawImage(sourceCanvas, 0, 0, width, height);
    
    // Dibujamos un círculo y borramos todo lo que quede fuera de él
    context.globalCompositeOperation = 'destination-in';
    context.beginPath();
    context.arc(width / 2, height / 2, Math.min(width, height) / 2, 0, 2 * Math.PI, true);
    context.fill();
    
    return canvas;
}

const inputsFoto = document.querySelectorAll('input[type="file"]');

inputsFoto.forEach(input => {
    input.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        inputArchivoActual = this;
        const reader = new FileReader();
        
        // ¿Es moneda o billete?
        const tipoActual = document.getElementById('in-tipo').value.toLowerCase();
        const esRedonda = tipoActual === 'moneda' || tipoActual === 'medalla';
        const modal = document.getElementById('modal-cropper');
        
        // Activamos o desactivamos la clase CSS del círculo
        if (esRedonda) modal.classList.add('recorte-circular');
        else modal.classList.remove('recorte-circular');

        reader.onload = (eventoLector) => {
            const imgEl = document.getElementById('imagen-a-recortar');
            imgEl.src = eventoLector.target.result;
            modal.style.display = 'flex';
            
            if (cropperInstance) cropperInstance.destroy();
            
            cropperInstance = new Cropper(imgEl, {
                aspectRatio: esRedonda ? 1 : NaN, // 1:1 para monedas, libre para billetes
                viewMode: 2,
                background: false
            });
        };
        reader.readAsDataURL(file);
    });
});

// EVENT DELEGATION PARA LOS BOTONES
document.addEventListener('click', (e) => {
    // 1. Botón Cancelar
    if (e.target.closest('#btn-crop-cancelar')) {
        document.getElementById('modal-cropper').style.display = 'none';
        if (cropperInstance) cropperInstance.destroy();
        if (inputArchivoActual) inputArchivoActual.value = ''; 
        return;
    }

    // 2. Botón Aceptar y Recortar
    if (e.target.closest('#btn-crop-aceptar')) {
        if (!cropperInstance) return;
        
        const btnAceptar = e.target.closest('#btn-crop-aceptar');
        const textoOriginal = btnAceptar.textContent;
        btnAceptar.textContent = "Procesando recorte...";
        btnAceptar.disabled = true;
        
        const tipoActual = document.getElementById('in-tipo').value.toLowerCase();
        const esRedonda = tipoActual === 'moneda' || tipoActual === 'medalla';
        
        // Extraemos el lienzo cuadrado (Más resolución a lo ancho si es billete)
        let canvasRecortado = cropperInstance.getCroppedCanvas({
            width: esRedonda ? 800 : 1200,
            height: 800
        });
        
        // Si es redonda, le aplicamos el troquel circular transparente
        if (esRedonda) {
            canvasRecortado = obtenerCanvasRedondo(canvasRecortado);
        }
        
        // Magia: PNG para conservar la transparencia del círculo, JPG para billetes (pesa menos)
        const formato = esRedonda ? 'image/png' : 'image/jpeg';
        const extension = esRedonda ? 'png' : 'jpg';

        canvasRecortado.toBlob((blob) => {
            const archivoRecortado = new File([blob], `recorte.${extension}`, { type: formato });
            
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(archivoRecortado);
            if (inputArchivoActual) inputArchivoActual.files = dataTransfer.files;
            
            document.getElementById('modal-cropper').style.display = 'none';
            cropperInstance.destroy();
            
            btnAceptar.textContent = textoOriginal;
            btnAceptar.disabled = false;
        }, formato, 0.9);
    }
});