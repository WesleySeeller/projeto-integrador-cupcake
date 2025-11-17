const welcomeMessage = document.getElementById('welcome-admin-message');
const dashboardContent = document.querySelector('.container');
const logoutButton = document.getElementById('btn-admin-logout');

// CORREÇÃO (TESTE 4): Adiciona a div de mensagem
const messageArea = document.getElementById('message-area');

// CORREÇÃO (TESTE 4): Cria a função showMessage
function showMessage(msg, type = 'error') {
    if (!messageArea) return;
    messageArea.textContent = msg;
    messageArea.style.backgroundColor = type === 'success' ? '#e0ffe0' : '#ffe0e0';
    messageArea.style.color = type === 'success' ? 'green' : 'red';
    messageArea.style.padding = '10px';
    messageArea.style.borderRadius = '4px';
    messageArea.style.display = 'block';
    messageArea.style.textAlign = 'center';
    
    setTimeout(() => { messageArea.style.display = 'none'; }, 5000);
}


function verificarAcessoAdmin() {
    const token = localStorage.getItem('jwt_token');
    const role = localStorage.getItem('user_role');

    if (!token || role !== 'admin') {
        // CORREÇÃO (TESTE 4): Substitui 'alert()' por 'showMessage()'
        showMessage("Acesso negado! Redirecionando para o login.");
        
        if(dashboardContent) dashboardContent.style.display = 'none';
        
        setTimeout(() => {
            window.location.href = 'login.html'; 
        }, 1500);
        
        return;
    }
    
    const adminName = localStorage.getItem('user_name') || 'Admin';
    welcomeMessage.textContent = `Bem-vindo(a), ${adminName}!`;
}


if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_name');
        
        window.location.href = 'login.html'; 
    });
}

document.addEventListener('DOMContentLoaded', verificarAcessoAdmin);