document.addEventListener('DOMContentLoaded', () => {
    const serverMessage = document.getElementById('server-message');
    const cupcakesList = document.getElementById('cupcakes-list');
    const formCriar = document.getElementById('form-criar-cupcake');
    
    const token = localStorage.getItem('jwt_token');

    // --- Seletores do Modal ---
    const modalEdicao = document.getElementById('modal-edicao');
    const formEdicao = document.getElementById('form-edicao');
    const modalTitulo = document.getElementById('modal-titulo');
    const btnCancelar = document.getElementById('btn-cancelar');

    // Função de utilidade para exibir mensagens
    function showMessage(msg, type = 'info') {
        serverMessage.innerHTML = msg; 
        
        serverMessage.style.color = type === 'error' ? 'red' : (type === 'success' ? 'green' : 'blue');
        serverMessage.style.backgroundColor = type === 'error' ? '#ffe0e0' : (type === 'success' ? '#e0ffe0' : '#e0f0ff');
        serverMessage.style.padding = '10px';
        serverMessage.style.border = '1px solid ' + (type === 'error' ? 'red' : (type === 'success' ? 'green' : 'blue'));
        serverMessage.style.borderRadius = '5px';
        
        // Se for apenas uma mensagem de sucesso/info, limpa após 5s
        if (!msg.includes('<button') && type !== 'error') {
             setTimeout(() => { limparMensagem() }, 5000);
        }
    }

    // Função para limpar a mensagem
    function limparMensagem() {
        serverMessage.innerHTML = '';
        serverMessage.style.backgroundColor = 'transparent';
        serverMessage.style.padding = '0';
        serverMessage.style.border = 'none';
    }

    // --- CARREGAR CUPCAKES EXISTENTES (ROTA GET) ---
    async function carregarCupcakes() {
        if (!token) {
            showMessage('Acesso não autorizado. Faça login como administrador.', 'error');
            return;
        }
        showMessage('Carregando lista...', 'info');

        try {
            const response = await fetch('http://127.0.0.1:5000/api/admin/cupcakes', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                limparMensagem(); 
                renderizarCupcakes(data.cupcakes);
            } else if (response.status === 401) {
                showMessage('Sessão expirada ou token inválido. Faça login novamente.', 'error');
                localStorage.clear();
                setTimeout(() => window.location.href = 'login.html', 2000);
            } else {
                showMessage(`Erro ao carregar cupcakes: ${response.status} ${response.statusText}`, 'error');
            }
        } catch (error) {
            showMessage('Erro de conexão com o servidor. O servidor Flask está rodando?', 'error');
            console.error('Erro de rede:', error);
        }
    }

    // --- RENDERIZAR CUPCAKES NA TELA ---
    function renderizarCupcakes(cupcakes) {
        if (cupcakes.length === 0) {
            cupcakesList.innerHTML = '<p>Nenhum cupcake cadastrado.</p>';
            return;
        }
        cupcakesList.innerHTML = ''; 
        const ul = document.createElement('ul'); 
        
        cupcakes.forEach(cupcake => {
            const li = document.createElement('li');
            
            // Prepara o JSON para ser colocado no atributo data 
            const cupcakeJSON = JSON.stringify(cupcake).replace(/"/g, '&quot;');

            li.innerHTML = `
                ID ${cupcake.id} | ${cupcake.nome} (R$ ${cupcake.preco.toFixed(2)}) - 
                <span style="color: ${cupcake.disponivel ? 'green' : 'red'}; font-weight: bold;">
                    ${cupcake.disponivel ? 'Disponível' : 'Indisponível'}
                </span>
                <button class="btn-small btn-edit" data-cupcake-json="${cupcakeJSON}">Editar</button>
                <button class="btn-small btn-danger btn-delete" data-id="${cupcake.id}" data-nome="${cupcake.nome}">Excluir</button>
            `;
            ul.appendChild(li);
        });
        cupcakesList.appendChild(ul);
    }

    // --- CRIAÇÃO DE CUPCAKE (ROTA POST) ---
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
            showMessage(data.message, response.ok ? 'success' : 'error');
            
            if (response.ok) {
                formCriar.reset(); 
                carregarCupcakes(); 
            }
        } catch (error) {
            showMessage('Erro de rede ao criar cupcake.', 'error');
            console.error('Erro de rede ao criar cupcake:', error);
        }
    });

    // --- LÓGICA DE EVENTOS (EDITAR E EXCLUIR) ---

    // Função para abrir o modal de edição
    function abrirModalEdicao(cupcake) {
        modalTitulo.textContent = `Editar Cupcake (ID: ${cupcake.id})`;
        document.getElementById('edit-id').value = cupcake.id;
        document.getElementById('edit-nome').value = cupcake.nome;
        document.getElementById('edit-descricao').value = cupcake.descricao;
        document.getElementById('edit-preco').value = cupcake.preco.toFixed(2);
        document.getElementById('edit-disponivel').value = cupcake.disponivel ? '1' : '0';
        modalEdicao.style.display = 'block';
    }

    // Função para fechar o modal
    function fecharModalEdicao() {
        modalEdicao.style.display = 'none';
    }
    btnCancelar.addEventListener('click', fecharModalEdicao);

    // Função para mostrar a confirmação de exclusão 
    function confirmarExclusao(id, nome) {
        const promptHtml = `
            Tem certeza que deseja excluir o cupcake <strong>"${nome}" (ID ${id})</strong>?
            <div style="margin-top: 10px;">
                <button id="btn-confirmar-delete" data-id="${id}" class="btn-small btn-danger">Sim, Excluir</button>
                <button id="btn-cancelar-delete" class="btn-small">Cancelar</button>
            </div>
        `;
        showMessage(promptHtml, 'error');
    }

    // Função que REALMENTE executa a exclusão
    async function executarExclusao(id) {
        showMessage('Excluindo...', 'info');
        try {
            const response = await fetch(`http://127.0.0.1:5000/api/admin/cupcakes/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` } 
            });
    
            const data = await response.json();
            showMessage(data.message, response.ok ? 'success' : 'error');
            
            if (response.ok) {
                carregarCupcakes(); 
            }
        } catch (error) {
            showMessage('Erro de rede ao excluir cupcake.', 'error');
            console.error('Erro de rede ao excluir:', error);
        }
    }

    // Gerenciador de eventos principal para a lista de cupcakes
    cupcakesList.addEventListener('click', (e) => {
        const target = e.target;
        
        // Se clicou no botão "Editar"
        if (target.classList.contains('btn-edit')) {
            const cupcake = JSON.parse(target.dataset.cupcakeJson);
            abrirModalEdicao(cupcake);
        }
        
        // Se clicou no botão "Excluir"
        if (target.classList.contains('btn-delete')) {
            const id = target.dataset.id;
            const nome = target.dataset.nome;
            confirmarExclusao(id, nome);
        }
    });

    // Gerenciador de eventos para os botões de confirmação de exclusão 
    serverMessage.addEventListener('click', (e) => {
        if (e.target.id === 'btn-confirmar-delete') {
            const id = e.target.dataset.id;
            executarExclusao(id);
        }
        if (e.target.id === 'btn-cancelar-delete') {
            limparMensagem();
        }
    });

    // --- LÓGICA DO MODAL DE EDIÇÃO (ROTA PUT) ---
    formEdicao.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('edit-id').value;
        const dataParaEnvio = {
            nome: document.getElementById('edit-nome').value,
            descricao: document.getElementById('edit-descricao').value,
            preco: parseFloat(document.getElementById('edit-preco').value),
            disponivel: parseInt(document.getElementById('edit-disponivel').value)
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
            showMessage(data.message, response.ok ? 'success' : 'error');
            
            if (response.ok) {
                fecharModalEdicao();
                carregarCupcakes(); 
            }
        } catch (error) {
            showMessage('Erro de rede ao editar cupcake.', 'error');
            console.error('Erro de rede ao editar:', error);
        }
    });

    carregarCupcakes();
});