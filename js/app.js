document.addEventListener('DOMContentLoaded', () => {
    cargarCatalogo();
});

async function cargarCatalogo() {
    try {
        const respuesta = await fetch('./data/monedas.json');
        if (!respuesta.ok) {
            throw new Error(`HTTP error! estado: ${respuesta.status}`);
        }
        const monedas = await respuesta.json();
        renderizarMonedas(monedas);
    } catch (error) {
        console.error("Error al cargar la base de datos:", error);
    }
}

function renderizarMonedas(monedas) {
    const contenedor = document.getElementById('galeria');
    contenedor.innerHTML = '';

    monedas.forEach(moneda => {
        const tarjeta = document.createElement('article');
        tarjeta.className = 'tarjeta-moneda';

        // Formatear las estrellas si existen en los datos
        const estrellas = moneda.identificacion.ano_estrellas && moneda.identificacion.ano_estrellas.length > 0
            ? `*${moneda.identificacion.ano_estrellas.join(' *')}`
            : '';

        tarjeta.innerHTML = `
            <div class="imagenes-container">
                <img src="${moneda.multimedia.img_anverso}" alt="Anverso de ${moneda.identificacion.valor_facial}" loading="lazy" class="img-moneda"
                    onerror="this.onerror=null; this.src='https://placehold.co/130x130/e2e8f0/718096?text=Sin+Foto';">
                <img src="${moneda.multimedia.img_reverso}" alt="Reverso de ${moneda.identificacion.valor_facial}" loading="lazy" class="img-moneda"
                    onerror="this.onerror=null; this.src='https://placehold.co/130x130/e2e8f0/718096?text=Sin+Foto';">
            </div>
            <div class="info-container">
                <div class="cabecera-tarjeta">
                    <h2>${moneda.identificacion.valor_facial} (${moneda.identificacion.ano_visible})</h2>
                    <span class="badge-estado">${moneda.coleccionismo.estado}</span>
                </div>
                <p class="detalle-secundario">${moneda.identificacion.epoca} · ${moneda.identificacion.ceca} ${estrellas}</p>
                <div class="especificaciones">
                    <span><strong>Material:</strong> ${moneda.tecnica.material}</span>
                    <span><strong>Peso:</strong> ${moneda.tecnica.peso_g} g</span>
                    <span><strong>Diámetro:</strong> ${moneda.tecnica.diametro_mm} mm</span>
                </div>
                <p class="notas">${moneda.notas}</p>
                <div class="pie-tarjeta">
                    <span class="precio">${moneda.adquisicion.precio_eur.toFixed(2)} €</span>
                    <span class="id-tag">${moneda.id}</span>
                </div>
            </div>
        `;

        contenedor.appendChild(tarjeta);
    });
}