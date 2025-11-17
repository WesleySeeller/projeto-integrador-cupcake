document.addEventListener('DOMContentLoaded', () => {
    const serverMessage = document.getElementById('server-message');
    const cupcakesList = document.getElementById('cupcakes-list');
    const formCriar = document.getElementById('form-criar-cupcake');

    const token = localStorage.getItem('jwt_token');

    // Função de tratamento de erro de conexão
    function displayConnectionError(message = 'Erro de conexão com o servidor. O servidor Flask está rodando?') {
        serverMessage.textContent = message;
        serverMessage.style.color = 'red';
        cupcakesList.innerHTML = '<li>Falha ao carregar dados.</li>';
    }

    // --- CARREGAR CUPCAKES EXISTENTES (ROTA GET) ---
    async function carregarCupcakes() {
        if (!token) {
            displayConnectionError('Acesso não autorizado. Faça login como administrador.');
            return;
        }

        serverMessage.textContent = 'Carregando lista...';
        serverMessage.style.color = 'blue';

        try {
            const response = await fetch('http://127.0.0.1:5000/api/admin/cupcakes', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}` // Envia o JWT para autenticação
                }
            });

            if (response.ok) {
                const data = await response.json();
                serverMessage.textContent = ''; // Limpa a mensagem de carregamento
                renderizarCupcakes(data.cupcakes);
            } else if (response.status === 401) {
                // Token expirado ou inválido
                displayConnectionError('Sessão expirada ou token inválido. Faça login novamente.');
                localStorage.clear();
                setTimeout(() => window.location.href = 'login.html', 2000);
            } else {
                displayConnectionError(`Erro ao carregar cupcakes: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            displayConnectionError();
            console.error('Erro de rede:', error);
        }
    }

    function renderizarCupcakes(cupcakes) {
        if (cupcakes.length === 0) {
            cupcakesList.innerHTML = '<p>Nenhum cupcake cadastrado.</p>';
            return;
        }

        cupcakesList.innerHTML = ''; 
        
        const ul = document.createElement('ul'); 
        
        cupcakes.forEach(cupcake => {
            const li = document.createElement('li');
            
            li.innerHTML = `
                ID ${cupcake.id} | ${cupcake.nome} (R$ ${cupcake.preco.toFixed(2)}) - 
                <span style="color: ${cupcake.disponivel ? 'green' : 'red'}; font-weight: bold;">
                    ${cupcake.disponivel ? 'Disponível' : 'Indisponível'}
                </span>
                <button onclick="window.editarCupcake(${cupcake.id})" class="btn-small">Editar</button>
                <button onclick="window.excluirCupcake(${cupcake.id})" class="btn-small btn-danger">Excluir</button>
            `;
            ul.appendChild(li);
        });

        cupcakesList.appendChild(ul);
    }

    //  SUBMISSÃO DO FORMULÁRIO DE CRIAÇÃO (ROTA POST) ---
    formCriar.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nome = document.getElementById('input-nome').value;
        const descricao = document.getElementById('input-descricao').value;
        const preco = document.getElementById('input-preco').value;

        try {
            const response = await fetch('http://127.0.0.1:5000/api/admin/cupcakes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ nome, descricao, preco })
            });

            const data = await response.json();
            serverMessage.textContent = data.message;
            serverMessage.style.color = response.ok ? 'green' : 'red';
            
            if (response.ok) {
                formCriar.reset(); 
                carregarCupcakes(); 
            }
        } catch (error) {
            displayConnectionError();
            console.error('Erro de rede ao criar cupcake:', error);
        }
    });

    // --- 4. FUNÇÕES GLOBAIS DE CRUD (placeholder) ---
    window.excluirCupcake = async (id) => {
        if (!confirm(`Tem certeza que deseja excluir o Cupcake ID ${id}? Esta ação não pode ser desfeita.`)) {
            return; // Usuário cancelou
        }
    
        const token = localStorage.getItem('jwt_token');
        const serverMessage = document.getElementById('server-message');
    
        try {
            const response = await fetch(`http://127.0.0.1:5000/api/admin/cupcakes/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
    
            const data = await response.json();
            serverMessage.textContent = data.message;
            serverMessage.style.color = response.ok ? 'green' : 'red';
            
            if (response.ok) {
                carregarCupcakes(); 
            }
        } catch (error) {
            serverMessage.textContent = 'Erro de rede ao excluir cupcake.';
            serverMessage.style.color = 'red';
            console.error('Erro de rede ao excluir:', error);
        }
    };
    
    // --- FUNÇÃO PARA EDITAR CUPCAKE (PUT) ---
    window.editarCupcake = async (id) => {
        const token = localStorage.getItem('jwt_token');
        const serverMessage = document.getElementById('server-message');
    
        const novoPrecoStr = prompt(`Digite o NOVO PREÇO para o Cupcake ID ${id}:`);
        
        // Verifica se o usuário cancelou ou inseriu um valor inválido
        if (novoPrecoStr === null || isNaN(parseFloat(novoPrecoStr)) || parseFloat(novoPrecoStr) <= 0) {
            alert("Edição cancelada ou preço inválido.");
            return; 
        }
        
        const novoPreco = parseFloat(novoPrecoStr).toFixed(2);
        
        
        const dataParaEnvio = {
            nome: "Nome Temporário", 
            descricao: "Descrição Temporária",
            preco: novoPreco 
        };
    
        try {
            const response = await fetch(`http://127.0.0.1:5000/api/admin/cupcakes/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(dataParaEnvio)
            });
    
            const data = await response.json();
            serverMessage.textContent = data.message;
            serverMessage.style.color = response.ok ? 'green' : 'red';
            
            if (response.ok) {
                carregarCupcakes(); 
            }
        } catch (error) {
            serverMessage.textContent = 'Erro de rede ao editar cupcake.';
            serverMessage.style.color = 'red';
            console.error('Erro de rede ao editar:', error);
        }
    };
    
    carregarCupcakes();
});