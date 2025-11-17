import sqlite3
from flask import Flask, request, jsonify, g
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS
from functools import wraps
from datetime import datetime, timedelta
import jwt 
from db import (
    get_db_connection, 
    get_user_by_email_and_role, 
    get_user_by_id, 
    create_user, 
    login_required, 
    admin_required, 
    init_db,
    get_pedido_details 
)


app = Flask(__name__)
CORS(app) 

# CHAVE SECRETA PARA ASSINAR OS TOKENS JWT
CHAVE_SECRETA = "sua_chave_super_secreta_e_forte_aqui_12345" 
app.config['SECRET_KEY'] = CHAVE_SECRETA


@app.teardown_appcontext
def close_connection(exception):
    """Fecha a conexão com o banco de dados ao final de cada requisição."""
    conn = getattr(g, '_database', None)
    if conn is not None:
        conn.close()


@app.route("/api/cupcakes/publico", methods=['GET'])
def listar_cupcakes_publico():
    try:
        conn = get_db_connection()
        cupcakes_data = conn.execute('SELECT id, nome, descricao, preco FROM cupcake WHERE disponivel = 1').fetchall()
        
        cupcakes = []
        for c in cupcakes_data:
            cupcakes.append({
                'id': c['id'],
                'nome': c['nome'],
                'descricao': c['descricao'],
                'preco': c['preco'], 
            })
            
        return jsonify(cupcakes), 200

    except sqlite3.Error as e:
        print(f"Erro no banco de dados ao listar cupcakes: {e}")
        return jsonify({'message': 'Erro interno ao buscar lista de produtos.'}), 500


@app.route('/api/cadastro', methods=['POST'])
def cadastro_usuario():
    data = request.json
    
    nome = data.get('nome') 
    email = data.get('email')
    senha = data.get('senha')
    
    if not email or not senha:
        return jsonify({'message': 'Email e senha são obrigatórios.'}), 400
    
    if not nome:
        nome = email.split('@')[0] 

    conn = get_db_connection()
    try:
        existing_user = conn.execute('SELECT id FROM usuario WHERE email = ?', (email,)).fetchone()
        if existing_user:
            return jsonify({'message': 'Usuário com este email já existe.'}), 409

        hashed_password = generate_password_hash(senha, method='pbkdf2:sha256')

        cursor = conn.execute('INSERT INTO usuario (nome, email, senha_hash, role) VALUES (?, ?, ?, ?)',
                           (nome, email, hashed_password, 'cliente'))
        user_id = cursor.lastrowid
        conn.commit()
        
        return jsonify({'message': f'Cadastro de cliente realizado com sucesso!'}), 201

    except sqlite3.Error as e:
        conn.rollback()
        print(f"Erro ao cadastrar usuário: {e}")
        return jsonify({'message': 'Erro interno ao processar o cadastro.'}), 500


@app.route("/api/login", methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('senha')
    
    if not email or not password:
        return jsonify({'message': 'Email e senha são obrigatórios.'}), 400

    conn = get_db_connection()
    user = conn.execute('SELECT * FROM usuario WHERE email = ?', (email,)).fetchone()
    
    if not user:
        return jsonify({'message': 'Credenciais inválidas: Email incorreto.'}), 401

    try:
        if check_password_hash(user['senha_hash'], password):
            token_payload = {
                'user_id': user['id'], 
                'role': user['role'],
                'exp': datetime.utcnow() + timedelta(hours=24)
            }
            token = jwt.encode(token_payload, app.config['SECRET_KEY'], algorithm="HS256")
            
            
            return jsonify({
                'message': 'Login bem-sucedido!',
                'token': token,
                'role': user['role'],
                'user_id': user['id'], 
                'user_name': user['nome']
            }), 200
        else:
            return jsonify({'message': 'Credenciais inválidas: Senha incorreta.'}), 401
    except ValueError:
        return jsonify({'message': 'Erro de formato de senha (hash inválido).'}), 500


@app.route("/api/admin/cupcakes", methods=["GET"])
@admin_required
def listar_cupcakes_admin(current_user_id):
    conn = get_db_connection()
    cupcakes = conn.execute('SELECT * FROM cupcake').fetchall()
    conn.close()
    cupcakes_list = [dict(cupcake) for cupcake in cupcakes]
    return jsonify({"cupcakes": cupcakes_list}), 200

# --- ROTA PROTEGIDA: CRIAR NOVO CUPCAKE ---
@app.route("/api/admin/cupcakes", methods=["POST"])
@admin_required
def criar_cupcake(current_user_id):
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
        conn.execute('INSERT INTO cupcake (nome, descricao, preco) VALUES (?, ?, ?)',
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
def atualizar_cupcake(current_user_id, cupcake_id):
    data = request.get_json()
    nome = data.get('nome')
    descricao = data.get('descricao')
    preco = data.get('preco')
    disponivel = data.get('disponivel', 1) 
    
    if not nome or not preco:
        return jsonify({"message": "Nome e preço são obrigatórios para atualização."}), 400
    
    try:
        preco = float(preco)
        disponivel = int(disponivel)
    except ValueError:
        return jsonify({"message": "Preço ou Disponibilidade inválidos."}), 400


    conn = get_db_connection()
    try:
        cursor = conn.execute(''' 
              UPDATE cupcake SET nome = ?, descricao = ?, preco = ?, disponivel = ?
              WHERE id = ?
            ''', (nome, descricao, preco, disponivel, cupcake_id)) 
        
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

@app.route("/api/admin/cupcakes/<int:cupcake_id>", methods=["DELETE"])
@admin_required
def excluir_cupcake(current_user_id, cupcake_id):
    conn = get_db_connection()
    try:
        cursor = conn.execute('DELETE FROM cupcake WHERE id = ?', (cupcake_id,))
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

@app.route("/api/admin/pedidos", methods=["GET"])
@admin_required
def listar_pedidos_admin(current_user_id):
    conn = get_db_connection()
    try:
        query = """
        SELECT 
            p.id AS pedido_id, 
            p.data_pedido, 
            p.status, 
            p.valor_total,
            u.nome AS nome_cliente,
            u.email AS email_cliente,
            e.rua, 
            e.numero,
            e.cidade,
            e.estado
        FROM pedido p
        JOIN usuario u ON p.usuario_id = u.id
        LEFT JOIN endereco e ON p.endereco_id = e.id
        ORDER BY p.data_pedido DESC
        """
        pedidos_data = conn.execute(query).fetchall()
        
        pedidos_list = []
        for p in pedidos_data:
            pedidos_list.append({
                'pedido_id': p['pedido_id'],
                'data_pedido': p['data_pedido'],
                'status': p['status'],
                'valor_total': p['valor_total'],
                'nome_cliente': p['nome_cliente'],
                'email_cliente': p['email_cliente'],
                'endereco': f"{p['rua']}, {p['numero']} - {p['cidade']}/{p['estado']}" if p['rua'] else "Endereço não disponível"
            })
            
        return jsonify({"pedidos": pedidos_list}), 200

    except sqlite3.Error as e:
        print(f"Erro ao listar pedidos (Admin): {e}")
        return jsonify({"message": "Erro interno ao buscar lista de pedidos."}), 500
    finally:
        conn.close()

@app.route("/api/admin/pedidos/<int:pedido_id>/status", methods=["PUT"])
@admin_required
def atualizar_status_pedido(current_user_id, pedido_id):
    data = request.get_json()
    novo_status = data.get('status')
    
    if not novo_status:
        return jsonify({"message": "Status é obrigatório."}), 400
        
    status_validos = ['pendente', 'em preparacao', 'a caminho', 'entregue', 'cancelado']
    if novo_status not in status_validos:
        return jsonify({"message": f"Status inválido. Use um dos seguintes: {', '.join(status_validos)}"}), 400

    conn = get_db_connection()
    try:
        cursor = conn.execute('UPDATE pedido SET status = ? WHERE id = ?', (novo_status, pedido_id))
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({"message": f"Pedido ID {pedido_id} não encontrado."}), 404
            
        return jsonify({"message": f"Status do Pedido ID {pedido_id} atualizado para '{novo_status}'."}), 200
    except Exception as e:
        conn.rollback()
        print(f"Erro ao atualizar status do pedido: {e}")
        return jsonify({"message": "Erro interno ao atualizar status."}), 500
    finally:
        conn.close()

@app.route("/api/admin/pedidos/<int:pedido_id>", methods=['GET'])
@admin_required
def get_single_pedido_details(current_user_id, pedido_id):
    try:
        details = get_pedido_details(pedido_id)
        if details:
            return jsonify(details), 200
        else:
            return jsonify({"message": "Pedido não encontrado"}), 404
    except Exception as e:
        print(f"Erro ao buscar detalhes do pedido: {e}")
        return jsonify({"message": "Erro interno do servidor"}), 500


@app.route('/api/endereco', methods=['GET'])
@login_required
def get_endereco(current_user_id):
    """
    Recupera o endereço do usuário logado.
    """
    conn = get_db_connection()
    endereco = conn.execute('SELECT cep, rua, numero, complemento, bairro, cidade, estado FROM endereco WHERE usuario_id = ?', 
                              (current_user_id,)).fetchone()
    conn.close()

    if endereco is None:
        return jsonify({'message': 'Endereço não encontrado'}), 404

    return jsonify(dict(endereco)), 200


@app.route('/api/endereco', methods=['POST'])
@login_required
def salvar_endereco(current_user_id):
    """
    Salva ou atualiza o endereço de entrega do usuário.
    """
    data = request.json
    required_fields = ['cep', 'rua', 'numero', 'bairro', 'cidade', 'estado']
    if not all(data.get(field) for field in required_fields):
        return jsonify({'message': 'Todos os campos de endereço são obrigatórios (exceto complemento).'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    existe = conn.execute('SELECT id FROM endereco WHERE usuario_id = ?', (current_user_id,)).fetchone()

    try:
        if existe:
            # UPDATE
            cursor.execute("""
                UPDATE endereco SET cep = ?, rua = ?, numero = ?, complemento = ?, bairro = ?, cidade = ?, estado = ? 
                WHERE usuario_id = ?
            """, (data['cep'], data['rua'], data['numero'], data.get('complemento', ''), data['bairro'], data['cidade'], data['estado'], current_user_id))
            message = 'Endereço atualizado com sucesso!'
        else:
            # INSERT
            cursor.execute("""
                INSERT INTO endereco (usuario_id, cep, rua, numero, complemento, bairro, cidade, estado) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (current_user_id, data['cep'], data['rua'], data['numero'], data.get('complemento', ''), data['bairro'], data['cidade'], data['estado']))
            message = 'Endereço salvo com sucesso!'
        
        conn.commit()
        return jsonify({'message': message}), 200

    except sqlite3.Error as e:
        conn.rollback()
        return jsonify({'message': f'Erro ao salvar endereço: {str(e)}'}), 500
    finally:
        conn.close()


@app.route('/api/pedidos', methods=['POST'])
@login_required
def criar_pedido(current_user_id):
    data = request.json
    itens = data.get('itens') # Lista de {cupcake_id, quantidade}
    
    if not itens or len(itens) == 0:
        return jsonify({'message': 'O carrinho não pode estar vazio.'}), 400
        
    conn = get_db_connection()
    
    try:
        # 1. Recuperar o ID do endereço do usuário
        endereco = conn.execute('SELECT id FROM endereco WHERE usuario_id = ?', (current_user_id,)).fetchone()
        if not endereco:
            return jsonify({'message': 'Endereço de entrega não cadastrado. Por favor, cadastre um endereço primeiro.'}), 400
        endereco_id = endereco['id']

        # 2. VERIFICAÇÃO DE PREÇO E CÁLCULO DO TOTAL (CORREÇÃO DE SEGURANÇA)
        valor_total_calculado = 0
        itens_para_db = []

        for item_front in itens:
            cupcake_id = item_front.get('cupcake_id')
            quantidade = item_front.get('quantidade')
            
            if not cupcake_id or not quantidade or int(quantidade) <= 0:
                continue # Ignora itens inválidos

            # Busca o preço real no banco de dados
            cupcake_db = conn.execute('SELECT preco FROM cupcake WHERE id = ? AND disponivel = 1', (cupcake_id,)).fetchone()
            
            if not cupcake_db:
                # Se o cupcake não existe ou não está disponível
                conn.rollback()
                return jsonify({'message': f'O item com ID {cupcake_id} não está mais disponível.'}), 400
            
            preco_unitario_real = cupcake_db['preco']
            valor_total_calculado += preco_unitario_real * int(quantidade)
            itens_para_db.append((cupcake_id, int(quantidade), preco_unitario_real))

        if not itens_para_db:
             return jsonify({'message': 'Nenhum item válido no pedido.'}), 400

        # 3. Criar o registro principal do pedido
        cursor = conn.execute("""
            INSERT INTO pedido (usuario_id, endereco_id, data_pedido, valor_total, status) 
            VALUES (?, ?, datetime('now', 'localtime'), ?, ?)
        """, (current_user_id, endereco_id, valor_total_calculado, 'pendente'))
        pedido_id = cursor.lastrowid
        
        # 4. Inserir os itens do pedido
        for (cupcake_id, quantidade, preco_unitario) in itens_para_db:
            conn.execute("""
                INSERT INTO pedido_item (pedido_id, cupcake_id, quantidade, preco_unitario)
                VALUES (?, ?, ?, ?)
            """, (pedido_id, cupcake_id, quantidade, preco_unitario))
            
        conn.commit()
        return jsonify({'message': f'Pedido ID {pedido_id} realizado com sucesso!', 'pedido_id': pedido_id}), 201

    except sqlite3.Error as e:
        conn.rollback()
        print(f"Erro ao criar pedido: {e}")
        return jsonify({'message': 'Erro interno ao processar o pedido.'}), 500
    finally:
        conn.close()


@app.route('/api/pedidos/meus', methods=['GET'])
@login_required
def listar_meus_pedidos(current_user_id):
    conn = get_db_connection()
    try:
        # Busca apenas os pedidos do usuário logado
        pedidos_data = conn.execute("""
        SELECT id AS pedido_id, data_pedido, valor_total, status 
        FROM pedido 
        WHERE usuario_id = ?
        ORDER BY data_pedido DESC
        """, (current_user_id,)).fetchall()
        
        pedidos_list = [dict(p) for p in pedidos_data]
            
        return jsonify({"pedidos": pedidos_list}), 200
    except sqlite3.Error as e:
        print(f"Erro ao listar pedidos do usuário: {e}")
        return jsonify({'message': 'Erro interno ao buscar seus pedidos.'}), 500
    finally:
        conn.close()

@app.route('/api/pedidos/<int:pedido_id>', methods=['GET'])
@login_required
def get_meu_pedido_details(current_user_id, pedido_id):
    """
    Retorna os detalhes de um pedido específico, SE o cliente for o dono.
    """
    try:
        conn = get_db_connection()
        # Verifica se o pedido pertence ao usuário logado
        pedido_owner = conn.execute('SELECT usuario_id FROM pedido WHERE id = ?', (pedido_id,)).fetchone()
        
        if not pedido_owner:
             return jsonify({"message": "Pedido não encontrado"}), 404
        
        if pedido_owner['usuario_id'] != current_user_id:
             return jsonify({"message": "Acesso não autorizado a este pedido"}), 403

        # Se a verificação passou, busca os detalhes completos
        details = get_pedido_details(pedido_id)
        
        if details:
            return jsonify(details), 200
        else:
            return jsonify({"message": "Pedido não encontrado"}), 404
    except Exception as e:
        print(f"Erro ao buscar detalhes do pedido (cliente): {e}")
        return jsonify({"message": "Erro interno do servidor"}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)