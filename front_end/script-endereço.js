const API_URL = 'http://127.0.0.1:5000/api';

document.addEventListener('DOMContentLoaded', () => {
    const enderecoForm = document.getElementById('endereco-form');
    
    // Função para exibir mensagens
    function showMessage(message, type = 'success') {
        const messageArea = document.getElementById('message-area');
        messageArea.innerHTML = `<div class="message ${type}">${message}</div>`;
    }

    // --- 1. CARREGAR ENDEREÇO EXISTENTE (GET) ---
    async function carregarEndereco() {
        const token = localStorage.getItem('jwt_token');
        if (!token) return; // Se não houver token, o auth já redirecionou, mas é um seguro.

        try {
            const response = await fetch(`${API_URL}/endereco`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                
                // Preenche o formulário com os dados retornados
                document.getElementById('cep').value = data.cep || '';
                document.getElementById('rua').value = data.rua || '';
                document.getElementById('numero').value = data.numero || '';
                document.getElementById('complemento').value = data.complemento || '';
                document.getElementById('bairro').value = data.bairro || '';
                document.getElementById('cidade').value = data.cidade || '';
                document.getElementById('estado').value = data.estado || '';

            } else if (response.status === 404) {
                // Endereço não encontrado, o formulário deve permanecer vazio para o POST
                showMessage('Preencha o formulário abaixo para salvar seu primeiro endereço.', 'info');
            } else {
                showMessage('Erro ao carregar endereço. Faça login novamente.', 'error');
            }
        } catch (error) {
            showMessage('Erro de conexão com o servidor. O Flask está rodando?', 'error');
        }
    }

    // --- 2. SALVAR/ATUALIZAR ENDEREÇO (POST/PUT) ---
    enderecoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('jwt_token');

        const enderecoData = {
            cep: document.getElementById('cep').value,
            rua: document.getElementById('rua').value,
            numero: document.getElementById('numero').value,
            complemento: document.getElementById('complemento').value,
            bairro: document.getElementById('bairro').value,
            cidade: document.getElementById('cidade').value,
            estado: document.getElementById('estado').value,
        };

        try {
            const response = await fetch(`${API_URL}/endereco`, {
                method: 'POST', // O Flask lida com POST/PUT na mesma rota
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(enderecoData)
            });

            const data = await response.json();

            if (response.ok) {
                showMessage(data.message, 'success');
                // Recarrega o endereço para garantir que os dados de GET e POST são consistentes
                carregarEndereco(); 
            } else {
                showMessage(`Erro ao salvar: ${data.message || 'Verifique os campos.'}`, 'error');
            }

        } catch (error) {
            showMessage('Erro de rede. Verifique se o servidor está ativo.', 'error');
        }
    });

    // Inicia o carregamento
    carregarEndereco();
});