const { BigQuery } = require('@google-cloud/bigquery');

const projectId = 'avocast';
const datasetId = 'avocast_data';
const tableId = 'survey_forms';

const bigquery = new BigQuery({ projectId });

async function updateSchema() {
  try {
    const query = `ALTER TABLE \`${datasetId}.${tableId}\` ADD COLUMN IF NOT EXISTS label1 STRING, ADD COLUMN IF NOT EXISTS label2 STRING, ADD COLUMN IF NOT EXISTS label3 STRING, ADD COLUMN IF NOT EXISTS label4 STRING, ADD COLUMN IF NOT EXISTS label5 STRING`;
    const options = {
      query: query,
    };
    await bigquery.query(options);
    console.log(`Successfully added label columns to ${tableId}`);
  } catch (error) {
    console.error('Error updating schema:', error);
  }
}

updateSchema();
