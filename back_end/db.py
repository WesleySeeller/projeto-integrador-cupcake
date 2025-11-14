import sqlite3
from flask import g, request, jsonify # <-- Adicione 'request' e 'jsonify'
from flask_bcrypt import generate_password_hash 
# --- Importações JWT ---
from functools import wraps
from jwt import decode, ExpiredSignatureError, InvalidTokenError
# --- Chave Secreta (Deve ser a mesma do app.py) ---
SECRET_KEY = 'sua_chave_super_secreta_e_forte_aqui_12345' 
# ---
DATABASE = 'cupcakes.db'

def get_db_connection():
    """Conecta ao banco de dados."""
    conn = getattr(g, '_database', None)
    if conn is None:
        conn = g._database = sqlite3.connect(DATABASE)
        conn.row_factory = sqlite3.Row 
        conn.execute("PRAGMA foreign_keys = ON")
    return conn

def close_db(e=None):
    """Fecha a conexão com o banco de dados."""
    conn = getattr(g, '_database', None)
    if conn is not None:
        conn.close()

def admin_required(f):
    """
    Decorador que verifica o token JWT na requisição e garante 
    que o papel seja 'admin'.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # O token é esperado no cabeçalho 'Authorization: Bearer <token>'
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                # Remove 'Bearer ' para obter apenas o token
                token = auth_header.split(" ")[1] 
            except IndexError:
                # Caso o header esteja mal formatado
                return jsonify({'message': 'Token inválido ou ausente no cabeçalho.'}), 401

        if not token:
            return jsonify({'message': 'Token JWT ausente.'}), 401

        try:
            # Decodifica o token usando a chave secreta
            data = decode(token, SECRET_KEY, algorithms=["HS256"])
            
            # 1. VERIFICA O PAPEL: DEVE SER 'admin'
            if data['papel'] != 'admin':
                return jsonify({'message': 'Acesso negado: Requer privilégios de administrador.'}), 403
            
            # Adiciona os dados decodificados (payload) ao objeto 'g' do Flask
            g.current_user = data
        
        except ExpiredSignatureError:
            return jsonify({'message': 'Token JWT expirado.'}), 401
        except InvalidTokenError:
            return jsonify({'message': 'Token JWT inválido.'}), 401

        # Se tudo estiver ok, continua a execução da função original (a rota Flask)
        return f(*args, **kwargs)

    return decorated

def init_db():
    """
    Função para criar tabelas e inserir dados iniciais.
    """
    print("Iniciando a criação/verificação das tabelas e inserção de dados iniciais...")
    conn = None
    try:
        # AQUI NÃO USAMOS g, pois init_db é chamado fora do contexto de requisição
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        # 1. Tabela de Clientes
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS clientes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                senha_hash TEXT NOT NULL
            );
        """)
        
        # 2. Tabela de Administradores
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS administradores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                senha_hash TEXT NOT NULL
            );
        """)

        # 3. Tabela de Cupcakes
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS cupcakes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL UNIQUE,
                descricao TEXT,
                preco REAL NOT NULL,
                disponivel INTEGER NOT NULL DEFAULT 1
            );
        """)
        
        # --- 4. Inserção do Administrador Padrão ---
        admin_email = "admin@cupcake.com"
        # Garante que flask_bcrypt está instalado para esta função
        admin_senha_hash = generate_password_hash("admin123").decode('utf-8') 

        cursor.execute('SELECT id FROM administradores WHERE email = ?', (admin_email,))
        if cursor.fetchone() is None:
            cursor.execute('INSERT INTO administradores (email, senha_hash) VALUES (?, ?)', 
                           (admin_email, admin_senha_hash))
            print(f"Administrador padrão '{admin_email}' inserido com a senha 'admin123'.")
        
        # --- 5. Inserção dos Cupcakes de Teste ---
        cupcakes_iniciais = [
            ("Veludo Vermelho", "Clássico bolo de cacau suave e cobertura de cream cheese.", 12.00, 1),
            ("Chocolate Supremo", "Intenso chocolate meio amargo com recheio cremoso e raspas.", 14.50, 1),
            ("Limão Refrescante", "Massa de limão, recheio cítrico e cobertura merengue.", 11.00, 1),
            ("Baunilha Clássica", "O tradicional cupcake de baunilha com confeitos coloridos.", 10.00, 1)
        ]

        # Verifica e insere apenas se a tabela estiver vazia
        cursor.execute('SELECT COUNT(*) FROM cupcakes')
        if cursor.fetchone()[0] == 0:
            for nome, descricao, preco, disponivel in cupcakes_iniciais:
                cursor.execute('INSERT INTO cupcakes (nome, descricao, preco, disponivel) VALUES (?, ?, ?, ?)', 
                               (nome, descricao, preco, disponivel))
            print("Cupcakes de teste inseridos.")

        conn.commit()
        print("Inicialização do banco de dados concluída.")

    except sqlite3.Error as e:
        print(f"Erro ao inicializar o banco de dados: {e}")
    finally:
        if conn:
            conn.close()