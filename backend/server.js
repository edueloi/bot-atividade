const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const { spawn } = require('child_process');

const app = express();
const PORT = 3000;

// Gerenciamento do processo do bot
let botProcess = null;
let botStatus = 'parado'; // 'parado', 'iniciando', 'rodando', 'erro'
let botLogs = [];

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Helper para reiniciar bot após alterações
function agendarReinicioBot() {
  if (botProcess) {
    setTimeout(() => {
      console.log('🔄 Reiniciando bot após alterações...');
      reiniciarBot();
    }, 2000); // 2 segundos antes de reiniciar
  }
}

// ==================== ROTAS - UNIDADES ====================
app.get('/api/unidades', (req, res) => {
  db.all('SELECT * FROM unidades ORDER BY id', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/unidades/:id', (req, res) => {
  db.get('SELECT * FROM unidades WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

app.post('/api/unidades', (req, res) => {
  const { nome, descricao, endereco, ativa } = req.body;
  db.run(
    'INSERT INTO unidades (nome, descricao, endereco, ativa) VALUES (?, ?, ?, ?)',
    [nome, descricao, endereco, ativa || 1],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      agendarReinicioBot();
      res.json({ id: this.lastID, message: 'Unidade criada com sucesso' });
    }
  );
});

app.put('/api/unidades/:id', (req, res) => {
  const { nome, descricao, endereco, ativa } = req.body;
  db.run(
    'UPDATE unidades SET nome = ?, descricao = ?, endereco = ?, ativa = ? WHERE id = ?',
    [nome, descricao, endereco, ativa, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      agendarReinicioBot();
      res.json({ message: 'Unidade atualizada com sucesso' });
    }
  );
});

app.delete('/api/unidades/:id', (req, res) => {
  db.run('DELETE FROM unidades WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    agendarReinicioBot();
    res.json({ message: 'Unidade removida com sucesso' });
  });
});

// ==================== ROTAS - VENDEDORES ====================
app.get('/api/vendedores', (req, res) => {
  const query = `
    SELECT v.*, u.nome as unidade_nome 
    FROM vendedores v 
    LEFT JOIN unidades u ON v.unidade_id = u.id 
    ORDER BY v.ordem
  `;
  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/vendedores/:id', (req, res) => {
  db.get('SELECT * FROM vendedores WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

app.get('/api/vendedores/unidade/:unidadeId', (req, res) => {
  db.all(
    'SELECT * FROM vendedores WHERE unidade_id = ? AND ativo = 1 ORDER BY ordem',
    [req.params.unidadeId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.post('/api/vendedores', (req, res) => {
  const { nome, numero, unidade_id, ativo, ordem } = req.body;
  db.run(
    'INSERT INTO vendedores (nome, numero, unidade_id, ativo, ordem) VALUES (?, ?, ?, ?, ?)',
    [nome, numero, unidade_id, ativo || 1, ordem || 1],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      agendarReinicioBot();
      res.json({ id: this.lastID, message: 'Vendedor criado com sucesso' });
    }
  );
});

app.put('/api/vendedores/:id', (req, res) => {
  const { nome, numero, unidade_id, ativo, ordem } = req.body;
  db.run(
    'UPDATE vendedores SET nome = ?, numero = ?, unidade_id = ?, ativo = ?, ordem = ? WHERE id = ?',
    [nome, numero, unidade_id, ativo, ordem || 1, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      agendarReinicioBot();
      res.json({ message: 'Vendedor atualizado com sucesso' });
    }
  );
});

app.delete('/api/vendedores/:id', (req, res) => {
  db.run('DELETE FROM vendedores WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    agendarReinicioBot();
    res.json({ message: 'Vendedor removido com sucesso' });
  });
});

// ==================== ROTAS - VALORES/SERVIÇOS ====================
app.get('/api/valores', (req, res) => {
  const query = `
    SELECT v.*, u.nome as unidade_nome 
    FROM valores v 
    LEFT JOIN unidades u ON v.unidade_id = u.id 
    ORDER BY v.unidade_id, v.ordem
  `;
  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/valores/:id', (req, res) => {
  db.get('SELECT * FROM valores WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

app.post('/api/valores', (req, res) => {
  const { servico, preco, unidade_id, ordem } = req.body;
  db.run(
    'INSERT INTO valores (servico, preco, unidade_id, ordem) VALUES (?, ?, ?, ?)',
    [servico, preco, unidade_id, ordem || 1],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      agendarReinicioBot();
      res.json({ id: this.lastID, message: 'Valor criado com sucesso' });
    }
  );
});

app.put('/api/valores/:id', (req, res) => {
  const { servico, preco, unidade_id, ordem } = req.body;
  db.run(
    'UPDATE valores SET servico = ?, preco = ?, unidade_id = ?, ordem = ? WHERE id = ?',
    [servico, preco, unidade_id, ordem || 1, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      agendarReinicioBot();
      res.json({ message: 'Valor atualizado com sucesso' });
    }
  );
});

app.delete('/api/valores/:id', (req, res) => {
  db.run('DELETE FROM valores WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    agendarReinicioBot();
    res.json({ message: 'Valor removido com sucesso' });
  });
});

// ==================== ROTAS - DEPARTAMENTOS ====================
app.get('/api/departamentos', (req, res) => {
  const query = `
    SELECT d.*, u.nome as unidade_nome 
    FROM departamentos d 
    LEFT JOIN unidades u ON d.unidade_id = u.id
  `;
  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/departamentos/:id', (req, res) => {
  db.get('SELECT * FROM departamentos WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

app.post('/api/departamentos', (req, res) => {
  const { unidade_id, nome, mensagem } = req.body;
  db.run(
    'INSERT INTO departamentos (unidade_id, nome, mensagem) VALUES (?, ?, ?)',
    [unidade_id, nome, mensagem],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      agendarReinicioBot();
      res.json({ id: this.lastID, message: 'Departamento criado com sucesso' });
    }
  );
});

app.put('/api/departamentos/:id', (req, res) => {
  const { unidade_id, nome, mensagem } = req.body;
  db.run(
    'UPDATE departamentos SET unidade_id = ?, nome = ?, mensagem = ? WHERE id = ?',
    [unidade_id, nome, mensagem, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      agendarReinicioBot();
      res.json({ message: 'Departamento atualizado com sucesso' });
    }
  );
});

app.delete('/api/departamentos/:id', (req, res) => {
  db.run('DELETE FROM departamentos WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    agendarReinicioBot();
    res.json({ message: 'Departamento removido com sucesso' });
  });
});

// ==================== ROTAS - ENDEREÇOS ====================
app.get('/api/enderecos', (req, res) => {
  const query = `
    SELECT e.*, u.nome as unidade_nome 
    FROM enderecos e 
    LEFT JOIN unidades u ON e.unidade_id = u.id
  `;
  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.put('/api/enderecos/:id', (req, res) => {
  const { rua, numero, complemento, bairro, cidade, estado, cep } = req.body;
  db.run(
    'UPDATE enderecos SET rua = ?, numero = ?, complemento = ?, bairro = ?, cidade = ?, estado = ?, cep = ? WHERE id = ?',
    [rua, numero, complemento, bairro, cidade, estado, cep, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Endereço atualizado com sucesso' });
    }
  );
});

// ==================== ROTAS - CONFIGURAÇÕES ====================
app.get('/api/configuracoes', (req, res) => {
  db.all('SELECT * FROM configuracoes', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.put('/api/configuracoes/:id', (req, res) => {
  const { valor } = req.body;
  db.run(
    'UPDATE configuracoes SET valor = ? WHERE id = ?',
    [valor, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Configuração atualizada com sucesso' });
    }
  );
});

// ==================== ROTAS - LOGS ====================
app.get('/api/logs', (req, res) => {
  db.all(
    'SELECT * FROM logs_conversas ORDER BY data_hora DESC LIMIT 100',
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.post('/api/logs', (req, res) => {
  const { usuario_id, mensagem, resposta, menu_atual } = req.body;
  db.run(
    'INSERT INTO logs_conversas (usuario_id, mensagem, resposta, menu_atual) VALUES (?, ?, ?, ?)',
    [usuario_id, mensagem, resposta, menu_atual],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// ==================== CONTROLE DO BOT ====================
// Função para iniciar o bot
function iniciarBot() {
  if (botProcess) {
    return { success: false, message: 'Bot já está rodando' };
  }

  botStatus = 'iniciando';
  botLogs = ['🚀 Iniciando bot...'];

  botProcess = spawn('node', ['index-dinamico.js'], {
    cwd: path.join(__dirname, '..'),
    shell: true
  });

  botProcess.stdout.on('data', (data) => {
    const log = data.toString();
    botLogs.push(log);
    if (botLogs.length > 100) botLogs.shift(); // Manter apenas últimas 100 linhas
    
    if (log.includes('Bot iniciado com sucesso')) {
      botStatus = 'rodando';
    }
  });

  botProcess.stderr.on('data', (data) => {
    const log = `❌ ${data.toString()}`;
    botLogs.push(log);
    if (botLogs.length > 100) botLogs.shift();
  });

  botProcess.on('close', (code) => {
    botLogs.push(`Bot finalizado com código ${code}`);
    botStatus = code === 0 ? 'parado' : 'erro';
    botProcess = null;
  });

  return { success: true, message: 'Bot iniciado com sucesso' };
}

// Função para parar o bot
function pararBot() {
  if (!botProcess) {
    return { success: false, message: 'Bot não está rodando' };
  }

  try {
    // No Windows, usar taskkill para matar o processo e seus filhos (Chrome/Puppeteer)
    const { execSync } = require('child_process');
    execSync(`taskkill /pid ${botProcess.pid} /T /F`, { stdio: 'ignore' });
  } catch (error) {
    // Se taskkill falhar, tenta kill normal
    botProcess.kill('SIGKILL');
  }

  botProcess = null;
  botStatus = 'parado';
  botLogs.push('🛑 Bot parado pelo painel');

  return { success: true, message: 'Bot parado com sucesso' };
}

// Função para reiniciar o bot
function reiniciarBot() {
  if (botProcess) {
    pararBot();
    setTimeout(() => {
      iniciarBot();
    }, 3000); // 3 segundos para garantir que Chrome fechou
  } else {
    iniciarBot();
  }
  return { success: true, message: 'Bot reiniciando...' };
}

// Rotas de controle do bot
app.get('/api/bot/status', (req, res) => {
  res.json({
    status: botStatus,
    rodando: botProcess !== null,
    logs: botLogs.slice(-50) // Últimas 50 linhas
  });
});

app.post('/api/bot/iniciar', (req, res) => {
  const result = iniciarBot();
  res.json(result);
});

app.post('/api/bot/parar', (req, res) => {
  const result = pararBot();
  res.json(result);
});

app.post('/api/bot/reiniciar', (req, res) => {
  const result = reiniciarBot();
  res.json(result);
});

// ==================== ROTAS - CONFIGURAÇÕES ====================
app.get('/api/configuracoes', (req, res) => {
  db.all('SELECT * FROM configuracoes ORDER BY chave', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/configuracoes/:chave', (req, res) => {
  db.get('SELECT * FROM configuracoes WHERE chave = ?', [req.params.chave], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

app.put('/api/configuracoes/:chave', (req, res) => {
  const { valor } = req.body;
  console.log(`📝 Atualizando configuração: ${req.params.chave}`);
  console.log(`   Novo valor: ${valor.substring(0, 50)}...`);
  
  db.run(
    'UPDATE configuracoes SET valor = ?, updated_at = CURRENT_TIMESTAMP WHERE chave = ?',
    [valor, req.params.chave],
    function(err) {
      if (err) {
        console.error('❌ Erro ao atualizar:', err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log(`✅ Atualizado! Linhas afetadas: ${this.changes}`);
      agendarReinicioBot();
      res.json({ message: 'Configuração atualizada com sucesso' });
    }
  );
});

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📊 Painel administrativo disponível em http://localhost:${PORT}`);
  console.log(`\n💡 Use o painel para controlar o bot!`);
});

module.exports = app;
