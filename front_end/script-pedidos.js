document.addEventListener("DOMContentLoaded", function() {
    const token = localStorage.getItem('user_token');
    const nomeUsuario = localStorage.getItem('user_name');
    const messageArea = document.getElementById("message-area-pedidos");

    // 1. Verificação de Login no Front-End
    if (!token) {
        messageArea.textContent = "Você precisa estar logado para ver seus pedidos.";
        messageArea.style.color = "red";
        
        // Redireciona para o login se não houver token
        setTimeout(() => {
            window.location.href = "/front_end/login.html";
        }, 1500);
        return;
    }
    
    // 2. Se logado, buscar dados da rota protegida
    messageArea.textContent = `Olá, ${nomeUsuario}. Buscando seus pedidos...`;
    
    fetch("http://127.0.0.1:5000/api/pedidos/meus", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "x-access-token": token // <--- ENVIO DA CHAVE DE AUTENTICAÇÃO
        }
    })
    .then(response => response.json().then(data => ({ status: response.status, body: data })))
    .then(result => {
        if (result.status === 200) {
            messageArea.textContent = result.body.message;
            // AQUI VOCÊ USARIA result.body.pedidos para renderizar a lista na tela
            // Exemplo:
            const listaPedidos = document.getElementById("lista-pedidos");
            result.body.pedidos.forEach(pedido => {
                listaPedidos.innerHTML += `<p>Pedido #${pedido.id} - Status: ${pedido.status} - Total: R$${pedido.total.toFixed(2)}</p>`;
            });

        } else if (result.status === 401) {
            // Token expirado ou inválido (o Back-End retornou 401)
            messageArea.textContent = "Sessão expirada. Faça login novamente.";
            localStorage.removeItem('user_token'); // Limpa o token inválido
            setTimeout(() => {
                window.location.href = "/front_end/login.html";
            }, 1500);
        } else {
            messageArea.textContent = "Erro ao buscar pedidos.";
        }
    })
    .catch(error => {
        messageArea.textContent = "Erro de conexão com o servidor.";
    });
});