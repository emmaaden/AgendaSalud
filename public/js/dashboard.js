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
});
