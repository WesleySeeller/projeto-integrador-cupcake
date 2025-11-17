const welcomeMessage = document.getElementById('welcome-admin-message');
const dashboardContent = document.querySelector('.container');
const logoutButton = document.getElementById('btn-admin-logout');


function verificarAcessoAdmin() {
    const token = localStorage.getItem('jwt_token');
    const role = localStorage.getItem('user_role');

    if (!token || role !== 'admin') {
        alert("Acesso negado! Você precisa ser um administrador para ver esta página.");
        
        window.location.href = 'login.html'; 
        
        if(dashboardContent) dashboardContent.style.display = 'none';
        
        return;
    }
    
    welcomeMessage.textContent = 'Bem-vindo(a), Administrador(a)!';
    
}


if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user_role');
        
        window.location.href = 'login.html'; 
    });
}

document.addEventListener('DOMContentLoaded', verificarAcessoAdmin);