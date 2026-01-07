const db = require('./backend/database');

// Funções auxiliares para buscar dados do banco

// Buscar unidades ativas
function buscarUnidades() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM unidades WHERE ativo = 1 ORDER BY ordem', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Buscar vendedores por unidade
function buscarVendedoresPorUnidade(unidadeId) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM vendedores WHERE unidade_id = ? AND ativo = 1 ORDER BY ordem',
      [unidadeId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

// Buscar serviços por unidade
function buscarServicosPorUnidade(unidadeId) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM servicos WHERE unidade_id = ? AND ativo = 1 ORDER BY ordem',
      [unidadeId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

// Buscar departamentos por unidade
function buscarDepartamentosPorUnidade(unidadeId) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM departamentos WHERE unidade_id = ? AND ativo = 1 ORDER BY ordem',
      [unidadeId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

// Buscar endereço por unidade
function buscarEnderecoPorUnidade(unidadeId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM enderecos WHERE unidade_id = ?',
      [unidadeId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

// Buscar configuração
function buscarConfiguracao(chave) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT valor FROM configuracoes WHERE chave = ?',
      [chave],
      (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.valor : null);
      }
    );
  });
}

// Salvar log de conversa
function salvarLog(usuarioId, mensagem, resposta, menuAtual) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO logs_conversas (usuario_id, mensagem, resposta, menu_atual) VALUES (?, ?, ?, ?)',
      [usuarioId, mensagem, resposta, menuAtual],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

module.exports = {
  buscarUnidades,
  buscarVendedoresPorUnidade,
  buscarServicosPorUnidade,
  buscarDepartamentosPorUnidade,
  buscarEnderecoPorUnidade,
  buscarConfiguracao,
  salvarLog
};
