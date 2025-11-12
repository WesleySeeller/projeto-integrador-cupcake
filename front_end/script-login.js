// Crie este arquivo como 'script-login.js' dentro da sua pasta 'front_end'

document.addEventListener("DOMContentLoaded", function() {
    
    // Certifique-se de que estes IDs ('form-login-cliente', 'login-email', 'login-senha') 
    // existem no seu HTML.
    const loginForm = document.getElementById("form-login-cliente");
    const emailInput = document.getElementById("login-email");
    const senhaInput = document.getElementById("login-senha");

    // Adiciona um listener para o evento de 'submit' (clicar no botão ou apertar Enter)
    loginForm.addEventListener("submit", function(event) {
        
        // ESSENCIAL: Impede o comportamento padrão do formulário (que recarregaria a página)
        event.preventDefault(); 
        
        const email = emailInput.value;
        const senha = senhaInput.value;

        const dadosLogin = {
            email: email,
            senha: senha
        };

        // Faz a chamada de rede (Network) para o Flask (Porta 5000)
        fetch("http://127.0.0.1:5000/api/login/cliente", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dadosLogin) 
        })
        .then(response => {
            if (response.ok) {
                // Se o status for 200 (Sucesso), continua para a próxima linha
                console.log("Recebido status 200 (Sucesso) do Python.");
                return response.json(); 
            } else {
                // Se o status for 401 ou outro erro do servidor
                console.error("Login Falhou. Status:", response.status);
                throw new Error("E-mail ou senha inválidos.");
            }
        })
        .then(data => {
            // Se chegou aqui, o login foi um sucesso
            console.log("Login bem-sucedido. Redirecionando...");
            
            // ESSENCIAL: Linha que faz o redirecionamento
            window.location.href = "index.html"; 
        })
        .catch(error => {
            // Este bloco captura erros de rede ou a exceção que jogamos no 'else' acima
            console.error("Ocorreu um erro no processo de login:", error);
            alert(error.message); // Exibe uma mensagem de erro simples
        });
    });
});