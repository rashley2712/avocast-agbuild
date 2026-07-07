# Avocast

Avocast is a clean, modern survey and feedback management web application designed to help companies understand their customers. It provides tools for creating rating surveys, displaying live feedback reports, generating QR codes for customer scanning, and customizing company branding.

Designed as a prototype ready for deployment to **Google Cloud Run** with **Google BigQuery** as the data store.

---

## Features

- **Company Profile Branding**: Log in/register with a company profile and upload a custom company logo (stored and fetched dynamically).
- **Survey Creator**: Build surveys using a 5-point scale with fully customizable titles, questions, and scale labels (e.g., Poor, Good, Excellent).
- **QR Code Scanning**: Generates distinct QR codes for each rating level. Customers can scan a specific QR code (e.g., posted on tables, receipts, or signs) to automatically register their score.
- **Privacy-focused Thank You Page**: Displays a beautiful confirmation page post-scan with clean SVG checkmark animations and a transparent logging notice.
- **Reports Dashboard**: Inspect aggregate feedback data, response count, average ratings, and percentage distribution bars per question.
- **Landscape Print layout**: Print surveys to PDF in professional landscape mode optimized for one page, suitable for printing QR code signs.

---

## Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: Vanilla HTML5, CSS3 (Glassmorphism & animations), Javascript (Client-side REST APIs)
- **Database**: Google BigQuery
- **Deployment**: Google Cloud Run / Docker

---

## Project Structure

```text
├── public/                 # Static frontend assets
│   ├── assets/             # Icons and images
│   ├── index.html          # Main company dashboard
│   ├── index.css           # Styling (including layout, themes, print queries)
│   ├── index.js            # Client-side routing and UI logic
│   └── thankyou.html       # Customer-facing feedback confirmation
├── Dockerfile              # Docker container configuration
├── server.js               # Node.js/Express API server
├── setup-bq.js             # Utility to initialize BigQuery tables
├── deployme.bash           # Script to deploy the application to Cloud Run
└── package.json            # Node.js dependencies and script definitions
```

---

## Getting Started

### Prerequisites

- Node.js (v20+ recommended)
- Google Cloud SDK (`gcloud` CLI) configured with a valid project containing a BigQuery dataset.

### Setup BigQuery Tables

Ensure you run the database setup scripts to initialize the required tables (`users`, `survey_forms`, `survey_feedback`):

```bash
node setup-bq.js
node setup-surveys-bq.js
node setup-feedback-bq.js
```

### Local Development

1. Install the dependencies:
   ```bash
   npm install
   ```

2. Start the Express server:
   ```bash
   npm start
   ```

3. Open your browser and navigate to `http://localhost:8080`.

---

## Deployment

Deploy directly to Google Cloud Run using the deployment script:

```bash
chmod +x deployme.bash
./deployme.bash
```
