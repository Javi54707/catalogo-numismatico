document.addEventListener('DOMContentLoaded', () => {
    cargarCatalogoCompleto();
    configurarFiltros();
});

let coleccionGlobal = [];

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

    if (items.length === 0) {
        contenedor.innerHTML = '<p class="sin-resultados">No hay piezas registradas en esta categoría.</p>';
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

// Lógica para añadir nuevas piezas desde el formulario
document.getElementById('form-nueva-moneda').addEventListener('submit', async (e) => {
    e.preventDefault(); // Evita que la página se recargue al enviar
    
    const btnSubmit = e.target.querySelector('button');
    btnSubmit.textContent = 'Procesando foto...';
    btnSubmit.disabled = true;

    try {
        // 1. Enviar la foto original al motor de compresión
        const fotoInput = document.getElementById('in-foto-anv');
        const formData = new FormData();
        formData.append('file', fotoInput.files[0]);

        const respFoto = await fetch('/api/upload-imagen', {
            method: 'POST',
            body: formData
        });
        
        const dataFoto = await respFoto.json();
        
        if (dataFoto.error) throw new Error(dataFoto.error);

        // 2. Construir el objeto JSON con los datos del formulario y la ruta de la nueva foto
        const nuevaMoneda = {
            id: document.getElementById('in-id').value,
            tipo: "moneda",
            identificacion: {
                pais: "Desconocido", // Valores por defecto para simplificar el ejemplo
                epoca: "Sin especificar",
                valor_facial: document.getElementById('in-valor').value,
                ano_visible: parseInt(document.getElementById('in-ano').value),
                ceca: "Sin especificar"
            },
            tecnica: {
                material: "Desconocido",
                peso_g: 0,
                diametro_mm: 0
            },
            coleccionismo: {
                estado: "MBC"
            },
            adquisicion: {
                origen: "Panel Web",
                fecha_compra: new Date().toISOString().split('T')[0], // Fecha de hoy automática
                precio_eur: parseFloat(document.getElementById('in-precio').value),
                gastos_envio_eur: 0
            },
            multimedia: {
                img_anverso: dataFoto.ruta_generada, // La ruta .webp que nos devuelve FastAPI
                img_reverso: "" 
            },
            notas: "Añadida mediante el sistema web v2.0."
        };

        // 3. Enviar el objeto JSON al endpoint de guardado
        const respGuardar = await fetch('/api/monedas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(nuevaMoneda)
        });

        if (respGuardar.ok) {
            alert('✅ ¡Moneda procesada y guardada con éxito!');
            e.target.reset(); // Limpiar el formulario
            cargarCatalogoCompleto(); // Recargar la galería dinámicamente
        }
        
    } catch (error) {
        console.error("Error en el proceso:", error);
        alert("❌ Hubo un error al guardar la pieza. Revisa la consola.");
    } finally {
        btnSubmit.textContent = 'Procesar y Guardar Pieza';
        btnSubmit.disabled = false;
    }
});