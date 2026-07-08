const { BigQuery } = require('@google-cloud/bigquery');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const projectId = 'avocast';
const datasetId = 'avocast_data';
const bigquery = new BigQuery({ projectId });

// Hourly distribution weights for coffee shop (7 AM to 9 PM, hours 7-20)
const weekdayHourWeights = {
  7: 5, 8: 15, 9: 15, 10: 8, 11: 7, 12: 12, 13: 10, 14: 6, 15: 7, 16: 6, 17: 4, 18: 2, 19: 2, 20: 1
};

const weekendHourWeights = {
  7: 2, 8: 6, 9: 12, 10: 15, 11: 15, 12: 12, 13: 10, 14: 8, 15: 8, 16: 6, 17: 3, 18: 1, 19: 1, 20: 1
};

// Weighted rating generator (skewed towards 4)
function getSkewedRating() {
  const r = Math.random();
  if (r < 0.05) return 1;       // 5% Poor
  if (r < 0.15) return 2;       // 10% Needs improvement
  if (r < 0.30) return 3;       // 15% OK
  if (r < 0.80) return 4;       // 50% Good
  return 5;                    // 20% Excellent
}

// Sample hour based on weights
function sampleHour(isWeekend) {
  const weights = isWeekend ? weekendHourWeights : weekdayHourWeights;
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [hourStr, w] of Object.entries(weights)) {
    const hour = parseInt(hourStr, 10);
    r -= w;
    if (r <= 0) return hour;
  }
  return 20; // fallback
}

async function runSeed() {
  try {
    console.log('Starting fake data seed script...');

    // 1. Convert logo image to base64 data URL
    const logoPath = path.join(__dirname, 'testsurvey_logo_small.png');
    console.log(`Reading logo from ${logoPath}...`);
    const logoBuffer = fs.readFileSync(logoPath);
    const logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    console.log('Logo converted to base64 successfully.');

    const dataset = bigquery.dataset(datasetId);

    // 2. Check/create company (User)
    const companyName = 'TestSurvey';
    const email = 'rashley+test@gmail.com';
    const password = 'test';
    let userId;

    console.log(`Checking if user ${email} exists...`);
    const userQuery = `SELECT userId FROM \`${datasetId}.users\` WHERE email = @email AND companyName = @companyName LIMIT 1`;
    const [userRows] = await bigquery.query({
      query: userQuery,
      params: { email, companyName }
    });

    const usersTable = dataset.table('users');

    if (userRows.length > 0) {
      userId = userRows[0].userId;
      console.log(`User exists with userId: ${userId}. Updating logo...`);
      const updateLogoQuery = `UPDATE \`${datasetId}.users\` SET logoBase64 = @logoBase64 WHERE userId = @userId`;
      await bigquery.query({
        query: updateLogoQuery,
        params: { logoBase64, userId }
      });
      console.log('Logo updated.');
    } else {
      userId = crypto.randomUUID();
      console.log(`Creating new user with userId: ${userId}...`);
      const newUser = {
        userId,
        companyName,
        email,
        password,
        createdAt: new Date(),
        logoBase64
      };
      await usersTable.insert([newUser]);
      console.log('User created successfully.');
    }

    // 3. Check/create survey form
    const surveyTitle = 'How did you rate the quality of our service';
    const surveyQuestion = 'How did you rate the quality of our service';
    let formId;

    console.log(`Checking if survey "${surveyTitle}" exists for user ${userId}...`);
    const surveyQuery = `SELECT formId FROM \`${datasetId}.survey_forms\` WHERE userId = @userId AND title = @title LIMIT 1`;
    const [surveyRows] = await bigquery.query({
      query: surveyQuery,
      params: { userId, title: surveyTitle }
    });

    const formsTable = dataset.table('survey_forms');

    if (surveyRows.length > 0) {
      formId = surveyRows[0].formId;
      console.log(`Survey form exists with formId: ${formId}`);
    } else {
      formId = crypto.randomUUID();
      console.log(`Creating new survey with formId: ${formId}...`);
      const newSurvey = {
        formId,
        userId,
        title: surveyTitle,
        question: surveyQuestion,
        createdAt: new Date(),
        label1: 'Poor',
        label2: 'Needs improvement',
        label3: 'OK',
        label4: 'Good',
        label5: 'Excellent'
      };
      await formsTable.insert([newSurvey]);
      console.log('Survey created successfully.');
    }

    // 4. Delete existing feedback responses for this survey to keep it clean and idempotent
    console.log(`Cleaning up existing feedback ratings for formId: ${formId}...`);
    const deleteFeedbackQuery = `DELETE FROM \`${datasetId}.survey_feedback\` WHERE formId = @formId`;
    await bigquery.query({
      query: deleteFeedbackQuery,
      params: { formId }
    });
    console.log('Feedback table cleaned up.');

    // 5. Generate 3000 ratings distributed over the last month (June 8, 2026 to July 7, 2026)
    const startDate = new Date('2026-06-08T00:00:00+02:00');
    const endDate = new Date('2026-07-07T23:59:59+02:00');

    // Generate list of days
    const days = [];
    let currentDay = new Date(startDate);
    while (currentDay <= endDate) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }

    // Determine weight for each day: weekday = 1.0, weekend = 2.5
    const dayWeights = days.map(day => {
      const dayOfWeek = day.getDay();
      const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
      return {
        day,
        isWeekend,
        weight: isWeekend ? 2.5 : 1.0
      };
    });

    const totalWeight = dayWeights.reduce((sum, dw) => sum + dw.weight, 0);

    // Allocate ratings per day
    const ratingsPerDay = dayWeights.map(dw => {
      const count = Math.round((dw.weight / totalWeight) * 3000);
      return {
        ...dw,
        count
      };
    });

    // Adjust to exactly 3000 total ratings
    const currentTotal = ratingsPerDay.reduce((sum, r) => sum + r.count, 0);
    const diff = 3000 - currentTotal;
    if (diff !== 0) {
      ratingsPerDay[ratingsPerDay.length - 1].count += diff;
    }

    console.log(`Generating a total of ${ratingsPerDay.reduce((sum, r) => sum + r.count, 0)} feedback responses...`);

    const feedbackRows = [];
    const pad = (n) => String(n).padStart(2, '0');
    const padMs = (n) => String(n).padStart(3, '0');

    for (const rpd of ratingsPerDay) {
      const year = rpd.day.getFullYear();
      const month = rpd.day.getMonth() + 1;
      const dateVal = rpd.day.getDate();

      for (let i = 0; i < rpd.count; i++) {
        const hour = sampleHour(rpd.isWeekend);
        const minute = Math.floor(Math.random() * 60);
        const second = Math.floor(Math.random() * 60);
        const ms = Math.floor(Math.random() * 1000);

        const isoString = `${year}-${pad(month)}-${pad(dateVal)}T${pad(hour)}:${pad(minute)}:${pad(second)}.${padMs(ms)}+02:00`;
        const createdAt = new Date(isoString);

        feedbackRows.push({
          feedbackId: crypto.randomUUID(),
          formId,
          userId,
          rating: getSkewedRating(),
          createdAt
        });
      }
    }

    // Insert feedback rows in batches of 1000
    const feedbackTable = dataset.table('survey_feedback');
    const batchSize = 1000;
    console.log(`Inserting feedback rows in batches of ${batchSize}...`);

    for (let i = 0; i < feedbackRows.length; i += batchSize) {
      const batch = feedbackRows.slice(i, i + batchSize);
      console.log(`Inserting batch ${i / batchSize + 1} (${batch.length} rows)...`);
      await feedbackTable.insert(batch);
    }

    console.log('Fake data seeding completed successfully!');
    console.log(`Summary:`);
    console.log(`- Company: ${companyName}`);
    console.log(`- User ID: ${userId}`);
    console.log(`- Survey Title: "${surveyTitle}"`);
    console.log(`- Survey Form ID: ${formId}`);
    console.log(`- Generated feedback count: ${feedbackRows.length}`);

  } catch (error) {
    console.error('Error during data seeding:', error);
    if (error.name === 'PartialFailureError') {
      console.error('Partial failure details:', JSON.stringify(error.errors, null, 2));
    }
    process.exit(1);
  }
}

runSeed();
