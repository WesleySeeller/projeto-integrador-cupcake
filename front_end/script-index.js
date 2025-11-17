// --- CONFIGURAÇÃO ---
const API_URL = 'http://127.0.0.1:5000/api';
const messageArea = document.getElementById('message-area');


function showMessage(msg, type = 'success') {
    messageArea.textContent = msg;
    messageArea.style.color = type === 'error' ? 'red' : (type === 'success' ? 'green' : 'blue');
    messageArea.style.backgroundColor = type === 'error' ? '#ffe0e0' : (type === 'success' ? '#e0ffe0' : '#e0f0ff');
    messageArea.style.padding = '10px';
    messageArea.style.borderRadius = '5px';
    messageArea.style.display = 'block';
    
    // Limpa a mensagem após 5 segundos
    setTimeout(() => { messageArea.style.display = 'none'; }, 5000);
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

// Função para adicionar um item ao carrinho
function adicionarAoCarrinho(cupcake) {
    const carrinho = getCarrinho();
    const cupcakeId = parseInt(cupcake.id); 

    const itemExistente = carrinho.find(item => item.id === cupcakeId);

    if (itemExistente) {
        itemExistente.quantidade += 1;
    } else {
        carrinho.push({ 
            ...cupcake, 
            id: cupcakeId,
            quantidade: 1,
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
        
        loadingMessage.textContent = 'Carregando cardápio...';
        
        try {
            // Requisição para o Flask
            const response = await fetch(`${API_URL}/cupcakes/publico`); 
            
            if (!response.ok) {
                throw new Error(`Erro do servidor: ${response.status}`);
            }
    
            const data = await response.json();
            
            if (!Array.isArray(data)) {
                throw new Error("Resposta inesperada do servidor. Não é uma lista de cupcakes.");
            }
            
            cardapioDiv.innerHTML = '';
            loadingMessage.textContent = ''; 
    
            if (data.length === 0) {
                loadingMessage.textContent = 'Nenhum cupcake disponível no momento. Volte mais tarde!';
                return;
            }
    
            data.forEach(cupcake => {
                const card = document.createElement('div');
                card.className = 'cupcake-card';
                
                const precoFormatado = formatarPreco(cupcake.preco);

                const buttonHtml = `<button class="btn primary add-to-cart" data-cupcake-id="${cupcake.id}">Adicionar ao Carrinho</button>`;

                card.innerHTML = `
                    <h3>${cupcake.nome}</h3>
                    <p>${cupcake.descricao}</p>
                    <p class="preco">${precoFormatado}</p>
                    ${buttonHtml}
                `;
                cardapioDiv.appendChild(card);
            });

            document.querySelectorAll('.add-to-cart').forEach(button => {
                button.addEventListener('click', (e) => {
                    const cupcakeId = parseInt(e.target.dataset.cupcakeId);
                    
                    const cupcake = data.find(c => c.id === cupcakeId);
                    
                    if (cupcake) {
                        adicionarAoCarrinho(cupcake);
                    }
                });
            });
    
        } catch (error) {
            loadingMessage.classList.add('error-message');
            loadingMessage.textContent = `Erro ao carregar o cardápio: ${error.message}. Verifique a conexão com o servidor (porta 5000).`;
            console.error('Erro ao buscar cardápio:', error);
        }
    }
    
    carregarCardapio();
});