// --- CONFIGURAÇÃO ---
const API_URL = 'http://127.0.0.1:5000/api';
const messageArea = document.getElementById('message-area');


function showMessage(msg, type = 'success') {
    if(!messageArea) return; // Adiciona checagem se a message-area existe
    messageArea.textContent = msg;
    messageArea.style.color = type === 'error' ? 'red' : (type === 'success' ? 'green' : 'blue');
    messageArea.style.backgroundColor = type === 'error' ? '#ffe0e0' : (type === 'success' ? '#e0ffe0' : '#e0f0ff');
    messageArea.style.padding = '10px';
    messageArea.style.borderRadius = '5px';
    messageArea.style.display = 'block';
    
    // Limpa a mensagem após 3 segundos
    setTimeout(() => { messageArea.style.display = 'none'; }, 3000);
}

function formatarPreco(preco) {
    if (typeof preco !== 'number') return 'R$ --';
    return `R$ ${preco.toFixed(2).replace('.', ',')}`;
}


// Função para obter o carrinho do localStorage
function getCarrinho() {
    const carrinhoJSON = localStorage.getItem('carrinhoCupcake');
    return carrinhoJSON ? JSON.parse(carrinhoJSON) : [];
}

// Função para salvar o carrinho no localStorage
function salvarCarrinho(carrinho) {
    localStorage.setItem('carrinhoCupcake', JSON.stringify(carrinho));
}

// Esta função salva o objeto 'cupcake' inteiro, incluindo o ID.
function adicionarAoCarrinho(cupcake) {
    const carrinho = getCarrinho();
    const cupcakeId = parseInt(cupcake.id); // Garante que o ID é um número

    const itemExistente = carrinho.find(item => item.id === cupcakeId);

    if (itemExistente) {
        itemExistente.quantidade += 1;
    } else {
        // Salva o objeto cupcake completo + quantidade
        carrinho.push({ 
            ...cupcake, 
            id: cupcakeId,
            quantidade: 1,
            // Mantém o preço original salvo para referência
            preco_unitario: cupcake.preco 
        });
    }

    salvarCarrinho(carrinho);
    showMessage(`${cupcake.nome} adicionado(a) ao carrinho!`, 'success');
}


// --- LÓGICA PRINCIPAL DO CARDÁPIO ---

document.addEventListener('DOMContentLoaded', () => {
    const cardapioDiv = document.getElementById('cardapio-publico');
    const loadingMessage = document.getElementById('loading-message');

    async function carregarCardapio() {
        
        if(loadingMessage) loadingMessage.textContent = 'Carregando cardápio...';
        
        try {
            // --- ESTA É A CORREÇÃO ---
            // Mudei a rota de volta para '/api/cupcakes/publico'
            // para corresponder ao seu app.py original.
            const response = await fetch(`${API_URL}/cupcakes/publico`); 
            
            if (!response.ok) {
                // Se der 404, é porque a rota está errada
                if (response.status === 404) {
                     throw new Error(`Rota não encontrada (404). Verifique se o back-end (app.py) tem a rota '/api/cupcakes/publico'.`);
                }
                throw new Error(`Erro do servidor: ${response.status}`);
            }
    
            // Assumindo que a rota /publico retorna a lista direto, não um objeto
            const data = await response.json();
            
            // Se a rota /publico retornar um objeto {cupcakes: []}, use:
            // const cupcakes = data.cupcakes;
            
            // Se a rota /publico retornar a lista direto:
            const cupcakes = data; 
            
            if (!Array.isArray(cupcakes)) {
                 throw new Error("Resposta inesperada do servidor. A lista de cupcakes não foi encontrada.");
            }
            
            if(cardapioDiv) cardapioDiv.innerHTML = '';
            if(loadingMessage) loadingMessage.textContent = ''; 
    
            if (cupcakes.length === 0) {
                if(loadingMessage) loadingMessage.textContent = 'Nenhum cupcake disponível no momento. Volte mais tarde!';
                return;
            }
    
            cupcakes.forEach(cupcake => {
                const card = document.createElement('div');
                card.className = 'cupcake-card';
                
                const precoFormatado = formatarPreco(cupcake.preco);

                // Botão para adicionar ao carrinho
                const buttonHtml = `<button class="btn primary add-to-cart" data-cupcake-id="${cupcake.id}">Adicionar ao Carrinho</button>`;

                card.innerHTML = `
                    <h3>${cupcake.nome}</h3>
                    <p>${cupcake.descricao || 'Um delicioso cupcake.'}</p>
                    <p class="preco">${precoFormatado}</p>
                    ${buttonHtml}
                `;
                cardapioDiv.appendChild(card);
            });

            // Adiciona os event listeners DEPOIS que os botões existem
            document.querySelectorAll('.add-to-cart').forEach(button => {
                button.addEventListener('click', (e) => {
                    const cupcakeId = parseInt(e.target.dataset.cupcakeId);
                    
                    // Encontra o objeto 'cupcake' completo na lista que veio da API
                    const cupcake = cupcakes.find(c => c.id === cupcakeId);
                    
                    if (cupcake) {
                        adicionarAoCarrinho(cupcake); // Envia o objeto inteiro
                    }
                });
            });
    
        } catch (error) {
            if(loadingMessage) {
                loadingMessage.classList.add('error-message');
                loadingMessage.textContent = `Erro ao carregar o cardápio: ${error.message}. Verifique a conexão com o servidor (porta 5000).`;
            }
            console.error('Erro ao buscar cardápio:', error);
        }
    }
    
    if(cardapioDiv) carregarCardapio();
});