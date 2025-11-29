const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuração base (credenciais comuns, se houver)
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// 1. Banco Principal (Samuel)
const poolSamuel = mysql.createPool({
    ...dbConfig,
    database: '20252_prjint5_samueloliveira'
});

// 2. Banco Referência (Arthur)
const poolArthur = mysql.createPool({
    ...dbConfig,
    database: '20252_prjint5_arthursantanna'
});

// 3. Banco Réplica (Thamires)
const poolThamires = mysql.createPool({
    ...dbConfig,
    database: '20252_prjint5_thamirescristina'
});

module.exports = { poolSamuel, poolArthur, poolThamires };