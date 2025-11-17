document.addEventListener('DOMContentLoaded', () => {
    const cadastroForm = document.getElementById('cadastro-form');
    const messageArea = document.getElementById('message-area');

    if (!cadastroForm) {
        console.error("Formulário de cadastro não encontrado. Verifique o ID 'cadastro-form'.");
        return;
    }

    cadastroForm.addEventListener('submit', async (event) => {
        event.preventDefault(); 

        const nomeInput = document.getElementById('cadastro-nome');
        const nome = nomeInput ? nomeInput.value : '';
        
        const email = document.getElementById('cadastro-email').value;
        const senha = document.getElementById('cadastro-senha').value;
        const confirmarSenha = document.getElementById('cadastro-confirmar-senha').value;
        
        // Validação de senhas
        if (senha !== confirmarSenha) {
            messageArea.textContent = 'Erro: As senhas não coincidem.';
            messageArea.style.color = '#ef4444'; 
            return;
        }
        
        const dadosCadastro = {
            nome: nome, 
            email: email,
            senha: senha,
            role: 'cliente' 
        };

        messageArea.textContent = 'Registrando...';
        messageArea.style.color = '#3b82f6'; 

        try {
            const response = await fetch('http://127.0.0.1:5000/api/cadastro', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dadosCadastro)
            });

            const data = await response.json();

            if (response.ok) {
                messageArea.textContent = 'Cadastro de cliente realizado com sucesso! Redirecionando para o login...';
                messageArea.style.color = '#22c55e'; 
                
                setTimeout(() => {
                    window.location.href = 'login.html'; 
                }, 1000);
                
            } else {
                messageArea.textContent = `Falha no Cadastro: ${data.message}`;
                messageArea.style.color = '#ef4444'; 
            }

        } catch (error) {
            console.error('Falha na requisição de cadastro:', error);
            messageArea.textContent = 'Erro de conexão. Verifique se o servidor Flask está rodando.';
            messageArea.style.color = '#ef4444'; 
        }
    });
});