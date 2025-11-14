import sqlite3
from flask import Flask, request, jsonify
from db import get_db_connection, close_db, admin_required
from flask_cors import CORS
from functools import wraps
from datetime import datetime, timedelta
import jwt # Novo: Para gerar tokens de autenticação

# Dependências do seu projeto
from flask_bcrypt import Bcrypt 
import db 

# =========================================================
# CONFIGURAÇÃO INICIAL
# =========================================================

app = Flask(__name__)
CORS(app) 
bcrypt = Bcrypt(app) 
db.init_db() # Cria as tabelas se não existirem

# CHAVE SECRETA CRÍTICA PARA ASSINAR OS TOKENS JWT
# EM PRODUÇÃO, ISSO DEVE VIR DE UMA VARIÁVEL DE AMBIENTE!
CHAVE_SECRETA = "sua_chave_super_secreta_e_forte_aqui_12345" 
app.config['SECRET_KEY'] = CHAVE_SECRETA

# =========================================================
# DECORADOR DE PROTEÇÃO DE ROTA (MIDDLEWARE)
# =========================================================

def token_necessario(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # O token é esperado no cabeçalho 'Authorization' como 'Bearer <token>'
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]

        if not token:
            return jsonify({'message': 'Token de autenticação ausente!'}), 401
        
        try:
            # Tenta decodificar o token com a chave secreta
            data = jwt.decode(token, CHAVE_SECRETA, algorithms=["HS256"])
            
            # Adiciona as informações do usuário logado (email, papel) à requisição
            request.usuario_atual = data
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token expirado. Por favor, faça login novamente.'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token inválido ou corrompido.'}), 401

        return f(*args, **kwargs)
    return decorated

# =========================================================
# ROTAS PÚBLICAS (Leitura do Cardápio)
# =========================================================

# Rota Pública: Listar Cupcakes (Usado pelo Cliente - READ)
@app.route("/api/cupcakes/publico", methods=['GET'])
def listar_cupcakes_publico():
    try:
        conn = db.get_db_connection()
        cursor = conn.cursor()
        
        # Seleciona apenas cupcakes disponíveis
        cupcakes_data = cursor.execute('SELECT id, nome, descricao, preco, disponivel FROM cupcakes WHERE disponivel = 1').fetchall()
        
        conn.close()
        
        cupcakes = []
        for c in cupcakes_data:
            cupcakes.append({
                'id': c[0],
                'nome': c[1],
                'descricao': c[2],
                'preco': c[3],
                'preco_formatado': f"R${c[3]:.2f}".replace('.', ','),
                'disponivel': c[4]
            })
            
        return jsonify(cupcakes), 200

    except sqlite3.Error as e:
        print(f"Erro no banco de dados ao listar cupcakes: {e}")
        return jsonify({'message': 'Erro interno ao buscar lista de produtos. Verifique se a tabela "cupcakes" existe.'}), 500

# =========================================================
# ROTAS DE AUTENTICAÇÃO (Cadastro e Login)
# =========================================================

# 1. Cadastro de Clientes
@app.route("/api/cadastro", methods=['POST'])
def cadastro_cliente():
    data = request.get_json()
    email = data.get('email')
    senha = data.get('senha')
    
    if not email or not senha:
        return jsonify({'message': 'Email e senha são obrigatórios.'}), 400
    
    # Validação simples de email
    if '@' not in email or '.' not in email:
        return jsonify({'message': 'Formato de email inválido.'}), 400

    conn = db.get_db_connection()
    cursor = conn.cursor()

    try:
        # Verifica se o cliente já existe
        existing_user = cursor.execute('SELECT id FROM clientes WHERE email = ?', (email,)).fetchone()
        if existing_user:
            return jsonify({'message': 'Este email já está cadastrado.'}), 409
        
        # Gera o hash da senha
        senha_hashed = bcrypt.generate_password_hash(senha).decode('utf-8')
        
        # Insere o novo cliente
        cursor.execute('INSERT INTO clientes (email, senha_hash) VALUES (?, ?)', (email, senha_hashed))
        conn.commit()
        
        return jsonify({'message': 'Cadastro realizado com sucesso!'}), 201

    except sqlite3.Error as e:
        print(f"Erro no banco de dados durante o cadastro: {e}")
        conn.rollback()
        return jsonify({'message': 'Erro interno do servidor.'}), 500
    finally:
        conn.close()


# 2. Login de Clientes e Administradores
@app.route("/api/login", methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    senha = data.get('senha')

    if not email or not senha:
        return jsonify({'message': 'Email e senha são obrigatórios.'}), 400

    conn = db.get_db_connection()
    cursor = conn.cursor()
    
    usuario = None
    papel = None

    # Tenta buscar na tabela de Administradores
    admin_data = cursor.execute('SELECT senha_hash FROM administradores WHERE email = ?', (email,)).fetchone()
    if admin_data:
        usuario = admin_data
        papel = 'admin'
    
    # Se não for admin, tenta buscar na tabela de Clientes
    if not usuario:
        cliente_data = cursor.execute('SELECT senha_hash FROM clientes WHERE email = ?', (email,)).fetchone()
        if cliente_data:
            usuario = cliente_data
            papel = 'cliente'
    
    conn.close()

    if not usuario:
        return jsonify({'message': 'Credenciais inválidas: Email não encontrado.'}), 401

    senha_hash = usuario[0]

    # Verifica se a senha fornecida corresponde ao hash
    if bcrypt.check_password_hash(senha_hash, senha):
        # Geração do Token JWT (Expira em 24 horas)
        token_payload = {
            'email': email,
            'papel': papel,
            'exp': datetime.utcnow() + timedelta(hours=24)
        }
        token = jwt.encode(token_payload, CHAVE_SECRETA, algorithm="HS256")
        
        return jsonify({
            'message': 'Login bem-sucedido!',
            'token': token,
            'papel': papel
        }), 200
    else:
        return jsonify({'message': 'Credenciais inválidas: Senha incorreta.'}), 401

# =========================================================
# ROTAS DE ADMIN (Protegidas)
# =========================================================

# Exemplo de Rota Protegida (Apenas para Teste)
@app.route("/api/admin/teste", methods=['GET'])
@token_necessario # Usa o decorador para garantir que o usuário está logado
def rota_teste_admin():
    # Verifica se o papel do usuário logado é 'admin'
    if request.usuario_atual['papel'] != 'admin':
        return jsonify({'message': 'Acesso negado: Requer privilégios de Administrador.'}), 403
    
    email_admin = request.usuario_atual['email']
    return jsonify({
        'message': f'Bem-vindo, {email_admin}! Esta é uma rota protegida de Admin.',
        'usuario': request.usuario_atual
    }), 200




# --- ROTA PROTEGIDA: LISTAR TODOS OS CUPCAKES PARA ADMIN ---
@app.route("/api/admin/cupcakes", methods=["GET"])
@admin_required # Garante que apenas administradores acessem
def listar_cupcakes_admin():
    conn = get_db_connection()
    # Seleciona todos os cupcakes, incluindo os que podem estar indisponíveis (disponivel=0)
    cupcakes = conn.execute('SELECT * FROM cupcakes').fetchall()
    conn.close()
    
    # Transforma a lista de Rows em lista de dicionários para JSON
    cupcakes_list = [dict(cupcake) for cupcake in cupcakes]
    
    return jsonify({"cupcakes": cupcakes_list}), 200

# --- ROTA PROTEGIDA: CRIAR NOVO CUPCAKE ---
@app.route("/api/admin/cupcakes", methods=["POST"])
@admin_required
def criar_cupcake():
    data = request.get_json()
    nome = data.get('nome')
    descricao = data.get('descricao')
    preco = data.get('preco')
    
    if not nome or not preco:
        return jsonify({"message": "Nome e preço são obrigatórios."}), 400

    try:
        preco = float(preco)
    except ValueError:
        return jsonify({"message": "Preço deve ser um número válido."}), 400

    conn = get_db_connection()
    try:
        # Inserir o novo cupcake com 'disponivel' padrão 1
        conn.execute('INSERT INTO cupcakes (nome, descricao, preco) VALUES (?, ?, ?)',
                     (nome, descricao, preco))
        conn.commit()
        return jsonify({"message": f"Cupcake '{nome}' criado com sucesso!"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"message": "Cupcake com este nome já existe."}), 409
    except Exception as e:
        conn.rollback()
        print(f"Erro ao criar cupcake: {e}")
        return jsonify({"message": "Erro interno ao salvar no banco de dados."}), 500
    finally:
        conn.close()

# --- ROTA PROTEGIDA: ATUALIZAR/EDITAR CUPCAKE (UPDATE - PUT) ---
@app.route("/api/admin/cupcakes/<int:cupcake_id>", methods=["PUT"])
@admin_required
def atualizar_cupcake(cupcake_id):
    # ADICIONE A LEITURA DO JSON AQUI PARA DEFINIR AS VARIÁVEIS
    data = request.get_json()
    nome = data.get('nome')
    descricao = data.get('descricao')
    preco = data.get('preco')
    disponivel = data.get('disponivel', 1) # Assuma 1 se não for enviado, ou use o valor do front-end
    
    # Validação (você deve ter esta parte)
    if not nome or not preco:
        return jsonify({"message": "Nome e preço são obrigatórios para atualização."}), 400

    conn = get_db_connection()
    try:
        # A linha 269 (do aviso) usa estas variáveis aqui:
        cursor = conn.execute(''' 
             UPDATE cupcakes SET nome = ?, descricao = ?, preco = ?, disponivel = ?
             WHERE id = ?
         ''', (nome, descricao, preco, disponivel, cupcake_id)) # <--- Estas variáveis estavam "não definidas" para o linter
        
        conn.commit()
        
        if cursor.rowcount == 0: 
            return jsonify({"message": f"Cupcake ID {cupcake_id} não encontrado."}), 404
            
        return jsonify({"message": f"Cupcake ID {cupcake_id} atualizado com sucesso!"}), 200
    except Exception as e:
        conn.rollback()
        print(f"Erro ao atualizar cupcake: {e}")
        return jsonify({"message": "Erro interno ao atualizar no banco de dados."}), 500
    finally:
        conn.close()


# --- ROTA PROTEGIDA: EXCLUIR CUPCAKE (DELETE) ---
@app.route("/api/admin/cupcakes/<int:cupcake_id>", methods=["DELETE"])
@admin_required
def excluir_cupcake(cupcake_id):
    conn = get_db_connection()
    try:
        cursor = conn.execute('DELETE FROM cupcakes WHERE id = ?', (cupcake_id,))
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({"message": f"Cupcake ID {cupcake_id} não encontrado."}), 404
        
        return jsonify({"message": f"Cupcake ID {cupcake_id} excluído com sucesso!"}), 200
    except Exception as e:
        conn.rollback()
        print(f"Erro ao excluir cupcake: {e}")
        return jsonify({"message": "Erro interno ao excluir no banco de dados."}), 500
    finally:
        conn.close()
if __name__ == '__main__':
    app.run(debug=True)