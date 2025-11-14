document.addEventListener("DOMContentLoaded", function() {
    const loginForm = document.getElementById("form-login-admin");
    const emailInput = document.getElementById("admin-email");
    const senhaInput = document.getElementById("admin-senha");
    const messageArea = document.getElementById("message-area-admin"); 

    if (loginForm) {
        loginForm.addEventListener("submit", function(event) {
            event.preventDefault(); 

            const dadosLogin = {
                email: emailInput.value,
                senha: senhaInput.value
            };
            
            messageArea.textContent = "Verificando credenciais de Admin...";
            messageArea.style.color = "blue";

            // Chamada à nova API de Login de Admin
            fetch("http://127.0.0.1:5000/api/login/admin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dadosLogin) 
            })
            .then(response => response.json().then(data => ({ status: response.status, body: data })))
            .then(result => {
                messageArea.textContent = result.body.message;

                if (result.status === 200) { // Sucesso no login
                    messageArea.style.color = "green";
                    
                    // Salvar o Token de ADMIN (diferente do token do cliente)
                    localStorage.setItem('admin_token', result.body.token);
                    localStorage.setItem('admin_name', result.body.nome);

                    // Redirecionar para o Dashboard do Administrador
                    setTimeout(() => {
                        // Vamos redirecionar para uma página que chamaremos de admin-dashboard.html
                        window.location.href = "/front_end/admin-dashboard.html"; 
                    }, 1000);

                } else { // Erro (401, 500)
                    messageArea.style.color = "red";
                }
            })
            .catch(error => {
                messageArea.textContent = "Erro de conexão. Verifique se o servidor Python está rodando.";
                messageArea.style.color = "red";
            });
        });
    }
});