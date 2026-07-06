const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { BigQuery } = require('@google-cloud/bigquery');

const app = express();
const port = process.env.PORT || 8080;

const bigquery = new BigQuery({ projectId: 'avocast' });
const datasetId = 'avocast_data';
const tableId = 'users';

app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/identify', async (req, res) => {
  const { companyName, email, password } = req.body;
  
  if (!companyName || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Check if user exists
    const query = `SELECT userId, password, logoBase64 FROM \`${datasetId}.${tableId}\` WHERE email = @email AND companyName = @companyName LIMIT 1`;
    const options = {
      query: query,
      params: { email, companyName },
    };

    const [rows] = await bigquery.query(options);

    if (rows.length > 0) {
      const existingUser = rows[0];
      if (existingUser.password === password) {
        return res.status(200).json({ message: 'Login successful', userId: existingUser.userId, logoBase64: existingUser.logoBase64 });
      } else {
        return res.status(401).json({ error: 'Invalid password' });
      }
    }

    // User does not exist, insert them
    const newUser = {
      userId: crypto.randomUUID(),
      companyName,
      email,
      password, // Warning: Storing plain text password for prototype
      createdAt: new Date()
    };

    const insertQuery = `INSERT INTO \`${datasetId}.${tableId}\` (userId, companyName, email, password, createdAt) VALUES (@userId, @companyName, @email, @password, CURRENT_TIMESTAMP())`;
    const insertOptions = {
      query: insertQuery,
      params: {
        userId: newUser.userId,
        companyName: newUser.companyName,
        email: newUser.email,
        password: newUser.password
      }
    };
    await bigquery.query(insertOptions);
    res.status(201).json({ message: 'User identified and saved successfully', userId: newUser.userId });

  } catch (error) {
    console.error('Error interacting with BigQuery:', error);
    res.status(500).json({ error: 'Failed to process user data' });
  }
});

app.post('/api/surveys', async (req, res) => {
  const { userId, title, question, label1, label2, label3, label4, label5 } = req.body;
  if (!userId || !title || !question) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const newSurvey = {
    formId: crypto.randomUUID(),
    userId,
    title,
    question,
    label1: label1 || 'Poor',
    label2: label2 || 'Needs improvement',
    label3: label3 || 'OK',
    label4: label4 || 'Good',
    label5: label5 || 'Excellent',
    createdAt: new Date()
  };

  try {
    const query = `INSERT INTO \`${datasetId}.survey_forms\` (formId, userId, title, question, label1, label2, label3, label4, label5, createdAt) VALUES (@formId, @userId, @title, @question, @label1, @label2, @label3, @label4, @label5, CURRENT_TIMESTAMP())`;
    const options = {
      query: query,
      params: { 
        formId: newSurvey.formId, 
        userId: newSurvey.userId, 
        title: newSurvey.title, 
        question: newSurvey.question, 
        label1: newSurvey.label1,
        label2: newSurvey.label2,
        label3: newSurvey.label3,
        label4: newSurvey.label4,
        label5: newSurvey.label5 
      },
    };
    await bigquery.query(options);
    res.status(201).json({ message: 'Survey created successfully', survey: newSurvey });
  } catch (error) {
    console.error('Error creating survey:', error);
    res.status(500).json({ error: 'Failed to create survey' });
  }
});

app.get('/api/surveys/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const query = `SELECT * FROM \`${datasetId}.survey_forms\` WHERE userId = @userId ORDER BY createdAt DESC`;
    const options = {
      query: query,
      params: { userId },
    };

    const [rows] = await bigquery.query(options);
    res.status(200).json({ surveys: rows });
  } catch (error) {
    console.error('Error fetching surveys:', error);
    res.status(500).json({ error: 'Failed to fetch surveys' });
  }
});

app.put('/api/surveys/:formId', async (req, res) => {
  const { formId } = req.params;
  const { userId, title, question, label1, label2, label3, label4, label5 } = req.body;

  if (!userId || !title || !question) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const query = `UPDATE \`${datasetId}.survey_forms\` SET title = @title, question = @question, label1 = @label1, label2 = @label2, label3 = @label3, label4 = @label4, label5 = @label5 WHERE formId = @formId AND userId = @userId`;
    const options = {
      query: query,
      params: { 
        title, 
        question, 
        label1: label1 || 'Poor', 
        label2: label2 || 'Needs improvement',
        label3: label3 || 'OK',
        label4: label4 || 'Good',
        label5: label5 || 'Excellent', 
        formId, 
        userId 
      },
    };
    await bigquery.query(options);
    res.status(200).json({ message: 'Survey updated successfully' });
  } catch (error) {
    console.error('Error updating survey:', error);
    res.status(500).json({ error: 'Failed to update survey' });
  }
});

app.delete('/api/surveys/:formId', async (req, res) => {
  const { formId } = req.params;
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    const query = `DELETE FROM \`${datasetId}.survey_forms\` WHERE formId = @formId AND userId = @userId`;
    const options = {
      query: query,
      params: { formId, userId },
    };
    await bigquery.query(options);
    res.status(200).json({ message: 'Survey deleted successfully' });
  } catch (error) {
    console.error('Error deleting survey:', error);
    res.status(500).json({ error: 'Failed to delete survey' });
  }
});

app.post('/api/user/logo', async (req, res) => {
  const { userId, logoBase64 } = req.body;
  if (!userId || !logoBase64) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const query = `UPDATE \`${datasetId}.${tableId}\` SET logoBase64 = @logoBase64 WHERE userId = @userId`;
    const options = {
      query: query,
      params: { logoBase64, userId },
    };
    await bigquery.query(options);
    res.status(200).json({ message: 'Logo uploaded successfully' });
  } catch (error) {
    console.error('Error updating logo:', error);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

app.get('/api/user/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const query = `SELECT companyName, email, logoBase64 FROM \`${datasetId}.${tableId}\` WHERE userId = @userId LIMIT 1`;
    const options = {
      query: query,
      params: { userId },
    };
    const [rows] = await bigquery.query(options);
    if (rows.length > 0) {
      res.status(200).json({ user: rows[0] });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

app.get('/api/feedback/submit', async (req, res) => {
  const { formId, userId, rating } = req.query;

  if (!formId || !userId || !rating) {
    return res.status(400).send('Missing required feedback parameters');
  }

  const ratingInt = parseInt(rating, 10);
  if (isNaN(ratingInt) || ratingInt < 1 || ratingInt > 5) {
    return res.status(400).send('Invalid rating value');
  }

  const feedbackId = crypto.randomUUID();

  try {
    const query = `INSERT INTO \`${datasetId}.survey_feedback\` (feedbackId, formId, userId, rating, createdAt) VALUES (@feedbackId, @formId, @userId, @rating, CURRENT_TIMESTAMP())`;
    const options = {
      query: query,
      params: {
        feedbackId,
        formId,
        userId,
        rating: ratingInt
      }
    };
    await bigquery.query(options);
    res.redirect(`/thankyou.html?userId=${encodeURIComponent(userId)}`);
  } catch (error) {
    console.error('Error logging feedback:', error);
    res.status(500).send('Failed to process feedback');
  }
});

app.get('/api/reports/:formId', async (req, res) => {
  const { formId } = req.params;
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId query parameter' });
  }

  try {
    const verifyQuery = `SELECT userId, title, question, label1, label2, label3, label4, label5 FROM \`${datasetId}.survey_forms\` WHERE formId = @formId LIMIT 1`;
    const verifyOptions = {
      query: verifyQuery,
      params: { formId }
    };
    const [verifyRows] = await bigquery.query(verifyOptions);
    
    if (verifyRows.length === 0) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    
    const survey = verifyRows[0];
    if (survey.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized access to survey report' });
    }

    const query = `SELECT rating, COUNT(*) as count FROM \`${datasetId}.survey_feedback\` WHERE formId = @formId GROUP BY rating ORDER BY rating`;
    const options = {
      query: query,
      params: { formId },
    };
    const [rows] = await bigquery.query(options);

    res.status(200).json({ survey, report: rows });
  } catch (error) {
    console.error('Error fetching survey report:', error);
    res.status(500).json({ error: 'Failed to fetch survey report' });
  }
});

app.listen(port, () => {
  console.log(`Avocast.eu app listening on port ${port}`);
});
