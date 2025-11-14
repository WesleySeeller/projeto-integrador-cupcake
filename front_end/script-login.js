document.addEventListener('DOMContentLoaded', () => {
    
    // Seu HTML tem o ID 'form-login-cliente', então usaremos ele
    const loginForm = document.getElementById('form-login-cliente');
    const emailInput = document.getElementById('login-email');
    const senhaInput = document.getElementById('login-senha');
    const messageArea = document.getElementById('message-area');

    if (!loginForm) {
        console.error("Formulário de login não encontrado. Verifique o ID 'form-login-cliente'.");
        return;
    }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); 

        const email = emailInput.value;
        const senha = senhaInput.value;
        
        messageArea.textContent = 'Autenticando...';
        messageArea.style.color = 'blue';

        const dadosLogin = {
            email: email,
            senha: senha
        };

        try {
            // --- 1. Fazer a chamada (fetch) para a API ---
            // APONTA PARA A NOVA ROTA UNIFICADA /api/login
            const response = await fetch('http://127.0.0.1:5000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dadosLogin)
            });

            const data = await response.json();

            // --- 2. Tratar a Resposta ---
            if (response.ok) { // Status 200 (OK)
                messageArea.textContent = data.message;
                messageArea.style.color = 'green';

                // --- 3. ARMAZENAMENTO DO TOKEN E PAPEL (CRUCIAL) ---
                localStorage.setItem('jwt_token', data.token);
                localStorage.setItem('user_role', data.papel); // 'cliente' ou 'admin'
                
                // --- 4. Redirecionamento baseado no Papel ---
                setTimeout(() => {
                    if (data.papel === 'admin') {
                        // Redireciona para o painel administrativo (próximo passo)
                        window.location.href = 'admin-dashboard.html'; 
                    } else {
                        // Redireciona para a página inicial do cliente
                        window.location.href = 'index.html'; 
                    }
                }, 1000);
                
            } else { // Status 401 (Unauthorized)
                messageArea.textContent = `Erro de Login: ${data.message}`;
                messageArea.style.color = 'red';
                // Limpa quaisquer tokens antigos em caso de falha de login
                localStorage.removeItem('jwt_token');
                localStorage.removeItem('user_role');
            }

        } catch (error) {
            console.error('Falha na requisição de login:', error);
            messageArea.textContent = 'Erro de conexão. Verifique se o servidor Flask está rodando.';
            messageArea.style.color = 'red';
        }
    });
});