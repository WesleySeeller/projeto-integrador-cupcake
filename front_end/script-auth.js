const API_URL = 'http://127.0.0.1:5000/api';

/**
 * Verifica se o usuário está logado e se possui a 'role' necessária.
 * Se não estiver, redireciona para a página de login.
 * @param {string} requiredRole - 'cliente' ou 'admin'.
 */
function verificarLogin(requiredRole) {
    const token = localStorage.getItem('jwt_token');
    
    // 1. Se não houver token, redireciona imediatamente
    if (!token) {
        if (requiredRole === 'admin') {
            window.location.href = 'login-admin.html';
        } else {
            window.location.href = 'login.html';
        }
        return;
    }

    try {
        const payload = parseJwt(token);
        const userRole = payload.role;

        if (requiredRole === 'admin') {
            if (userRole !== 'admin') {
                alert('Acesso negado. Apenas administradores podem acessar esta página.');
                window.location.href = 'index.html'; 
            }
        } else if (requiredRole === 'cliente') {
            if (!userRole) {
                window.location.href = 'login.html';
            }
        }

        
    } catch (e) {
        alert('Sessão expirada. Faça login novamente.');
        localStorage.removeItem('jwt_token');
        if (requiredRole === 'admin') {
            window.location.href = 'login-admin.html';
        } else {
            window.location.href = 'login.html';
        }
    }
}

/**
 * Função utilitária para decodificar o payload do JWT.
 * @param {string} token - token JWT.
 * @returns {object} 
 */
function parseJwt(token) {
    if (!token) return {};
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return {};
    }
}


function logout() {
    localStorage.removeItem('jwt_token');
    alert('Você foi desconectado com sucesso.');
    window.location.href = 'index.html';
}

window.logout = logout;