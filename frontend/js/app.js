const API_URL = 'http://localhost:3000/api';

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    carregarTodosDados();
});

// ==================== TABS ====================
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// ==================== CARREGAR DADOS ====================
async function carregarTodosDados() {
    await carregarUnidades();
    await carregarVendedores();
    await carregarServicos();
    await carregarDepartamentos();
    await carregarEnderecos();
    await carregarConfiguracoes();
}

// ==================== UNIDADES ====================
async function carregarUnidades() {
    try {
        const response = await fetch(`${API_URL}/unidades`);
        const unidades = await response.json();
        
        const container = document.getElementById('lista-unidades');
        container.innerHTML = unidades.map(u => `
            <div class="data-card">
                <div class="data-card-header">
                    <div class="data-card-title">${u.icone} ${u.nome}</div>
                    <span class="data-card-badge ${u.ativo ? 'badge-active' : 'badge-inactive'}">
                        ${u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                </div>
                <div class="data-card-body">
                    <div class="data-card-info">
                        <p><strong>Descrição:</strong> ${u.descricao || 'N/A'}</p>
                        <p><strong>Ordem:</strong> ${u.ordem}</p>
                    </div>
                </div>
                <div class="data-card-actions">
                    <button class="btn btn-warning" onclick='editarUnidade(${JSON.stringify(u)})'>✏️ Editar</button>
                    <button class="btn btn-danger" onclick="excluirUnidade(${u.id})">🗑️ Excluir</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar unidades:', error);
    }
}

function abrirModalUnidade(dados = null) {
    const modal = document.getElementById('modal-unidade');
    document.getElementById('titulo-modal-unidade').textContent = dados ? 'Editar Unidade' : 'Nova Unidade';
    
    if (dados) {
        document.getElementById('unidade-id').value = dados.id;
        document.getElementById('unidade-nome').value = dados.nome;
        document.getElementById('unidade-descricao').value = dados.descricao || '';
        document.getElementById('unidade-icone').value = dados.icone || '';
        document.getElementById('unidade-ordem').value = dados.ordem;
        document.getElementById('unidade-ativo').checked = dados.ativo;
    } else {
        document.getElementById('form-unidade').reset();
        document.getElementById('unidade-id').value = '';
    }
    
    modal.classList.add('active');
}

function editarUnidade(dados) {
    abrirModalUnidade(dados);
}

async function salvarUnidade(event) {
    event.preventDefault();
    
    const id = document.getElementById('unidade-id').value;
    const dados = {
        nome: document.getElementById('unidade-nome').value,
        descricao: document.getElementById('unidade-descricao').value,
        icone: document.getElementById('unidade-icone').value,
        ordem: parseInt(document.getElementById('unidade-ordem').value),
        ativo: document.getElementById('unidade-ativo').checked ? 1 : 0
    };
    
    try {
        const url = id ? `${API_URL}/unidades/${id}` : `${API_URL}/unidades`;
        const method = id ? 'PUT' : 'POST';
        
        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        
        fecharModal('modal-unidade');
        carregarUnidades();
        mostrarAlerta('Unidade salva com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao salvar unidade:', error);
        mostrarAlerta('Erro ao salvar unidade', 'error');
    }
}

async function excluirUnidade(id) {
    if (!confirm('Deseja realmente excluir esta unidade?')) return;
    
    try {
        await fetch(`${API_URL}/unidades/${id}`, { method: 'DELETE' });
        carregarUnidades();
        mostrarAlerta('Unidade excluída com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao excluir unidade:', error);
        mostrarAlerta('Erro ao excluir unidade', 'error');
    }
}

// ==================== VENDEDORES ====================
async function carregarVendedores() {
    try {
        const response = await fetch(`${API_URL}/vendedores`);
        const vendedores = await response.json();
        
        const container = document.getElementById('lista-vendedores');
        container.innerHTML = vendedores.map(v => `
            <div class="data-card">
                <div class="data-card-header">
                    <div class="data-card-title">👤 ${v.nome}</div>
                    <span class="data-card-badge ${v.ativo ? 'badge-active' : 'badge-inactive'}">
                        ${v.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                </div>
                <div class="data-card-body">
                    <div class="data-card-info">
                        <p><strong>Telefone:</strong> ${v.telefone}</p>
                        <p><strong>Email:</strong> ${v.email || 'N/A'}</p>
                        <p><strong>Unidade:</strong> ${v.unidade_nome || 'N/A'}</p>
                        <p><strong>Ordem:</strong> ${v.ordem}</p>
                    </div>
                </div>
                <div class="data-card-actions">
                    <button class="btn btn-warning" onclick='editarVendedor(${JSON.stringify(v)})'>✏️ Editar</button>
                    <button class="btn btn-danger" onclick="excluirVendedor(${v.id})">🗑️ Excluir</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar vendedores:', error);
    }
}

async function abrirModalVendedor(dados = null) {
    // Carregar unidades no select
    const response = await fetch(`${API_URL}/unidades`);
    const unidades = await response.json();
    
    const select = document.getElementById('vendedor-unidade');
    select.innerHTML = unidades.map(u => 
        `<option value="${u.id}">${u.nome}</option>`
    ).join('');
    
    const modal = document.getElementById('modal-vendedor');
    document.getElementById('titulo-modal-vendedor').textContent = dados ? 'Editar Vendedor' : 'Novo Vendedor';
    
    if (dados) {
        document.getElementById('vendedor-id').value = dados.id;
        document.getElementById('vendedor-nome').value = dados.nome;
        document.getElementById('vendedor-telefone').value = dados.telefone;
        document.getElementById('vendedor-email').value = dados.email || '';
        document.getElementById('vendedor-unidade').value = dados.unidade_id;
        document.getElementById('vendedor-ordem').value = dados.ordem;
        document.getElementById('vendedor-ativo').checked = dados.ativo;
    } else {
        document.getElementById('form-vendedor').reset();
        document.getElementById('vendedor-id').value = '';
    }
    
    modal.classList.add('active');
}

function editarVendedor(dados) {
    abrirModalVendedor(dados);
}

async function salvarVendedor(event) {
    event.preventDefault();
    
    const id = document.getElementById('vendedor-id').value;
    const dados = {
        nome: document.getElementById('vendedor-nome').value,
        telefone: document.getElementById('vendedor-telefone').value,
        email: document.getElementById('vendedor-email').value,
        unidade_id: parseInt(document.getElementById('vendedor-unidade').value),
        ordem: parseInt(document.getElementById('vendedor-ordem').value),
        ativo: document.getElementById('vendedor-ativo').checked ? 1 : 0
    };
    
    try {
        const url = id ? `${API_URL}/vendedores/${id}` : `${API_URL}/vendedores`;
        const method = id ? 'PUT' : 'POST';
        
        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        
        fecharModal('modal-vendedor');
        carregarVendedores();
        mostrarAlerta('Vendedor salvo com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao salvar vendedor:', error);
        mostrarAlerta('Erro ao salvar vendedor', 'error');
    }
}

async function excluirVendedor(id) {
    if (!confirm('Deseja realmente excluir este vendedor?')) return;
    
    try {
        await fetch(`${API_URL}/vendedores/${id}`, { method: 'DELETE' });
        carregarVendedores();
        mostrarAlerta('Vendedor excluído com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao excluir vendedor:', error);
        mostrarAlerta('Erro ao excluir vendedor', 'error');
    }
}

// ==================== SERVIÇOS ====================
async function carregarServicos() {
    try {
        const response = await fetch(`${API_URL}/servicos`);
        const servicos = await response.json();
        
        const container = document.getElementById('lista-servicos');
        container.innerHTML = servicos.map(s => `
            <div class="data-card">
                <div class="data-card-header">
                    <div class="data-card-title">💰 ${s.nome}</div>
                    <span class="data-card-badge ${s.ativo ? 'badge-active' : 'badge-inactive'}">
                        ${s.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                </div>
                <div class="data-card-body">
                    <div class="data-card-info">
                        <p><strong>Descrição:</strong> ${s.descricao || 'N/A'}</p>
                        <p><strong>Valor:</strong> R$ ${parseFloat(s.valor).toFixed(2)}</p>
                        <p><strong>Unidade:</strong> ${s.unidade_nome || 'N/A'}</p>
                        <p><strong>Ordem:</strong> ${s.ordem}</p>
                    </div>
                </div>
                <div class="data-card-actions">
                    <button class="btn btn-warning" onclick='editarServico(${JSON.stringify(s)})'>✏️ Editar</button>
                    <button class="btn btn-danger" onclick="excluirServico(${s.id})">🗑️ Excluir</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar serviços:', error);
    }
}

async function abrirModalServico(dados = null) {
    // Carregar unidades no select
    const response = await fetch(`${API_URL}/unidades`);
    const unidades = await response.json();
    
    const select = document.getElementById('servico-unidade');
    select.innerHTML = unidades.map(u => 
        `<option value="${u.id}">${u.nome}</option>`
    ).join('');
    
    const modal = document.getElementById('modal-servico');
    document.getElementById('titulo-modal-servico').textContent = dados ? 'Editar Serviço' : 'Novo Serviço';
    
    if (dados) {
        document.getElementById('servico-id').value = dados.id;
        document.getElementById('servico-nome').value = dados.nome;
        document.getElementById('servico-descricao').value = dados.descricao || '';
        document.getElementById('servico-valor').value = dados.valor;
        document.getElementById('servico-unidade').value = dados.unidade_id;
        document.getElementById('servico-ordem').value = dados.ordem;
        document.getElementById('servico-ativo').checked = dados.ativo;
    } else {
        document.getElementById('form-servico').reset();
        document.getElementById('servico-id').value = '';
    }
    
    modal.classList.add('active');
}

function editarServico(dados) {
    abrirModalServico(dados);
}

async function salvarServico(event) {
    event.preventDefault();
    
    const id = document.getElementById('servico-id').value;
    const dados = {
        nome: document.getElementById('servico-nome').value,
        descricao: document.getElementById('servico-descricao').value,
        valor: parseFloat(document.getElementById('servico-valor').value),
        unidade_id: parseInt(document.getElementById('servico-unidade').value),
        ordem: parseInt(document.getElementById('servico-ordem').value),
        ativo: document.getElementById('servico-ativo').checked ? 1 : 0
    };
    
    try {
        const url = id ? `${API_URL}/servicos/${id}` : `${API_URL}/servicos`;
        const method = id ? 'PUT' : 'POST';
        
        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        
        fecharModal('modal-servico');
        carregarServicos();
        mostrarAlerta('Serviço salvo com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao salvar serviço:', error);
        mostrarAlerta('Erro ao salvar serviço', 'error');
    }
}

async function excluirServico(id) {
    if (!confirm('Deseja realmente excluir este serviço?')) return;
    
    try {
        await fetch(`${API_URL}/servicos/${id}`, { method: 'DELETE' });
        carregarServicos();
        mostrarAlerta('Serviço excluído com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao excluir serviço:', error);
        mostrarAlerta('Erro ao excluir serviço', 'error');
    }
}

// ==================== DEPARTAMENTOS ====================
async function carregarDepartamentos() {
    try {
        const response = await fetch(`${API_URL}/departamentos`);
        const departamentos = await response.json();
        
        const container = document.getElementById('lista-departamentos');
        container.innerHTML = departamentos.map(d => `
            <div class="data-card">
                <div class="data-card-header">
                    <div class="data-card-title">📋 ${d.nome}</div>
                    <span class="data-card-badge ${d.ativo ? 'badge-active' : 'badge-inactive'}">
                        ${d.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                </div>
                <div class="data-card-body">
                    <div class="data-card-info">
                        <p><strong>Unidade:</strong> ${d.unidade_nome || 'N/A'}</p>
                        <p><strong>Telefone:</strong> ${d.telefone || 'N/A'}</p>
                        <p><strong>Email:</strong> ${d.email || 'N/A'}</p>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar departamentos:', error);
    }
}

// ==================== ENDEREÇOS ====================
async function carregarEnderecos() {
    try {
        const response = await fetch(`${API_URL}/enderecos`);
        const enderecos = await response.json();
        
        const container = document.getElementById('lista-enderecos');
        container.innerHTML = enderecos.map(e => `
            <div class="data-card">
                <div class="data-card-header">
                    <div class="data-card-title">📍 ${e.unidade_nome || 'Endereço'}</div>
                </div>
                <div class="data-card-body">
                    <div class="data-card-info">
                        <p><strong>Rua:</strong> ${e.rua}</p>
                        <p><strong>Cidade:</strong> ${e.cidade}/${e.estado}</p>
                        <p><strong>CEP:</strong> ${e.cep || 'N/A'}</p>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar endereços:', error);
    }
}

// ==================== CONFIGURAÇÕES ====================
async function carregarConfiguracoes() {
    try {
        const response = await fetch(`${API_URL}/configuracoes`);
        const configuracoes = await response.json();
        
        const container = document.getElementById('lista-configuracoes');
        container.innerHTML = configuracoes.map(c => `
            <div class="data-card">
                <div class="data-card-header">
                    <div class="data-card-title">⚙️ ${c.descricao}</div>
                </div>
                <div class="data-card-body">
                    <div class="data-card-info">
                        <p><strong>Chave:</strong> ${c.chave}</p>
                        <p><strong>Valor:</strong> ${c.valor}</p>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
    }
}

// ==================== LOGS ====================
async function carregarLogs() {
    try {
        const response = await fetch(`${API_URL}/logs`);
        const logs = await response.json();
        
        const container = document.getElementById('lista-logs');
        container.innerHTML = logs.length > 0 ? logs.map(log => `
            <div class="log-card">
                <div class="log-header">
                    <span>📱 Usuário: ${log.usuario_id}</span>
                    <span>🕐 ${new Date(log.data_hora).toLocaleString('pt-BR')}</span>
                </div>
                <div class="log-content">
                    <p><strong>Mensagem:</strong> ${log.mensagem || 'N/A'}</p>
                    <p><strong>Menu:</strong> ${log.menu_atual || 'N/A'}</p>
                </div>
            </div>
        `).join('') : '<p>Nenhum log disponível</p>';
    } catch (error) {
        console.error('Erro ao carregar logs:', error);
    }
}

// ==================== UTILITÁRIOS ====================
function fecharModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function mostrarAlerta(mensagem, tipo) {
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo}`;
    alerta.textContent = mensagem;
    alerta.style.position = 'fixed';
    alerta.style.top = '20px';
    alerta.style.right = '20px';
    alerta.style.zIndex = '9999';
    
    document.body.appendChild(alerta);
    
    setTimeout(() => {
        alerta.remove();
    }, 3000);
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
}
