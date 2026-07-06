const { BigQuery } = require('@google-cloud/bigquery');

const projectId = 'avocast';
const datasetId = 'avocast_data';
const tableId = 'survey_forms';

const bigquery = new BigQuery({ projectId });

async function createSurveysTable() {
  try {
    const dataset = bigquery.dataset(datasetId);
    console.log(`Checking for table ${tableId}...`);
    
    const table = dataset.table(tableId);
    const [tableExists] = await table.exists();

    if (!tableExists) {
      console.log(`Creating table ${tableId}...`);
      const schema = [
        { name: 'formId', type: 'STRING', mode: 'REQUIRED' },
        { name: 'userId', type: 'STRING', mode: 'REQUIRED' },
        { name: 'title', type: 'STRING', mode: 'REQUIRED' },
        { name: 'question', type: 'STRING', mode: 'REQUIRED' },
        { name: 'createdAt', type: 'TIMESTAMP', mode: 'REQUIRED' },
      ];

      await dataset.createTable(tableId, { schema });
      console.log(`Table ${tableId} created successfully.`);
    } else {
      console.log(`Table ${tableId} already exists.`);
    }
  } catch (error) {
    console.error('Error creating surveys table:', error);
  }
}

createSurveysTable();
