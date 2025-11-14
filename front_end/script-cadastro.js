document.addEventListener('DOMContentLoaded', () => {
    
    // Seleciona os elementos do formulário
    const cadastroForm = document.getElementById('cadastro-form');
    const emailInput = document.getElementById('cadastro-email');
    const senhaInput = document.getElementById('cadastro-senha');
    const confirmarSenhaInput = document.getElementById('cadastro-confirmar-senha');
    const messageArea = document.getElementById('message-area');

    // Adiciona o 'escutador' de evento para o envio do formulário
    cadastroForm.addEventListener('submit', async (event) => {
        // Impede o recarregamento padrão da página
        event.preventDefault(); 

        const email = emailInput.value;
        const senha = senhaInput.value;
        const confirmarSenha = confirmarSenhaInput.value;

        // --- 1. Validação no Front-End ---
        if (senha !== confirmarSenha) {
            messageArea.textContent = 'As senhas não coincidem. Tente novamente.';
            messageArea.style.color = 'red';
            return;
        }
        
        messageArea.textContent = 'Registrando...';
        messageArea.style.color = 'blue';

        // --- 2. Preparar dados para o Back-End ---
        const dadosCadastro = {
            email: email,
            senha: senha
        };

        try {
            // --- 3. Fazer a chamada (fetch) para a API ---
            // APONTA PARA A NOVA ROTA /api/cadastro
            const response = await fetch('http://127.0.0.1:5000/api/cadastro', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dadosCadastro)
            });

            const data = await response.json();

            // --- 4. Tratar a Resposta ---
            if (response.ok) { // Status 201 (Created)
                messageArea.textContent = data.message + ' Você será redirecionado para o login.';
                messageArea.style.color = 'green';
                
                // Redireciona para o login após 2 segundos
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
                
            } else { // Status 400 (Bad Request) ou 409 (Conflict)
                messageArea.textContent = `Erro: ${data.message}`;
                messageArea.style.color = 'red';
            }

        } catch (error) {
            // Erro de rede (ex: servidor Flask desligado)
            console.error('Falha na requisição de cadastro:', error);
            messageArea.textContent = 'Erro de conexão. Verifique se o servidor está rodando.';
            messageArea.style.color = 'red';
        }
    });
});