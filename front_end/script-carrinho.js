const API_URL = 'http://127.0.0.1:5000/api';
const cartItemsContainer = document.getElementById('cart-items-container');
const cartTotalElement = document.getElementById('cart-total');
const checkoutButton = document.getElementById('checkout-button');
const messageArea = document.getElementById('message-area');


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
    
    if (type !== 'loading') {
        setTimeout(() => { messageArea.style.display = 'none'; }, 5000);
    }
}



function renderizarCarrinho() {
    const carrinho = JSON.parse(localStorage.getItem('carrinhoCupcake') || '[]');
    cartItemsContainer.innerHTML = ''; 
    let subtotal = 0;

    if (carrinho.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align: center; color: #ff69b4; padding: 20px;">Seu carrinho está vazio. Adicione alguns cupcakes!</p>';
        cartTotalElement.textContent = 'R$ 0,00';
        checkoutButton.disabled = true;
        return;
    }

    let itemsHtml = `<table style="width: 100%; border-collapse: collapse;">
        <tbody>`;
    
    carrinho.forEach((item, index) => {
        const precoUnitario = parseFloat(item.preco); 
        const itemTotal = precoUnitario * item.quantidade;
        subtotal += itemTotal;

        itemsHtml += `
            <tr style="border-bottom: 1px dashed #ffb6c1;">
                <td style="width: 40%; font-weight: bold; padding: 10px 0;">
                    <span>${item.nome}</span>
                    <span style="color: #6b7280; font-weight: normal;">(R$${precoUnitario.toFixed(2).replace('.', ',')})</span>
                </td>
                <td style="width: 15%; text-align: center;">
                    x ${item.quantidade}
                </td>
                <td style="font-weight: bold; color: #db2777; width: 25%; text-align: right;">
                    R$${itemTotal.toFixed(2).replace('.', ',')}
                </td>
            </tr>
        `;
    });
    
    itemsHtml += `</tbody></table>`;
    cartItemsContainer.innerHTML = itemsHtml;

    // Exibe o total
    cartTotalElement.textContent = `R$${subtotal.toFixed(2).replace('.', ',')}`;
    checkoutButton.disabled = false;
}

async function finalizarCompra() {
    const carrinho = JSON.parse(localStorage.getItem('carrinhoCupcake') || '[]'); 
    
    const token = localStorage.getItem('jwt_token'); 
    
    if (carrinho.length === 0) {
        showMessage('O carrinho está vazio.', 'error');
        return;
    }
    
    if (!token) {
        showMessage("Você precisa estar logado para finalizar a compra. Redirecionando...", 'error');
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        return;
    }

    // Prepara o payload para o back-end (APENAS IDs e Quantidades)
    const itensPedido = carrinho.map(item => ({
        cupcake_id: item.id,
        quantidade: item.quantidade
    }));

    checkoutButton.disabled = true;
    showMessage('Processando seu pedido...', 'loading');

    try {
        const response = await fetch(`${API_URL}/pedidos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ itens: itensPedido }) 
        });

        const data = await response.json();

        if (response.ok) { 
            showMessage(data.message || "Pedido realizado com sucesso! Você será redirecionado...", 'success');
            localStorage.removeItem('carrinhoCupcake'); 
            
            setTimeout(() => { window.location.href = 'perfil-cliente.html'; }, 2000);
        
        } else if (response.status === 400 && data.message.includes('Endereço')) {
            showMessage(data.message, 'error');
            setTimeout(() => { window.location.href = 'perfil-cliente.html?tab=endereco'; }, 2000);
        
        } else {
            showMessage(data.message || 'Erro ao finalizar o pedido.', 'error');
            checkoutButton.disabled = false;
        }
    } catch (error) {
        showMessage(`Erro de conexão com o servidor: ${error.message}.`, 'error');
        checkoutButton.disabled = false;
    }
}

function limparCarrinho() {
    showMessage("Carrinho esvaziado.", 'info');
    localStorage.removeItem('carrinhoCupcake');
    renderizarCarrinho();
}


document.addEventListener('DOMContentLoaded', () => {
    renderizarCarrinho();
    
    checkoutButton.addEventListener('click', finalizarCompra);
    
    document.getElementById('limpar-carrinho-button').addEventListener('click', limparCarrinho);
});