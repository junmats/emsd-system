// Quick script to check and clean assessment tables
const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAndCleanAssessmentTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // Check for existing assessment tables
    console.log('Checking for assessment tables...');
    const [tables] = await connection.execute("SHOW TABLES LIKE '%assessment%'");
    
    if (tables.length > 0) {
      console.log('Found assessment tables:', tables);
      
      // Drop them
      console.log('Dropping assessment tables...');
      await connection.execute('DROP TABLE IF EXISTS assessments');
      await connection.execute('DROP TABLE IF EXISTS assessment_batches');
      
      console.log('Assessment tables cleaned up successfully');
    } else {
      console.log('No assessment tables found - already clean');
    }
    
    // Verify cleanup
    const [remainingTables] = await connection.execute("SHOW TABLES LIKE '%assessment%'");
    console.log('Remaining assessment tables after cleanup:', remainingTables.length);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkAndCleanAssessmentTables();
