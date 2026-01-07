const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./clinica.db');

console.log('📊 Verificando banco de dados...\n');

db.all('SELECT * FROM configuracoes', (err, rows) => {
  if (err) {
    console.error('❌ Erro:', err.message);
  } else {
    console.log('✅ Configurações encontradas:', rows.length);
    rows.forEach(row => {
      console.log(`\n🔹 ${row.chave}`);
      console.log(`   Valor: ${row.valor.substring(0, 60)}...`);
      console.log(`   Descrição: ${row.descricao}`);
    });
  }
  db.close();
});
