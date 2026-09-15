// dashboard.js
document.addEventListener('DOMContentLoaded', async () => {
    const response = await fetch('/api/user');
    const userData = await response.json();

    if (userData.id) {
        const user_id = userData.id;
        const res = await fetch('/profesional/get-datos-prof', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ user_id }),
        });

        if (!res.ok) {
            console.error("Error al obtener el nombre:", res.status);
            return;
        }

        const fullNameData = await res.json()
        const name = fullNameData.nombre
        const apellido = fullNameData.apellido
        document.getElementById('userName').textContent = `Te damos la bienvenida, ${name} ${apellido}!`;
    }

    // --- Gestión de clínica (solo admin) ---
    try {
        const infoRes = await fetch('/clinica/info');
        if (infoRes.ok) {
            const info = await infoRes.json();
            if (info.esAdmin) {
                document.getElementById('clinicaAdmin').style.display = '';
                document.getElementById('clinicaNombre').textContent = info.clinica ? info.clinica.nombre : '—';
                mostrarLinkPublico(info.clinica && info.clinica.slug);
                await cargarCodigos();
                document.getElementById('btnGenerarCodigo').addEventListener('click', generarCodigo);
            }
        }
    } catch (e) {
        console.error('Error cargando gestión de clínica:', e);
    }
});

// Muestra el link público de turnos de la clínica (turnos.html?clinica=<slug>).
function mostrarLinkPublico(slug) {
    const box = document.getElementById('clinicaLinkBox');
    const input = document.getElementById('clinicaLink');
    const btn = document.getElementById('btnCopiarLink');
    if (!box || !input || !slug) return;

    const url = `${window.location.origin}/turnos.html?clinica=${encodeURIComponent(slug)}`;
    input.value = url;
    box.style.display = '';

    if (btn) {
        btn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(url);
            } catch (e) {
                input.select(); // fallback si no hay permiso de clipboard
                document.execCommand('copy');
            }
            if (window.Swal) {
                Swal.fire({ icon: 'success', title: 'Link copiado', timer: 1200, showConfirmButton: false });
            }
        });
    }
}

async function cargarCodigos() {
    const lista = document.getElementById('listaCodigos');
    try {
        const res = await fetch('/clinica/codigos');
        const data = await res.json();
        lista.innerHTML = '';
        (data.codigos || []).forEach(c => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `<code>${c.codigo}</code>` +
                `<span class="badge ${c.usado ? 'bg-secondary' : 'bg-success'}">${c.usado ? 'Usado' : 'Disponible'}</span>`;
            lista.appendChild(li);
        });
        if (lista.children.length === 0) {
            lista.innerHTML = '<li class="list-group-item text-muted">Todavía no generaste códigos.</li>';
        }
    } catch (e) {
        console.error('Error listando códigos:', e);
    }
}

async function generarCodigo() {
    const btn = document.getElementById('btnGenerarCodigo');
    btn.disabled = true;
    try {
        const res = await fetch('/clinica/generar-codigo', { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            await cargarCodigos();
            if (window.Swal) {
                Swal.fire({ icon: 'success', title: 'Código generado', text: data.codigo });
            } else {
                alert('Código generado: ' + data.codigo);
            }
        } else {
            alert(data.error || 'No se pudo generar el código');
        }
    } catch (e) {
        console.error('Error generando código:', e);
    } finally {
        btn.disabled = false;
    }
}
