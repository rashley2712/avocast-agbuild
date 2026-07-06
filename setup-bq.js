const { BigQuery } = require('@google-cloud/bigquery');
const fs = require('fs');
const path = require('path');

const projectId = 'avocast';
const datasetId = 'avocast_data';
const tableId = 'users';

const bigquery = new BigQuery({ projectId });

async function setupBigQuery() {
  try {
    console.log(`Checking for dataset ${datasetId}...`);
    const dataset = bigquery.dataset(datasetId);
    const [datasetExists] = await dataset.exists();

    if (!datasetExists) {
      console.log(`Creating dataset ${datasetId}...`);
      await bigquery.createDataset(datasetId);
      console.log(`Dataset ${datasetId} created.`);
    } else {
      console.log(`Dataset ${datasetId} already exists.`);
    }

    console.log(`Checking for table ${tableId}...`);
    const table = dataset.table(tableId);
    const [tableExists] = await table.exists();

    if (!tableExists) {
      console.log(`Creating table ${tableId}...`);
      const schema = [
        { name: 'companyName', type: 'STRING', mode: 'REQUIRED' },
        { name: 'email', type: 'STRING', mode: 'REQUIRED' },
        { name: 'password', type: 'STRING', mode: 'REQUIRED' },
        { name: 'createdAt', type: 'TIMESTAMP', mode: 'REQUIRED' },
      ];

      await dataset.createTable(tableId, { schema });
      console.log(`Table ${tableId} created.`);
    } else {
      console.log(`Table ${tableId} already exists.`);
    }

    // Migrate data from users.json
    const usersFilePath = path.join(__dirname, 'users.json');
    if (fs.existsSync(usersFilePath)) {
      console.log('Found users.json, attempting migration...');
      const data = fs.readFileSync(usersFilePath, 'utf8');
      const users = JSON.parse(data);

      if (users.length > 0) {
        try {
          await table.insert(users);
          console.log(`Successfully migrated ${users.length} users into BigQuery.`);
          
          // Rename users.json to indicate it was migrated
          fs.renameSync(usersFilePath, `${usersFilePath}.migrated`);
          console.log('Renamed users.json to users.json.migrated');
        } catch (insertError) {
          if (insertError.name === 'PartialFailureError') {
             console.error('Partial failure during insert:', JSON.stringify(insertError.errors, null, 2));
          } else {
             console.error('Failed to insert rows:', insertError);
          }
        }
      } else {
        console.log('users.json is empty, no data to migrate.');
      }
    } else {
      console.log('users.json not found, skipping migration.');
    }

    console.log('BigQuery setup complete!');
  } catch (error) {
    console.error('Error during setup:', error);
  }
}

setupBigQuery();
