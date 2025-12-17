document.addEventListener('DOMContentLoaded', async () => {
    const SUPABASE_URL = 'https://ymvpaooxdqhayzcumrpj.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_TdMi6H9GkduboyrDAf0L3g_Ct5C7Wqy';
    const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const CLAVES_VALIDAS = ['29931335', '24175402'];
    const JUGADA_SIZE = 7; 

    let participantes = [];
    let resultados = [];
    let finanzas = { ventas: 0, recaudado: 0.00, acumulado: 0.00 };

    // --- BLOQUEO ---
    function iniciarBloqueo() {
        let accesoConcedido = false;
        let intentos = 0;
        while (!accesoConcedido && intentos < 3) {
            const claveIngresada = prompt("🔒 Acceso Restringido.\nClave de admin:");
            if (claveIngresada && CLAVES_VALIDAS.includes(claveIngresada.trim())) {
                accesoConcedido = true;
            } else {
                intentos++;
                if (intentos >= 3) window.location.href = "index.html";
            }
        }
    }
    iniciarBloqueo();

    // --- CARGA Y GUARDADO (TABLA ÚNICA polla_datos) ---
    async function cargarDatosDesdeSupabase() {
        const { data, error } = await _supabase.from('polla_datos').select('*');
        if (error) return console.error("Error:", error);

        data.forEach(item => {
            if (item.tipo === 'participantes') participantes = item.contenido || [];
            if (item.tipo === 'resultados') resultados = item.contenido || [];
            if (item.tipo === 'finanzas') finanzas = item.contenido || { ventas: 0, recaudado: 0, acumulado: 0 };
        });
        renderTodo();
    }

    async function guardarEnNube(tipo, contenido) {
        await _supabase.from('polla_datos').upsert({ tipo: tipo, contenido: contenido }, { onConflict: 'tipo' });
    }

    function renderTodo() {
        renderResultados();
        renderParticipantes();
        if(document.getElementById('input-ventas')) {
            document.getElementById('input-ventas').value = finanzas.ventas || 0;
            document.getElementById('input-recaudado').value = finanzas.recaudado || 0;
            document.getElementById('input-acumulado').value = finanzas.acumulado || 0;
        }
    }

    // --- GESTIÓN RESULTADOS ---
    const formRes = document.getElementById('form-resultados');
    if (formRes) {
        formRes.addEventListener('submit', async (e) => {
            e.preventDefault();
            const sorteo = document.getElementById('sorteo-hora').value;
            const numero = document.getElementById('numero-ganador').value.padStart(2, '0');
            resultados.push({ sorteo, numero });
            await guardarEnNube('resultados', resultados);
            renderTodo();
            formRes.reset();
        });
    }

    function renderResultados() {
        const lista = document.getElementById('lista-resultados');
        if (!lista) return;
        lista.innerHTML = resultados.map((res, i) => `
            <li>
                <strong>${res.sorteo}:</strong> ${res.numero}
                <button onclick="eliminarResultado(${i})">X</button>
            </li>
        `).join('');
    }

    window.eliminarResultado = async (index) => {
        resultados.splice(index, 1);
        await guardarEnNube('resultados', resultados);
        renderTodo();
    };

    // --- PROCESAMIENTO WHATSAPP ---
    const btnProcesar = document.getElementById('btn-procesar-pegado');
    if (btnProcesar) {
        btnProcesar.addEventListener('click', () => {
            const rawData = document.getElementById('input-paste-data').value;
            const lines = rawData.split('\n').map(l => l.trim());
            let nombre = ""; let refe = ""; let jugadas = [];

            lines.forEach(line => {
                const numbers = line.match(/\b\d{2}\b/g);
                if (numbers && numbers.length >= JUGADA_SIZE) {
                    jugadas.push(numbers.slice(0, 7).join(','));
                } else if (line.toLowerCase().includes("refe:")) {
                    refe = line.match(/\d+/) ? line.match(/\d+/)[0] : "";
                } else if (line.length > 3 && isNaN(line.charAt(0))) {
                    nombre = line.toUpperCase();
                }
            });
            document.getElementById('nombre').value = nombre;
            document.getElementById('refe').value = refe;
            document.getElementById('jugadas-procesadas').value = jugadas.join(' | ');
        });
    }

    // --- REGISTRO PARTICIPANTE ---
    const formPart = document.getElementById('form-participante');
    if (formPart) {
        formPart.addEventListener('submit', async (e) => {
            e.preventDefault();
            const jugadasRaw = document.getElementById('jugadas-procesadas').value.split('|');
            jugadasRaw.forEach(grupo => {
                const nums = grupo.split(',').map(n => n.trim());
                if(nums.length === 7) {
                    participantes.push({
                        nombre: document.getElementById('nombre').value,
                        refe: document.getElementById('refe').value,
                        jugada: nums // Importante: Guardar los números
                    });
                }
            });
            await guardarEnNube('participantes', participantes);
            renderTodo();
            formPart.reset();
        });
    }

    function renderParticipantes() {
        const lista = document.getElementById('lista-participantes');
        if (!lista) return;
        const filtro = document.getElementById('input-buscar-participante').value.toLowerCase();
        const filtrados = participantes.filter(p => p.nombre.toLowerCase().includes(filtro));
        
        lista.innerHTML = filtrados.map((p, i) => `
            <li>
                #${i+1} - <strong>${p.nombre}</strong> (${p.refe})
                <br><small>Jugada: ${p.jugada.join(' - ')}</small>
                <button onclick="eliminarParticipante(${i})">Eliminar</button>
            </li>
        `).join('');
    }

    window.eliminarParticipante = async (index) => {
        participantes.splice(index, 1);
        await guardarEnNube('participantes', participantes);
        renderTodo();
    };

    // --- FINANZAS ---
    const fFinanzas = document.getElementById('form-finanzas');
    if (fFinanzas) {
        fFinanzas.addEventListener('submit', async (e) => {
            e.preventDefault();
            finanzas.ventas = document.getElementById('input-ventas').value;
            finanzas.recaudado = document.getElementById('input-recaudado').value;
            finanzas.acumulado = document.getElementById('input-acumulado').value;
            await guardarEnNube('finanzas', finanzas);
            alert("Dinero sincronizado");
        });
    }

    await cargarDatosDesdeSupabase();
});