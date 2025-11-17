document.addEventListener('DOMContentLoaded', () => {
    
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
        
        const roleElement = document.querySelector('input[name="role"]:checked');
        const role = roleElement ? roleElement.value : 'cliente'; 
        
        messageArea.textContent = 'Autenticando...';
        messageArea.style.color = '#3b82f6'; 

        const dadosLogin = {
            email: email,
            senha: senha,
            role: role 
        };

        try {
            const response = await fetch('http://127.0.0.1:5000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dadosLogin)
            });

            const data = await response.json();

            if (response.ok) { 
                messageArea.textContent = 'Login realizado com sucesso! Redirecionando...';
                messageArea.style.color = '#22c55e'; 

                
                localStorage.setItem('jwt_token', data.token); 
                localStorage.setItem('user_role', data.role); 
                
               
                setTimeout(() => {
                    if (data.role === 'admin') {
                        window.location.href = 'admin-dashboard.html'; 
                    } else {
                        window.location.href = 'index.html'; 
                    }
                }, 1000);
                
            } else { 
                messageArea.textContent = `Erro de Login: ${data.message}`;
                messageArea.style.color = '#ef4444'; 
                localStorage.removeItem('jwt_token');
                localStorage.removeItem('user_role');
            }

        } catch (error) {
            console.error('Falha na requisição de login:', error);
            messageArea.textContent = 'Erro de conexão. Verifique se o servidor Flask está rodando.';
            messageArea.style.color = '#ef4444'; 
        }
    });
});