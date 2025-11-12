# Importe as novas bibliotecas no topo
from flask import Flask, jsonify, request
from flask_cors import CORS
# Importe suas funções do banco de dados
import db # (Seu arquivo db.py)

app = Flask(__name__)

# --- Configuração do CORS ---
# Isso permite que o seu front-end (ex: http://127.0.0.1:5500) 
# se comunique com o seu back-end (http://127.0.0.1:5000)
CORS(app) 

# ---
# Rota de Login do Cliente (baseado no seu "login.html")
# ---
@app.route("/api/login/cliente", methods=['POST'])
def login_cliente():
    # 1. Pega os dados (email, senha) que o JavaScript enviou
    data = request.get_json()
    email = data.get('email')
    senha = data.get('senha')

    # 2. (Etapa Futura) Verificar no banco de dados
    # Por enquanto, vamos apenas simular um login de sucesso

    # print(f"Tentativa de login com: {email} / {senha}") # Para você ver no terminal

    # Simulação de verificação
    if email == "cliente@teste.com" and senha == "1234":
        # Login deu certo!
        return jsonify({
            "message": "Login bem-sucedido!",
            "user": {"nome": "Cliente Teste", "email": email}
        }), 200
    else:
        # Login falhou
        return jsonify({"message": "E-mail ou senha inválidos"}), 401


# ---
# Rota de Cadastro do Cliente (baseado no seu "cadastro-cliente.html")
# ---
@app.route("/api/cadastro/cliente", methods=['POST'])
def cadastro_cliente():
    data = request.get_json()
    nome = data.get('nome')
    email = data.get('email')
    senha = data.get('senha')

    # (Etapa Futura): Salvar no banco de dados
    # conn = db.get_db()
    # cursor = conn.cursor()
    # cursor.execute("INSERT INTO clientes (nome, email) VALUES (?, ?)", (nome, email))
    # conn.commit()
    # conn.close()

    print(f"Novo cadastro: {nome} / {email}")

    # Retorna uma resposta de sucesso
    return jsonify({"message": "Cliente cadastrado com sucesso!"}), 201


# ---
# Rota principal (só para teste)
# ---
@app.route("/")
def hello():
    return "Back-end do Cupcake App está rodando!"

# ---
# Executa a aplicação
# ---
if __name__ == '__main__':
    # Certifique-se de criar o banco antes de rodar a app
    # db.criar_banco() # Você só precisa rodar isso uma vez
    app.run(debug=True, port=5000)