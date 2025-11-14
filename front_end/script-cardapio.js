// URL BASE DO SEU BACK-END FLASK
// Usamos a URL completa para evitar ambiguidades com o Live Server
const API_URL = 'http://127.0.0.1:5000/api'; 

// Elementos da DOM
const cardapioDiv = document.getElementById('cardapio-publico');
const loadingMessage = document.getElementById('loading-message');
const messageArea = document.getElementById('message-area'); // Adicionado para mensagens temporárias

// =========================================================
// 1. FUNÇÕES DO CARRINHO (Front-End - LocalStorage)
// =========================================================

/**
 * Carrega o carrinho do localStorage.
 * @returns {Array} Lista de itens no carrinho.
 */
function carregarCarrinho() {
    try {
        const carrinho = localStorage.getItem('cupcakeCarrinho');
        return carrinho ? JSON.parse(carrinho) : [];
    } catch (e) {
        console.error("Erro ao carregar carrinho do localStorage:", e);
        return [];
    }
}

/**
 * Salva a lista de itens do carrinho no localStorage.
 * @param {Array} carrinho Lista de itens atualizada.
 */
function salvarCarrinho(carrinho) {
    localStorage.setItem('cupcakeCarrinho', JSON.stringify(carrinho));
}

/**
 * Adiciona um cupcake ao carrinho ou incrementa sua quantidade.
 * @param {string} nome Nome do cupcake.
 * @param {number} preco Preço do cupcake.
 */
function adicionarAoCarrinho(nome, preco) {
    const carrinho = carregarCarrinho();
    const precoFormatado = parseFloat(preco); // Garantir que o preço é um número

    let itemExistente = carrinho.find(item => item.nome === nome);

    if (itemExistente) {
        itemExistente.quantidade += 1;
    } else {
        carrinho.push({
            nome: nome,
            preco: precoFormatado,
            quantidade: 1
        });
    }

    salvarCarrinho(carrinho);
    exibirMensagem(`"${nome}" adicionado ao carrinho! Total: ${carrinho.length} itens.`);
    console.log("Carrinho Atualizado:", carrinho);

    // TODO: Atualizar o ícone do carrinho se houver um na tela
}

/**
 * Exibe uma mensagem temporária na área de mensagens.
 * @param {string} msg Mensagem a ser exibida.
 */
let messageTimeout;
function exibirMensagem(msg) {
    if (messageArea) {
        messageArea.textContent = msg;
        messageArea.style.backgroundColor = '#d1e7dd'; // Estilo verde claro
        messageArea.style.padding = '10px';
        messageArea.style.borderRadius = '5px';
        
        clearTimeout(messageTimeout);
        messageTimeout = setTimeout(() => {
            messageArea.textContent = '';
            messageArea.style.padding = '0';
            messageArea.style.backgroundColor = 'transparent';
        }, 3000); // Remove a mensagem após 3 segundos
    }
}


// =========================================================
// 2. FUNÇÃO DE CARREGAMENTO DO CARDÁPIO (Mantida)
// =========================================================

// Função principal para carregar o cardápio
async function carregarCardapio() {
    if (loadingMessage) {
        loadingMessage.textContent = 'Carregando cardápio...';
        loadingMessage.style.color = '#4b5563'; // Cor cinza padrão
        loadingMessage.style.display = 'block';
    }

    try {
        // A URL que comprovadamente funciona e retorna os dados
        const response = await fetch(`http://127.0.0.1:5000/api/cupcakes/publico`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || `Erro do servidor: Status ${response.status}.`;
            throw new Error(errorMessage);
        }

        const cupcakes = await response.json();

        // Limpar o carregamento/erro e exibir os cupcakes
        if (loadingMessage) {
            loadingMessage.style.display = 'none';
        }
        
        cardapioDiv.innerHTML = ''; // Limpa o container

        if (cupcakes.length === 0) {
            cardapioDiv.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 32px;">Nenhum cupcake disponível no momento. Volte mais tarde!</p>';
            return;
        }

        cupcakes.forEach(cupcake => {
            const cupcakeHTML = `
                <div style="background-color: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #fbcfe8;">
                    <h3 style="font-size: 1.5rem; color: #db2777; margin-bottom: 8px;">${cupcake.nome}</h3>
                    <p style="color: #4b5563; font-size: 0.875rem; margin-bottom: 16px; height: 48px; overflow: hidden;">${cupcake.descricao || 'Descrição indisponível.'}</p>
                    <p style="font-size: 1.875rem; font-weight: bold; color: #ec4899; margin-top: 16px;">${cupcake.preco_formatado}</p>
                    
                    ${cupcake.disponivel 
                        ? `<button 
                            style="margin-top: 16px; width: 100%; background-color: #ec4899; color: white; padding: 8px 16px; border-radius: 8px; font-weight: 600; border: none; cursor: pointer; transition: background-color 0.15s;"
                            onmouseover="this.style.backgroundColor='#d946ef'"
                            onmouseout="this.style.backgroundColor='#ec4899'"
                            onclick="adicionarAoCarrinho('${cupcake.nome}', ${cupcake.preco})">
                            Adicionar ao Carrinho
                        </button>`
                        : `<span style="margin-top: 16px; display: inline-block; width: 100%; text-align: center; background-color: #e5e7eb; color: #6b7280; padding: 8px 16px; border-radius: 8px; font-weight: 600;">
                            Indisponível
                        </span>`
                    }
                </div>
            `;
            cardapioDiv.innerHTML += cupcakeHTML;
        });

    } catch (error) {
        console.error('Erro ao carregar cardápio:', error);
        
        if (loadingMessage) {
            loadingMessage.textContent = `Erro: ${error.message}. Recarregue a página ou verifique o servidor Flask.`;
            loadingMessage.style.color = '#ef4444'; // Cor de erro
            loadingMessage.style.display = 'block';
        }
        
        cardapioDiv.innerHTML = ''; 
    }
}

// Inicia o carregamento quando o script é executado
document.addEventListener('DOMContentLoaded', carregarCardapio);