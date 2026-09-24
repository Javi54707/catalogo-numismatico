document.addEventListener('DOMContentLoaded', () => {
    cargarCatalogoCompleto();
    configurarFiltros();
});

let coleccionGlobal = [];

async function cargarCatalogoCompleto() {
    try {
        const [respMonedas, respBilletes] = await Promise.all([
            fetch('./data/monedas.json'),
            fetch('./data/billetes.json')
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