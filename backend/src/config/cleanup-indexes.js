const sequelize = require('./database');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    // 1. Show all current indexes
    const [indexes] = await sequelize.query('SHOW INDEX FROM users');
    console.log('\n--- CURRENT INDEXES ON "users" TABLE ---');
    console.table(indexes.map(idx => ({
      Table: idx.Table,
      Non_unique: idx.Non_unique,
      Key_name: idx.Key_name,
      Seq_in_index: idx.Seq_in_index,
      Column_name: idx.Column_name
    })));

    // 2. Filter duplicates
    // We keep PRIMARY, and the very first index found for 'email' and 'phone'.
    // Any other indexes targeting email or phone are added to the drop list.
    const toDrop = [];
    let keptEmail = false;
    let keptPhone = false;

    // Use a Set to track processed Key_names so we don't try to drop the same index twice 
    // (since compound indexes/multiple rows can have the same Key_name)
    const processed = new Set();

    for (const idx of indexes) {
      const keyName = idx.Key_name;
      if (keyName === 'PRIMARY') continue;
      if (processed.has(keyName)) continue;

      if (idx.Column_name === 'email') {
        if (!keptEmail) {
          keptEmail = true;
          processed.add(keyName);
          console.log(`Keeping index for email: "${keyName}"`);
        } else {
          toDrop.push(keyName);
          processed.add(keyName);
        }
      } else if (idx.Column_name === 'phone') {
        if (!keptPhone) {
          keptPhone = true;
          processed.add(keyName);
          console.log(`Keeping index for phone: "${keyName}"`);
        } else {
          toDrop.push(keyName);
          processed.add(keyName);
        }
      }
    }

    console.log('\nDuplicate indexes identified for dropping:', toDrop);

    // 3. Drop duplicate indexes
    for (const keyName of toDrop) {
      console.log(`Dropping duplicate index: "${keyName}"...`);
      await sequelize.query(`ALTER TABLE users DROP INDEX \`${keyName}\``);
    }

    console.log('\nDatabase index cleanup completed successfully.');
  } catch (error) {
    console.error('Error executing database index cleanup:', error);
  } finally {
    await sequelize.close();
  }
}

run();
