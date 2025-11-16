const cartItemsContainer = document.getElementById('cart-items-container');
const cartTotalElement = document.getElementById('cart-total');
const checkoutButton = document.getElementById('checkout-button');

/**
 * Carrega e exibe os itens do carrinho.
 */
function renderizarCarrinho() {
    // ⚠️ CORRIGIDO: Usando a chave 'carrinhoCupcake' para ser consistente com script-index.js
    const carrinho = JSON.parse(localStorage.getItem('carrinhoCupcake') || '[]');
    cartItemsContainer.innerHTML = ''; // Limpa a lista
    let subtotal = 0;

    if (carrinho.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align: center; color: #ff69b4; padding: 20px;">Seu carrinho está vazio. Adicione alguns cupcakes!</p>';
        cartTotalElement.textContent = 'R$0,00';
        checkoutButton.disabled = true;
        return;
    }

    carrinho.forEach((item, index) => {
        // Garantindo que o preço seja tratado como número
        const precoUnitario = parseFloat(item.preco); 
        const itemTotal = precoUnitario * item.quantidade;
        subtotal += itemTotal;

        const itemDiv = document.createElement('div');
        itemDiv.style.display = 'flex';
        itemDiv.style.justifyContent = 'space-between';
        itemDiv.style.alignItems = 'center';
        itemDiv.style.padding = '10px 0';
        // Ajustando o estilo para combinar com o CSS do projeto
        itemDiv.style.borderBottom = '1px dashed #ffb6c1'; 

        itemDiv.innerHTML = `
            <div style="width: 40%; font-weight: bold;">
                <span>${item.nome}</span>
                <span style="color: #6b7280; font-weight: normal;">(R$${precoUnitario.toFixed(2).replace('.', ',')})</span>
            </div>
            <div style="width: 15%; text-align: center;">
                x ${item.quantidade}
            </div>
            <div style="font-weight: bold; color: #db2777; width: 25%; text-align: right;">
                R$${itemTotal.toFixed(2).replace('.', ',')}
            </div>
        `;
        cartItemsContainer.appendChild(itemDiv);
    });

    // Exibe o total
    cartTotalElement.textContent = `R$${subtotal.toFixed(2).replace('.', ',')}`;
    checkoutButton.disabled = false;
}

/**
 * Lógica para finalizar a compra (simulado).
 */
checkoutButton.addEventListener('click', () => {
    // ⚠️ CORRIGIDO: Usando a chave 'carrinhoCupcake'
    const carrinho = JSON.parse(localStorage.getItem('carrinhoCupcake') || '[]'); 
    
    if (carrinho.length === 0) {
        alert('O carrinho está vazio.');
        return;
    }

    alert(`Compra simulada com sucesso! Total: ${cartTotalElement.textContent}. 
        Próxima etapa: Implementar a rota de pedidos no Back-End.`);
            
    // Limpar o carrinho após a simulação
    // ⚠️ CORRIGIDO: Usando a chave 'carrinhoCupcake'
    localStorage.removeItem('carrinhoCupcake'); 
    renderizarCarrinho();
});


// Função para esvaziar o carrinho
function limparCarrinho() {
    if (confirm('Tem certeza que deseja remover todos os itens do carrinho?')) {
        // ⚠️ CORRIGIDO: Usando a chave 'carrinhoCupcake'
        localStorage.removeItem('carrinhoCupcake');
        renderizarCarrinho();
    }
}

// Torna a função de limpar acessível globalmente (necessário para o onclick no HTML)
window.limparCarrinho = limparCarrinho;

// Inicializa a renderização ao carregar a página
document.addEventListener('DOMContentLoaded', renderizarCarrinho);