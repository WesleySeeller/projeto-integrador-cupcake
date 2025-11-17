

import sqlite3
import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import g, request, jsonify
from werkzeug.security import generate_password_hash 

# --- CONFIGURAÇÕES ---
DB_NAME = 'cupcake.db'
SECRET_KEY = 'sua_chave_super_secreta_e_forte_aqui_12345'

# --- FUNÇÕES BÁSICAS DE CONEXÃO ---

def get_db_connection():
    """Conecta ao banco de dados."""
    conn = getattr(g, '_database', None)
    if conn is None:
        conn = g._database = sqlite3.connect(DB_NAME)
        conn.row_factory = sqlite3.Row 
        conn.execute("PRAGMA foreign_keys = ON")
    return conn

def close_db(e=None):
    """Fecha a conexão com o banco de dados."""
    conn = getattr(g, '_database', None)
    if conn is not None:
        conn.close()


def get_user_by_email_and_role(email, role):
    """Busca um usuário por email e papel."""
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM usuario WHERE email = ? AND role = ?', (email, role)).fetchone()
    return user

def get_user_by_id(user_id):
    """Busca um usuário por ID."""
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM usuario WHERE id = ?', (user_id,)).fetchone()
    return user


def login_required(f):
    """
    Decora uma rota para exigir um token JWT válido.
    Passa 'current_user_id' para a função da rota.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')

        if not token or not token.startswith('Bearer '):
            return jsonify({'message': 'Sessão expirada ou token inválido. Faça login novamente.'}), 401

        token = token.split(" ")[1]

        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            kwargs['current_user_id'] = payload['user_id'] 
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token expirado. Faça login novamente.'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token inválido ou corrompido.'}), 401
        
        return f(*args, **kwargs)

    return decorated

def admin_required(f):
    """
    Decora uma rota para exigir um token JWT e verificar se o papel é 'admin'.
    Passa 'current_user_id' para a função da rota.
    """
    @wraps(f)
    @login_required 
    def decorated(current_user_id, *args, **kwargs):
        user = get_user_by_id(current_user_id)
        
        if user and user['role'] == 'admin':
            return f(current_user_id=current_user_id, *args, **kwargs)
        else:
            return jsonify({'message': 'Acesso Negado: Requer privilégios de administrador.'}), 403

    return decorated

def create_user(nome, email, password):
    """Cria um novo usuário (cliente) no banco de dados."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    senha_hash = generate_password_hash(password, method='pbkdf2:sha256')
    role = 'cliente' 
    
    try:
        cursor.execute("INSERT INTO usuario (nome, email, senha_hash, role) VALUES (?, ?, ?, ?)",
                       (nome, email, senha_hash, role))
        conn.commit()
        return cursor.lastrowid
    except sqlite3.IntegrityError:
        return None
    finally:
        pass
        
def save_endereco(user_id, data):
    """
    Cria ou atualiza o endereço de entrega do usuário.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    existing_address = cursor.execute(
        "SELECT id FROM endereco WHERE usuario_id = ?", (user_id,)
    ).fetchone()

    address_data = (
        data['cep'], data['rua'], data['numero'], data.get('complemento', ''),
        data['bairro'], data['cidade'], data['estado']
    )

    if existing_address:
        try:
            cursor.execute("""
                UPDATE endereco SET cep = ?, rua = ?, numero = ?, complemento = ?, 
                bairro = ?, cidade = ?, estado = ? WHERE usuario_id = ?
            """, address_data + (user_id,))
            conn.commit()
            return existing_address['id']
        except Exception as e:
            print(f"Erro ao atualizar endereço: {e}")
            return None
    else:
        try:
            cursor.execute("""
                INSERT INTO endereco (cep, rua, numero, complemento, bairro, cidade, estado, usuario_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, address_data + (user_id,))
            conn.commit()
            return cursor.lastrowid
        except Exception as e:
            print(f"Erro ao inserir endereço: {e}")
            return None

def get_endereco_by_user_id(user_id):
    """Busca o endereço de entrega de um usuário."""
    conn = get_db_connection()
    return conn.execute(
        "SELECT * FROM endereco WHERE usuario_id = ?", (user_id,)
    ).fetchone()

def get_pedidos_by_user_id(user_id):
    """Busca os pedidos de um cliente, incluindo os itens."""
    conn = get_db_connection()
    
    pedidos_data = conn.execute("""
        SELECT 
            p.id AS pedido_id, p.data_pedido, p.status, p.valor_total
        FROM pedido p
        WHERE p.usuario_id = ?
        ORDER BY p.data_pedido DESC
    """, (user_id,)).fetchall()
    
    pedidos_list = []
    for p_data in pedidos_data:
        pedido_dict = dict(p_data)
        
        itens = conn.execute("""
            SELECT 
                pi.quantidade, c.nome AS nome_cupcake, pi.preco_unitario
            FROM pedido_item pi
            JOIN cupcake c ON pi.cupcake_id = c.id
            WHERE pi.pedido_id = ?
        """, (pedido_dict['pedido_id'],)).fetchall()
        
        pedido_dict['itens'] = [dict(item) for item in itens]
        pedidos_list.append(pedido_dict)
        
    return pedidos_list


def get_pedido_details(pedido_id):
    """
    Busca os detalhes completos de um pedido, incluindo itens e informações do cliente/endereço.
    """
    conn = get_db_connection()
    
    # 1. Buscar o pedido, cliente e endereço
    pedido_data = conn.execute("""
        SELECT 
            p.id AS pedido_id, p.data_pedido, p.status, p.valor_total,
            u.nome AS nome_cliente, u.email AS email_cliente,
            e.cep, e.rua, e.numero, e.complemento, e.bairro, e.cidade, e.estado
        FROM pedido p
        JOIN usuario u ON p.usuario_id = u.id
        JOIN endereco e ON p.endereco_id = e.id
        WHERE p.id = ?
    """, (pedido_id,)).fetchone()
    
    if not pedido_data:
        return None

    # 2. Buscar os itens do pedido
    itens = conn.execute("""
        SELECT 
            pi.quantidade, c.nome AS nome_cupcake, pi.preco_unitario
        FROM pedido_item pi
        JOIN cupcake c ON pi.cupcake_id = c.id
        WHERE pi.pedido_id = ?
    """, (pedido_id,)).fetchall()
    
    # Formatar o resultado
    pedido_dict = dict(pedido_data)
    
    # Formatando o endereço em uma string para facilitar o front-end
    endereco_formatado = f"{pedido_dict['rua']}, {pedido_dict['numero']} - {pedido_dict['bairro']} ({pedido_dict['cidade']}/{pedido_dict['estado']}) CEP: {pedido_dict['cep']}"
    if pedido_dict['complemento']:
        endereco_formatado = f"{pedido_dict['rua']}, {pedido_dict['numero']} ({pedido_dict['complemento']}) - {pedido_dict['bairro']}. CEP: {pedido_dict['cep']}"
        
    pedido_dict['endereco'] = endereco_formatado
    
    # Remove campos brutos de endereço que não são necessários após a formatação
    keys_to_remove = ['cep', 'rua', 'numero', 'complemento', 'bairro', 'cidade', 'estado']
    for key in keys_to_remove:
        pedido_dict.pop(key, None)
        
    pedido_dict['itens'] = [dict(item) for item in itens]
    
    return pedido_dict


def get_all_pedidos():
    """Busca todos os pedidos com o nome do cliente."""
    conn = get_db_connection()
    pedidos = conn.execute("""
        SELECT 
            p.id AS pedido_id, 
            u.nome AS nome_cliente, 
            p.data_pedido, 
            p.valor_total, 
            p.status
        FROM pedido p
        JOIN usuario u ON p.usuario_id = u.id
        ORDER BY p.data_pedido DESC
    """).fetchall()
    return pedidos

def update_pedido_status(pedido_id, status):
    """Atualiza o status de um pedido."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE pedido SET status = ? WHERE id = ?", (status, pedido_id))
    conn.commit()
    return cursor.rowcount > 0

# --- CRUD CUPCAKES (Para referência do app.py) ---
def get_all_cupcakes():
    conn = get_db_connection()
    return conn.execute("SELECT * FROM cupcake").fetchall()

def get_cupcake_by_id(cupcake_id):
    conn = get_db_connection()
    return conn.execute("SELECT * FROM cupcake WHERE id = ?", (cupcake_id,)).fetchone()

def create_cupcake(nome, descricao, preco, disponivel=1):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO cupcake (nome, descricao, preco, disponivel) VALUES (?, ?, ?, ?)",
                       (nome, descricao, preco, disponivel))
        conn.commit()
        return cursor.lastrowid
    except sqlite3.IntegrityError:
        return None 

def update_cupcake(cupcake_id, nome, descricao, preco, disponivel):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("UPDATE cupcake SET nome = ?, descricao = ?, preco = ?, disponivel = ? WHERE id = ?",
                       (nome, descricao, preco, disponivel, cupcake_id))
        conn.commit()
        return cursor.rowcount > 0
    except sqlite3.IntegrityError:
        return False 

def delete_cupcake(cupcake_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM cupcake WHERE id = ?", (cupcake_id,))
    conn.commit()
    return cursor.rowcount > 0

# --- FUNÇÃO DE INICIALIZAÇÃO DO BANCO ---

def init_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row 
    cursor = conn.cursor()
    
    # 1. Tabela de USUÁRIOS 
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS usuario (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT,
            email TEXT UNIQUE NOT NULL,
            senha_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'cliente' 
        );
    """)

    # 2. Tabela de Cupcakes
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cupcake (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT UNIQUE NOT NULL,
            descricao TEXT,
            preco REAL NOT NULL,
            disponivel INTEGER NOT NULL DEFAULT 1 
        );
    """)

    # 3. Tabela de Endereços (Chave estrangeira 'usuario_id')
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS endereco (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER UNIQUE NOT NULL,
            cep TEXT NOT NULL,
            rua TEXT NOT NULL,
            numero TEXT NOT NULL,
            complemento TEXT,
            bairro TEXT NOT NULL,
            cidade TEXT NOT NULL,
            estado TEXT NOT NULL,
            FOREIGN KEY (usuario_id) REFERENCES usuario (id) 
        );
    """)

    # 4. Tabela de Pedidos
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pedido (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER NOT NULL,
            endereco_id INTEGER NOT NULL,
            data_pedido TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Pendente',
            valor_total REAL NOT NULL,
            FOREIGN KEY (usuario_id) REFERENCES usuario (id),
            FOREIGN KEY (endereco_id) REFERENCES endereco (id)
        );
    """)
    
    # 5. Tabela de Itens do Pedido
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pedido_item (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pedido_id INTEGER NOT NULL,
            cupcake_id INTEGER NOT NULL,
            quantidade INTEGER NOT NULL,
            preco_unitario REAL NOT NULL,
            FOREIGN KEY (pedido_id) REFERENCES pedido (id),
            FOREIGN KEY (cupcake_id) REFERENCES cupcake (id)
        );
    """)
    
    # Commit para garantir que as tabelas existem antes de qualquer SELECT
    conn.commit() 

    # 6. Inserir Admin se não existir
    admin_email = 'admin@cupcake.com'
    senha_admin = 'admin123'
    
    # CORREÇÃO: Usando conn.execute() para garantir que row_factory seja usado
    admin_user = conn.execute('SELECT id FROM usuario WHERE email = ? AND role = "admin"', (admin_email,)).fetchone()
    
    if admin_user is None:
        senha_hash = generate_password_hash(senha_admin, method='pbkdf2:sha256')
        cursor.execute("INSERT INTO usuario (nome, email, senha_hash, role) VALUES (?, ?, ?, ?)",
                       ('Admin Principal', admin_email, senha_hash, 'admin'))
        print(f"Admin criado com sucesso na tabela 'usuario': {admin_email} / {senha_admin}")
    
    # 7. Inserir Cupcakes de teste se não existirem
    cupcakes_teste = [
        ('Chocolate Supremo', 'Intenso chocolate meio amargo com recheio cremoso e raspas.', 14.50, 1),
        ('Limão Refrescante', 'Massa de limão, recheio cítrico e cobertura merengue.', 11.00, 1),
        ('Baunilha Clássica', 'O tradicional cupcake de baunilha com confeitos coloridos.', 10.00, 1),
    ]
    
    # CORREÇÃO: Usando conn.execute()
    cupcake_count = conn.execute('SELECT COUNT(*) FROM cupcake').fetchone()[0]
    if cupcake_count == 0:
        for nome, descricao, preco, disponivel in cupcakes_teste:
            cursor.execute("INSERT INTO cupcake (nome, descricao, preco, disponivel) VALUES (?, ?, ?, ?)",
                            (nome, descricao, preco, disponivel))
        print("Cupcakes de teste inseridos.")


    cliente_email = 'cliente@teste.com'
    
    # 8. Inserir Cliente de Teste, se não existir
    # CORREÇÃO: Usando conn.execute()
    cliente_user = conn.execute('SELECT id FROM usuario WHERE email = ? AND role = "cliente"', (cliente_email,)).fetchone()
    
    if cliente_user is None:
        senha_hash_cliente = generate_password_hash('cliente123', method='pbkdf2:sha256')
        cursor.execute("INSERT INTO usuario (nome, email, senha_hash, role) VALUES (?, ?, ?, ?)",
                       ('Cliente de Teste', cliente_email, senha_hash_cliente, 'cliente'))
        cliente_id = cursor.lastrowid
        print(f"Cliente de teste criado: {cliente_email} / cliente123")
    else:
        cliente_id = cliente_user['id']
        
    # 9. Inserir Endereço de Teste para o Cliente, se não existir
    endereco_user = conn.execute('SELECT id FROM endereco WHERE usuario_id = ?', (cliente_id,)).fetchone()
    if endereco_user is None:
        cursor.execute("""
            INSERT INTO endereco (usuario_id, cep, rua, numero, complemento, bairro, cidade, estado) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (cliente_id, '80000-000', 'Rua das Flores', '100', 'Apto 101', 'Centro', 'Curitiba', 'PR'))
        endereco_id = cursor.lastrowid
    else:
        endereco_id = endereco_user['id']
        
    # 10. Inserir Pedido de Teste, se não existir nenhum
    pedido_count = conn.execute('SELECT COUNT(*) FROM pedido').fetchone()[0]
    if pedido_count == 0:
        # Busca o primeiro cupcake para usar no pedido
        cupcake_info = conn.execute('SELECT id, preco FROM cupcake LIMIT 1').fetchone()
        
        if cupcake_info:
            cupcake_id = cupcake_info['id'] 
            preco = cupcake_info['preco']
            valor_total = preco * 2 
            
            # Cria o Pedido Principal
            cursor.execute("""
                INSERT INTO pedido (usuario_id, endereco_id, data_pedido, valor_total, status) 
                VALUES (?, ?, datetime('now', 'localtime'), ?, ?)
            """, (cliente_id, endereco_id, valor_total, 'em preparacao'))
            pedido_id = cursor.lastrowid
            
            # Cria o Item do Pedido
            cursor.execute("""
                INSERT INTO pedido_item (pedido_id, cupcake_id, quantidade, preco_unitario)
                VALUES (?, ?, ?, ?)
            """, (pedido_id, cupcake_id, 2, preco))
            
            print(f"Pedido de teste #{pedido_id} inserido com sucesso.")

    conn.commit()
    conn.close()

# Chamada para inicializar
init_db()