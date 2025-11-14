const welcomeMessage = document.getElementById('welcome-admin-message');
const dashboardContent = document.querySelector('.container');
const logoutButton = document.getElementById('btn-admin-logout');

/**
 * Função principal que verifica o estado de login e a permissão do usuário.
 */
function verificarAcessoAdmin() {
    const token = localStorage.getItem('jwt_token');
    const role = localStorage.getItem('user_role');

    if (!token || role !== 'admin') {
        // --- Acesso Negado ---
        alert("Acesso negado! Você precisa ser um administrador para ver esta página.");
        
        // Redireciona para o login se não for admin
        window.location.href = 'login.html'; 
        
        // Bloqueia o conteúdo enquanto o redirecionamento acontece
        if(dashboardContent) dashboardContent.style.display = 'none';
        
        return;
    }
    
    // --- Acesso Permitido ---
    welcomeMessage.textContent = 'Bem-vindo(a), Administrador(a)!';
    
    // O próximo passo será carregar o CRUD de cupcakes aqui!
    // carregarCupcakesParaGerenciamento(token); 
}

/**
 * Função para sair da conta, removendo o token e redirecionando.
 */
if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        // Limpa o armazenamento local (token e papel)
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user_role');
        
        // Redireciona para a página inicial
        window.location.href = 'index.html';
    });
}

document.addEventListener('DOMContentLoaded', verificarAcessoAdmin);