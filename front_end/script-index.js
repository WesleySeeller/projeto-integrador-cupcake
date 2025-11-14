// --- FUNÇÕES DE CARRINHO (Compartilhadas com carrinho.js) ---

// Função para obter o carrinho do localStorage
function getCarrinho() {
    const carrinhoJSON = localStorage.getItem('carrinhoCupcake');
    // Retorna o carrinho como objeto ou um array vazio se não existir
    return carrinhoJSON ? JSON.parse(carrinhoJSON) : [];
}

// Função para salvar o carrinho no localStorage
function salvarCarrinho(carrinho) {
    localStorage.setItem('carrinhoCupcake', JSON.stringify(carrinho));
}

// Função para adicionar um item ao carrinho
function adicionarAoCarrinho(cupcake) {
    const carrinho = getCarrinho();
    const itemExistente = carrinho.find(item => item.id === cupcake.id);

    if (itemExistente) {
        itemExistente.quantidade += 1;
    } else {
        // Garantir que a quantidade inicial é 1
        carrinho.push({ ...cupcake, quantidade: 1 });
    }

    salvarCarrinho(carrinho);
    alert(`${cupcake.nome} adicionado(a) ao carrinho!`);
}


// --- LÓGICA PRINCIPAL DO CARDÁPIO ---

document.addEventListener('DOMContentLoaded', () => {
    const cardapioDiv = document.getElementById('cardapio-publico');
    const loadingMessage = document.getElementById('loading-message');

    async function carregarCardapio() {
        
        loadingMessage.textContent = 'Carregando cardápio...';
        
        try {
            // Requisição para o Flask
            const response = await fetch('http://127.0.0.1:5000/api/cupcakes/publico'); 
            
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
                
                // CRIAÇÃO DO BOTÃO "ADICIONAR AO CARRINHO"
                const buttonHtml = `<button class="btn primary add-to-cart" data-id="${cupcake.id}">Adicionar ao Carrinho</button>`;

                card.innerHTML = `
                    <h3>${cupcake.nome}</h3>
                    <p>${cupcake.descricao}</p>
                    <p class="preco">${cupcake.preco_formatado}</p>
                    ${buttonHtml}
                `;
                cardapioDiv.appendChild(card);
            });

            // Adiciona listener de clique para todos os botões de carrinho
            document.querySelectorAll('.add-to-cart').forEach(button => {
                button.addEventListener('click', (e) => {
                    const cupcakeId = parseInt(e.target.dataset.id);
                    
                    // Encontra o objeto cupcake completo a partir dos dados carregados
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
    
    // CORREÇÃO: Chama a função apenas uma vez no DOMContentLoaded
    carregarCardapio();
});