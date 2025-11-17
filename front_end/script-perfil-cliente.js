const API_URL = 'http://127.0.0.1:5000/api';
// Usa o token correto
const token = localStorage.getItem('jwt_token'); 
const role = localStorage.getItem('user_role');
const messageArea = document.getElementById('message-area');

// --- UTILS ---
function showMessage(msg, type = 'success') {
    messageArea.textContent = msg;
    messageArea.style.padding = '10px';
    messageArea.style.borderRadius = '4px';
    messageArea.style.display = 'block';
    
    if (type === 'success') {
        messageArea.style.backgroundColor = '#e0ffe0';
        messageArea.style.color = 'green';
    } else if (type === 'error') {
        messageArea.style.backgroundColor = '#ffe0e0';
        messageArea.style.color = 'red';
    } else { 
        messageArea.style.backgroundColor = '#e0f0ff';
        messageArea.style.color = 'blue';
    }
    
    setTimeout(() => { messageArea.style.display = 'none'; }, 5000);
}

function formatarPreco(preco) {
    if (typeof preco !== 'number') return 'R$ --';
    return `R$ ${preco.toFixed(2).replace('.', ',')}`;
}

function getStatusClass(status) {
    // Converte o status para classe CSS
    return `status-${status.toLowerCase().replace(' ', '-')}`;
}

// --- CONTROLE DE ABAS ---
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });
    document.querySelectorAll('.tab-menu button').forEach(button => {
        button.classList.remove('active');
    });

    document.getElementById(`${tabName}-content`).style.display = 'block';
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    if (tabName === 'pedidos') {
        loadPedidosCliente();
    } else if (tabName === 'endereco') {
        loadEndereco();
    }
}
window.showTab = showTab; 

// --- LÓGICA DE PEDIDOS DO CLIENTE ---

async function loadPedidosCliente() {
    const list = document.getElementById('pedidos-list');
    list.innerHTML = '<tr><td colspan="5">Carregando seus pedidos...</td></tr>';
    document.getElementById('pedido-details-area').innerHTML = ''; 

    try {
        // Rota para buscar pedidos do usuário logado 
        const response = await fetch(`${API_URL}/pedidos/meus`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        list.innerHTML = ''; 

        if (response.ok && data.pedidos && data.pedidos.length > 0) {
            data.pedidos.forEach(p => {
                const row = list.insertRow();
                row.insertCell().textContent = p.pedido_id;
                row.insertCell().textContent = new Date(p.data_pedido).toLocaleDateString();
                row.insertCell().textContent = formatarPreco(p.valor_total);
                
                const statusCell = row.insertCell();
                statusCell.textContent = p.status.toUpperCase();
                statusCell.className = getStatusClass(p.status);

                const actionsCell = row.insertCell();
                actionsCell.innerHTML = `<button onclick="showPedidoDetailsCliente(${p.pedido_id})" class="btn secondary">Ver Itens</button>`;
            });
        } else if (response.ok) {
            list.innerHTML = '<tr><td colspan="5">Você ainda não fez nenhum pedido.</td></tr>';
        } else {
             showMessage(`Erro ao carregar pedidos: ${data.message}`, 'error');
        }
    } catch (error) {
        showMessage(`Erro de conexão: ${error.message}.`, 'error');
        list.innerHTML = '<tr><td colspan="5">Falha ao conectar.</td></tr>';
    }
}

// Carrega os detalhes (itens) de um pedido específico
async function showPedidoDetailsCliente(pedidoId) {
    const detailsArea = document.getElementById('pedido-details-area');
    detailsArea.innerHTML = '<p style="text-align: center;">Buscando detalhes...</p>';
    
    try {
        // Rota para buscar detalhes de um pedido específico
        const response = await fetch(`${API_URL}/pedidos/${pedidoId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const details = await response.json();
        
        if (response.ok) {
            let itensHtml = details.itens.map(item => `
                <li>${item.quantidade}x ${item.nome_cupcake} (${formatarPreco(item.preco_unitario)})</li>
            `).join('');

            detailsArea.innerHTML = `
                <div class="pedido-detail" style="margin-top: 20px; padding: 15px; border: 1px solid #ffb6c1; border-radius: 5px; background-color: #fffaf0;">
                    <h3>Itens do Pedido #${pedidoId}</h3>
                    <p><strong>Status:</strong> <span class="${getStatusClass(details.status)}">${details.status.toUpperCase()}</span></p>
                    <p><strong>Endereço de Entrega:</strong> ${details.endereco}</p>
                    <p><strong>Valor Total:</strong> ${formatarPreco(details.valor_total)}</p>
                    <h4>Itens:</h4>
                    <ul>${itensHtml}</ul>
                </div>
            `;
        } else {
            showMessage(details.message || "Erro ao carregar detalhes do pedido.", 'error');
            detailsArea.innerHTML = '';
        }

    } catch (error) {
        showMessage('Erro de conexão ao buscar detalhes.', 'error');
        detailsArea.innerHTML = '';
    }
}
window.showPedidoDetailsCliente = showPedidoDetailsCliente;

// --- LÓGICA DE ENDEREÇO ---

async function loadEndereco() {
    const form = document.getElementById('endereco-form');
    form.reset();

    try {
        // Rota para buscar o endereço do cliente
        const response = await fetch(`${API_URL}/endereco`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.status === 404) {
            showMessage("Você ainda não cadastrou um endereço.", 'info');
            return;
        }
        
        const data = await response.json();
        
        if (response.ok) {
            // Preenche o formulário
            document.getElementById('rua').value = data.rua || '';
            document.getElementById('complemento').value = data.complemento || '';
            document.getElementById('bairro').value = data.bairro || '';
            document.getElementById('cidade').value = data.cidade || '';
            document.getElementById('estado').value = data.estado || '';
            document.getElementById('cep').value = data.cep || '';
            document.getElementById('numero').value = data.numero || '';
        } else {
            showMessage(data.message || "Erro ao carregar endereço.", 'error');
        }
    } catch (error) {
        showMessage('Erro de conexão ao carregar endereço.', 'error');
    }
}

document.getElementById('endereco-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const enderecoData = {
        rua: document.getElementById('rua').value,
        numero: document.getElementById('numero').value,
        complemento: document.getElementById('complemento').value,
        bairro: document.getElementById('bairro').value,
        cidade: document.getElementById('cidade').value,
        estado: document.getElementById('estado').value,
        cep: document.getElementById('cep').value,
    };
    
    document.querySelector('#endereco-form button').disabled = true;
    showMessage("Salvando endereço...", 'loading');

    try {
        // Rota para salvar/atualizar o endereço do cliente
        const response = await fetch(`${API_URL}/endereco`, {
            method: 'POST', // O back-end já lida com POST para salvar/atualizar
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(enderecoData)
        });

        const data = await response.json();
        if (response.ok) {
            showMessage(data.message || "Endereço salvo com sucesso!", 'success');
        } else {
            showMessage(data.message || "Erro ao salvar endereço.", 'error');
        }
    } catch (error) {
        showMessage(`Erro de conexão: ${error.message}.`, 'error');
    } finally {
        document.querySelector('#endereco-form button').disabled = false;
    }
});

// --- INICIALIZAÇÃO E CHECAGEM DE AUTH ---

document.addEventListener('DOMContentLoaded', () => {
    // Checagem de Auth: Deve ser um Cliente logado
    if (!token || role !== 'cliente') {
        if (!token) {
            showMessage("Acesso negado. Você precisa estar logado. Redirecionando...", 'error');
        } else if (role === 'admin') {
            showMessage("Acesso negado (Admin). Redirecionando para o dashboard...", 'error');
            setTimeout(() => { window.location.href = 'admin-dashboard.html'; }, 1500);
            return;
        }
        
        setTimeout(() => { window.location.href = 'login.html'; }, 1500); 
        return;
    }

    // Verifica se a URL tem um parâmetro para abrir a aba de endereço
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tab') === 'endereco') {
        showTab('endereco');
    } else {
        showTab('pedidos');
    }
});