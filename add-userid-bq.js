const { BigQuery } = require('@google-cloud/bigquery');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const projectId = 'avocast';
const datasetId = 'avocast_data';
const tableId = 'users';

const bigquery = new BigQuery({ projectId });

async function recreateTableAndBackfill() {
  try {
    const dataset = bigquery.dataset(datasetId);
    const table = dataset.table(tableId);

    console.log(`Dropping existing table ${tableId} to recreate with new schema...`);
    await table.delete({ ignoreNotFound: true });
    console.log(`Table ${tableId} deleted.`);

    console.log(`Recreating table ${tableId} with userId...`);
    const schema = [
      { name: 'userId', type: 'STRING', mode: 'REQUIRED' },
      { name: 'companyName', type: 'STRING', mode: 'REQUIRED' },
      { name: 'email', type: 'STRING', mode: 'REQUIRED' },
      { name: 'password', type: 'STRING', mode: 'REQUIRED' },
      { name: 'createdAt', type: 'TIMESTAMP', mode: 'REQUIRED' },
    ];

    await dataset.createTable(tableId, { schema });
    console.log(`Table ${tableId} created with new schema.`);

    // Migrate data from users.json.migrated
    const usersFilePath = path.join(__dirname, 'users.json.migrated');
    if (fs.existsSync(usersFilePath)) {
      console.log('Found users.json.migrated, attempting migration...');
      const data = fs.readFileSync(usersFilePath, 'utf8');
      let users = JSON.parse(data);

      if (users.length > 0) {
        // Add random UUID to existing users
        users = users.map(u => ({
          userId: crypto.randomUUID(),
          companyName: u.companyName,
          email: u.email,
          password: u.password,
          createdAt: new Date(u.createdAt)
        }));

        try {
          await table.insert(users);
          console.log(`Successfully migrated ${users.length} users with new UUIDs into BigQuery.`);
        } catch (insertError) {
          if (insertError.name === 'PartialFailureError') {
             console.error('Partial failure during insert:', JSON.stringify(insertError.errors, null, 2));
          } else {
             console.error('Failed to insert rows:', insertError);
          }
        }
      } else {
        console.log('users.json.migrated is empty, no data to migrate.');
      }
    } else {
      console.log('users.json.migrated not found, skipping migration.');
    }

    console.log('BigQuery recreation complete!');
  } catch (error) {
    console.error('Error during recreation:', error);
  }
}

recreateTableAndBackfill();
