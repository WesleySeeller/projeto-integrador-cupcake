// Elementos da DOM
const cartItemsContainer = document.getElementById('cart-items-container');
const cartTotalElement = document.getElementById('cart-total');
const checkoutButton = document.getElementById('checkout-button');

/**
 * Carrega e exibe os itens do carrinho.
 */
function renderizarCarrinho() {
    const carrinho = JSON.parse(localStorage.getItem('cupcakeCarrinho') || '[]');
    cartItemsContainer.innerHTML = ''; // Limpa a lista
    let subtotal = 0;

    if (carrinho.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 20px;">Seu carrinho está vazio. Adicione alguns cupcakes!</p>';
        cartTotalElement.textContent = 'R$0,00';
        checkoutButton.disabled = true;
        return;
    }

    carrinho.forEach((item, index) => {
        const itemTotal = item.preco * item.quantidade;
        subtotal += itemTotal;

        const itemDiv = document.createElement('div');
        itemDiv.style.display = 'flex';
        itemDiv.style.justifyContent = 'space-between';
        itemDiv.style.alignItems = 'center';
        itemDiv.style.padding = '10px 0';
        itemDiv.style.borderBottom = '1px solid #e5e7eb';

        itemDiv.innerHTML = `
            <div>
                <span style="font-weight: bold;">${item.nome}</span>
                <span style="color: #6b7280;">(${item.quantidade} x R$${item.preco.toFixed(2).replace('.', ',')})</span>
            </div>
            <div style="font-weight: bold; color: #db2777;">
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
 * Lógica para finalizar a compra (será integrada ao Back-End no próximo passo).
 */
checkoutButton.addEventListener('click', () => {
    const carrinho = JSON.parse(localStorage.getItem('cupcakeCarrinho') || '[]');
    
    if (carrinho.length === 0) {
        alert('O carrinho está vazio.'); // Usamos alert temporariamente, vamos melhorar isso
        return;
    }

    // Apenas simula o checkout por enquanto. O próximo passo será enviar isso para o Flask.
    alert(`Compra simulada com sucesso! Total: ${cartTotalElement.textContent}. 
           Próxima etapa: Login/Cadastro para enviar o pedido ao servidor.`);
           
    // Limpar o carrinho após a simulação
    localStorage.removeItem('cupcakeCarrinho');
    renderizarCarrinho();
});


// Função para navegar e limpar o localStorage quando necessário (por exemplo, no logout)
function limparCarrinho() {
    localStorage.removeItem('cupcakeCarrinho');
    renderizarCarrinho();
}

// Inicializa a renderização ao carregar a página
document.addEventListener('DOMContentLoaded', renderizarCarrinho);