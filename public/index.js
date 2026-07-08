document.addEventListener('DOMContentLoaded', () => {
  const loginSection = document.getElementById('loginSection');
  const welcomeSection = document.getElementById('welcomeSection');
  const welcomeMessage = document.getElementById('welcomeMessage');
  const authForm = document.getElementById('authForm');
  const logoutBtn = document.getElementById('logoutBtn');
  
  const createSurveyForm = document.getElementById('createSurveyForm');
  const surveyList = document.getElementById('surveyList');

  const editSurveyModal = document.getElementById('editSurveyModal');
  const editSurveyForm = document.getElementById('editSurveyForm');
  const cancelEditBtn = document.getElementById('cancelEditBtn');

  const logoUpload = document.getElementById('logoUpload');
  const logoPreview = document.getElementById('logoPreview');

  const printPreviewModal = document.getElementById('printPreviewModal');
  const previewContainer = document.getElementById('previewContainer');
  const printArea = document.getElementById('printArea');
  const cancelPrintBtn = document.getElementById('cancelPrintBtn');
  const confirmPrintBtn = document.getElementById('confirmPrintBtn');

  const reportList = document.getElementById('reportList');
  const surveyReportModal = document.getElementById('surveyReportModal');
  const closeReportBtn = document.getElementById('closeReportBtn');
  
  const tabOverall = document.getElementById('tabOverall');
  const tabHourly = document.getElementById('tabHourly');
  const tabHistogram = document.getElementById('tabHistogram');
  const overallReportView = document.getElementById('overallReportView');
  const hourlyReportView = document.getElementById('hourlyReportView');
  const histogramReportView = document.getElementById('histogramReportView');
  const histogramContainer = document.getElementById('histogramContainer');

  // Check localStorage for existing user
  const storedUser = localStorage.getItem('avocastUser');
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      showWelcome(user.companyName, user.userId);
      fetchUserProfile(user.userId);
    } catch (e) {
      console.error('Error parsing stored user', e);
      localStorage.removeItem('avocastUser');
    }
  }

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const companyName = document.getElementById('companyName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const userData = { companyName, email, password };

    try {
      const response = await fetch('/api/identify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (response.ok) {
        const data = await response.json();
        userData.userId = data.userId;
        if (data.logoBase64) {
          userData.logoBase64 = data.logoBase64;
        }
        localStorage.setItem('avocastUser', JSON.stringify(userData));
        showWelcome(companyName, data.userId);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to identify user on the server:', errorData);
        alert(errorData.error || 'An error occurred during identification.');
      }
    } catch (error) {
      console.error('Network error', error);
      alert('Network error during identification.');
    }
  });

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('avocastUser');
    authForm.reset();
    loginSection.style.display = 'block';
    welcomeSection.style.display = 'none';
    
    // Clear user-specific DOM states
    logoPreview.innerHTML = `<span style="font-size: 0.7rem; color: var(--text-secondary); text-align: center;">No Logo</span>`;
    surveyList.innerHTML = '';
    reportList.innerHTML = '';
    welcomeMessage.textContent = 'Welcome back.';
  });

  createSurveyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('surveyTitle').value;
    const question = document.getElementById('surveyQuestion').value;
    const label1 = document.getElementById('surveyLabel1').value;
    const label2 = document.getElementById('surveyLabel2').value;
    const label3 = document.getElementById('surveyLabel3').value;
    const label4 = document.getElementById('surveyLabel4').value;
    const label5 = document.getElementById('surveyLabel5').value;
    const user = JSON.parse(localStorage.getItem('avocastUser'));

    if (!user || !user.userId) return;

    try {
      const response = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.userId, title, question, label1, label2, label3, label4, label5 })
      });

      if (response.ok) {
        createSurveyForm.reset();
        loadSurveys(user.userId);
      } else {
        alert('Failed to create survey');
      }
    } catch (error) {
      console.error('Network error', error);
      alert('Network error creating survey');
    }
  });

  function showWelcome(companyName, userId) {
    welcomeMessage.textContent = `Welcome back, ${companyName}.`;
    loginSection.style.display = 'none';
    welcomeSection.style.display = 'block';
    
    const user = JSON.parse(localStorage.getItem('avocastUser'));
    if (user && user.logoBase64) {
      logoPreview.innerHTML = `<img src="${user.logoBase64}" style="width: 100%; height: 100%; object-fit: contain;" />`;
    } else {
      logoPreview.innerHTML = `<span style="font-size: 0.7rem; color: var(--text-secondary); text-align: center;">No Logo</span>`;
    }

    if (userId) {
      loadSurveys(userId);
    }
  }

  async function fetchUserProfile(userId) {
    try {
      const response = await fetch(`/api/user/${userId}`);
      if (response.ok) {
        const data = await response.json();
        const user = JSON.parse(localStorage.getItem('avocastUser')) || {};
        if (data.user) {
          user.companyName = data.user.companyName;
          user.logoBase64 = data.user.logoBase64;
          localStorage.setItem('avocastUser', JSON.stringify(user));
          
          if (data.user.logoBase64) {
            logoPreview.innerHTML = `<img src="${data.user.logoBase64}" style="width: 100%; height: 100%; object-fit: contain;" />`;
          } else {
            logoPreview.innerHTML = `<span style="font-size: 0.7rem; color: var(--text-secondary); text-align: center;">No Logo</span>`;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }

  logoUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert('File size must be under 1MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Str = event.target.result;
      logoPreview.innerHTML = `<img src="${base64Str}" style="width: 100%; height: 100%; object-fit: contain;" />`;

      const user = JSON.parse(localStorage.getItem('avocastUser'));
      if (!user || !user.userId) return;

      try {
        const response = await fetch('/api/user/logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.userId, logoBase64: base64Str })
        });

        if (response.ok) {
          user.logoBase64 = base64Str;
          localStorage.setItem('avocastUser', JSON.stringify(user));
        } else {
          alert('Failed to upload logo to server.');
        }
      } catch (error) {
        console.error('Network error', error);
        alert('Network error uploading logo.');
      }
    };
    reader.readAsDataURL(file);
  });

  async function loadSurveys(userId) {
    surveyList.innerHTML = '<p>Loading surveys...</p>';
    reportList.innerHTML = '<p>Loading reports...</p>';
    try {
      const response = await fetch(`/api/surveys/${userId}`);
      if (response.ok) {
        const data = await response.json();
        renderSurveys(data.surveys);
        renderReports(data.surveys);
      } else {
        surveyList.innerHTML = '<p>Failed to load surveys.</p>';
        reportList.innerHTML = '<p>Failed to load reports.</p>';
      }
    } catch (error) {
      console.error('Error loading surveys', error);
      surveyList.innerHTML = '<p>Network error loading surveys.</p>';
      reportList.innerHTML = '<p>Network error loading reports.</p>';
    }
  }

  function renderSurveys(surveys) {
    if (!surveys || surveys.length === 0) {
      surveyList.innerHTML = '<p>You have not created any surveys yet.</p>';
      return;
    }

    surveyList.innerHTML = '';
    surveys.forEach(survey => {
      const div = document.createElement('div');
      div.className = 'survey-item';
      div.innerHTML = `
        <div class="survey-item-header">
          <h4>${survey.title}</h4>
          <div style="display: flex; gap: 0.5rem;">
            <button class="edit-btn" data-id="${survey.formId}">Edit</button>
            <button class="publish-btn edit-btn" style="border-color: var(--success-color); color: var(--success-color);" data-id="${survey.formId}">Publish</button>
            <button class="delete-btn edit-btn" style="border-color: #ef4444; color: #ef4444;" data-id="${survey.formId}">Delete</button>
          </div>
        </div>
        <p>${survey.question}</p>
        <div class="survey-scale">
          <div class="scale-item">
            <div class="scale-icon">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M8 15c1.5-1.5 6.5-1.5 8 0"></path><line x1="9" y1="10" x2="9.01" y2="10"></line><line x1="15" y1="10" x2="15.01" y2="10"></line><path d="M7 8l2.5 1.5"></path><path d="M17 8l-2.5 1.5"></path></svg>
            </div>
            <div class="scale-label">${survey.label1 || 'Poor'}</div>
          </div>
          <div class="scale-item">
            <div class="scale-icon">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M8 15c1.5-1.5 6.5-1.5 8 0"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
            </div>
            <div class="scale-label">${survey.label2 || 'Needs improvement'}</div>
          </div>
          <div class="scale-item">
            <div class="scale-icon">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="15" x2="16" y2="15"></line><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
            </div>
            <div class="scale-label">${survey.label3 || 'OK'}</div>
          </div>
          <div class="scale-item">
            <div class="scale-icon">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M8 14c1.5 1.5 6.5 1.5 8 0"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
            </div>
            <div class="scale-label">${survey.label4 || 'Good'}</div>
          </div>
          <div class="scale-item">
            <div class="scale-icon">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M8 14c1.5 2.5 6.5 2.5 8 0"></path><path d="M8 9c.5-.5 1.5-.5 2 0"></path><path d="M14 9c.5-.5 1.5-.5 2 0"></path></svg>
            </div>
            <div class="scale-label">${survey.label5 || 'Excellent'}</div>
          </div>
        </div>
      `;
      surveyList.appendChild(div);

      const editBtn = div.querySelector('.edit-btn');
      editBtn.addEventListener('click', () => {
        document.getElementById('editFormId').value = survey.formId;
        document.getElementById('editSurveyTitle').value = survey.title;
        document.getElementById('editSurveyQuestion').value = survey.question;
        document.getElementById('editSurveyLabel1').value = survey.label1 || 'Poor';
        document.getElementById('editSurveyLabel2').value = survey.label2 || 'Needs improvement';
        document.getElementById('editSurveyLabel3').value = survey.label3 || 'OK';
        document.getElementById('editSurveyLabel4').value = survey.label4 || 'Good';
        document.getElementById('editSurveyLabel5').value = survey.label5 || 'Excellent';
        editSurveyModal.style.display = 'flex';
      });

      const publishBtn = div.querySelector('.publish-btn');
      publishBtn.addEventListener('click', () => {
        const user = JSON.parse(localStorage.getItem('avocastUser'));
        const logoHtml = (user && user.logoBase64) 
          ? `<img src="${user.logoBase64}" class="print-logo" style="max-height: 100px; margin-bottom: 2rem;" />` 
          : `<div class="logo-placeholder">Your Company Logo</div>`;

        const origin = window.location.origin;
        const qrUrl1 = `${origin}/api/feedback/submit?formId=${survey.formId}&userId=${survey.userId}&rating=1`;
        const qrUrl2 = `${origin}/api/feedback/submit?formId=${survey.formId}&userId=${survey.userId}&rating=2`;
        const qrUrl3 = `${origin}/api/feedback/submit?formId=${survey.formId}&userId=${survey.userId}&rating=3`;
        const qrUrl4 = `${origin}/api/feedback/submit?formId=${survey.formId}&userId=${survey.userId}&rating=4`;
        const qrUrl5 = `${origin}/api/feedback/submit?formId=${survey.formId}&userId=${survey.userId}&rating=5`;

        const surveyHtml = `
          <div class="print-survey">
            ${logoHtml}
            <h1 class="print-title">${survey.title}</h1>
            <h2 class="print-question">${survey.question}</h2>
            <div class="survey-scale print-scale">
              <div class="scale-item">
                <div class="scale-icon">
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M8 15c1.5-1.5 6.5-1.5 8 0"></path><line x1="9" y1="10" x2="9.01" y2="10"></line><line x1="15" y1="10" x2="15.01" y2="10"></line><path d="M7 8l2.5 1.5"></path><path d="M17 8l-2.5 1.5"></path></svg>
                </div>
                <div class="scale-label">${survey.label1 || 'Poor'}</div>
                <div class="qr-container">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrUrl1)}" class="qr-code" alt="Scan to rate 1" />
                </div>
              </div>
              <div class="scale-item">
                <div class="scale-icon">
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M8 15c1.5-1.5 6.5-1.5 8 0"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
                </div>
                <div class="scale-label">${survey.label2 || 'Needs improvement'}</div>
                <div class="qr-container">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrUrl2)}" class="qr-code" alt="Scan to rate 2" />
                </div>
              </div>
              <div class="scale-item">
                <div class="scale-icon">
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="15" x2="16" y2="15"></line><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
                </div>
                <div class="scale-label">${survey.label3 || 'OK'}</div>
                <div class="qr-container">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrUrl3)}" class="qr-code" alt="Scan to rate 3" />
                </div>
              </div>
              <div class="scale-item">
                <div class="scale-icon">
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M8 14c1.5 1.5 6.5 1.5 8 0"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
                </div>
                <div class="scale-label">${survey.label4 || 'Good'}</div>
                <div class="qr-container">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrUrl4)}" class="qr-code" alt="Scan to rate 4" />
                </div>
              </div>
              <div class="scale-item">
                <div class="scale-icon">
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M8 14c1.5 2.5 6.5 2.5 8 0"></path><path d="M8 9c.5-.5 1.5-.5 2 0"></path><path d="M14 9c.5-.5 1.5-.5 2 0"></path></svg>
                </div>
                <div class="scale-label">${survey.label5 || 'Excellent'}</div>
                <div class="qr-container">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrUrl5)}" class="qr-code" alt="Scan to rate 5" />
                </div>
              </div>
            </div>
          </div>
        `;
        previewContainer.innerHTML = surveyHtml;
        printArea.innerHTML = surveyHtml;
        printPreviewModal.style.display = 'flex';
      });

      const deleteBtn = div.querySelector('.delete-btn');
      deleteBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this survey? This action cannot be undone.')) {
          const user = JSON.parse(localStorage.getItem('avocastUser'));
          if (!user || !user.userId) return;

          try {
            const response = await fetch(`/api/surveys/${survey.formId}?userId=${user.userId}`, {
              method: 'DELETE'
            });

            if (response.ok) {
              loadSurveys(user.userId);
            } else {
              alert('Failed to delete survey');
            }
          } catch (error) {
            console.error('Network error', error);
            alert('Network error deleting survey');
          }
        }
      });
    });
  }

  cancelEditBtn.addEventListener('click', () => {
    editSurveyModal.style.display = 'none';
  });

  cancelPrintBtn.addEventListener('click', () => {
    printPreviewModal.style.display = 'none';
  });

  confirmPrintBtn.addEventListener('click', () => {
    window.print();
  });

  editSurveyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formId = document.getElementById('editFormId').value;
    const title = document.getElementById('editSurveyTitle').value;
    const question = document.getElementById('editSurveyQuestion').value;
    const label1 = document.getElementById('editSurveyLabel1').value;
    const label2 = document.getElementById('editSurveyLabel2').value;
    const label3 = document.getElementById('editSurveyLabel3').value;
    const label4 = document.getElementById('editSurveyLabel4').value;
    const label5 = document.getElementById('editSurveyLabel5').value;
    const user = JSON.parse(localStorage.getItem('avocastUser'));

    if (!user || !user.userId || !formId) return;

    try {
      const response = await fetch(`/api/surveys/${formId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.userId, title, question, label1, label2, label3, label4, label5 })
      });

      if (response.ok) {
        editSurveyModal.style.display = 'none';
        loadSurveys(user.userId);
      } else {
        alert('Failed to update survey');
      }
    } catch (error) {
      console.error('Network error', error);
      alert('Network error updating survey');
    }
  });

  closeReportBtn.addEventListener('click', () => {
    surveyReportModal.style.display = 'none';
  });

  tabOverall.addEventListener('click', () => {
    tabOverall.classList.add('active-tab');
    tabHourly.classList.remove('active-tab');
    tabHistogram.classList.remove('active-tab');
    overallReportView.style.display = 'block';
    hourlyReportView.style.display = 'none';
    histogramReportView.style.display = 'none';
  });

  tabHourly.addEventListener('click', () => {
    tabHourly.classList.add('active-tab');
    tabOverall.classList.remove('active-tab');
    tabHistogram.classList.remove('active-tab');
    overallReportView.style.display = 'none';
    hourlyReportView.style.display = 'block';
    histogramReportView.style.display = 'none';
  });

  tabHistogram.addEventListener('click', () => {
    tabHistogram.classList.add('active-tab');
    tabOverall.classList.remove('active-tab');
    tabHourly.classList.remove('active-tab');
    overallReportView.style.display = 'none';
    hourlyReportView.style.display = 'none';
    histogramReportView.style.display = 'block';
  });

  function renderReports(surveys) {
    if (!surveys || surveys.length === 0) {
      reportList.innerHTML = '<p>No surveys available for reporting.</p>';
      return;
    }

    reportList.innerHTML = '';
    surveys.forEach(survey => {
      const div = document.createElement('div');
      div.className = 'survey-item';
      div.innerHTML = `
        <div class="survey-item-header">
          <h4>${survey.title}</h4>
          <button class="view-report-btn auth-btn" style="padding: 0.5rem 1rem; font-size: 0.8rem; margin: 0; width: auto;" data-id="${survey.formId}">View Report</button>
        </div>
        <p>${survey.question}</p>
      `;
      reportList.appendChild(div);

      const viewReportBtn = div.querySelector('.view-report-btn');
      viewReportBtn.addEventListener('click', () => {
        openSurveyReport(survey.formId);
      });
    });
  }

  async function openSurveyReport(formId) {
    const user = JSON.parse(localStorage.getItem('avocastUser'));
    if (!user || !user.userId) return;

    try {
      // Reset active tab view on modal opening
      tabOverall.classList.add('active-tab');
      tabHourly.classList.remove('active-tab');
      tabHistogram.classList.remove('active-tab');
      overallReportView.style.display = 'block';
      hourlyReportView.style.display = 'none';
      histogramReportView.style.display = 'none';

      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const response = await fetch(`/api/reports/${formId}?userId=${user.userId}&tz=${encodeURIComponent(tz)}`);
      if (!response.ok) {
        alert('Failed to fetch survey report.');
        return;
      }

      const data = await response.json();
      const survey = data.survey;
      const report = data.report;

      const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let totalResponses = 0;
      let totalScore = 0;

      report.forEach(item => {
        const rating = parseInt(item.rating, 10);
        const count = parseInt(item.count, 10);
        if (rating >= 1 && rating <= 5) {
          counts[rating] = count;
          totalResponses += count;
          totalScore += rating * count;
        }
      });

      const averageRating = totalResponses > 0 ? (totalScore / totalResponses).toFixed(1) : '0.0';

      document.getElementById('reportTitle').textContent = `Report: ${survey.title}`;
      document.getElementById('reportQuestion').textContent = survey.question;
      document.getElementById('reportTotalResponses').textContent = totalResponses;
      document.getElementById('reportAverageRating').textContent = averageRating;

      const labels = [
        survey.label1 || 'Poor',
        survey.label2 || 'Needs improvement',
        survey.label3 || 'OK',
        survey.label4 || 'Good',
        survey.label5 || 'Excellent'
      ];

      const emojis = ['😢', '🙁', '😐', '🙂', '😁'];
      const barsContainer = document.getElementById('reportBarsContainer');
      barsContainer.innerHTML = '';

      for (let r = 5; r >= 1; r--) {
        const count = counts[r];
        const percentage = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
        
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.flexDirection = 'column';
        row.style.gap = '0.25rem';
        row.innerHTML = `
          <div style="display: flex; justify-content: space-between; font-size: 0.9rem; align-items: center;">
            <span style="font-weight: 500; color: #ffffff;">${emojis[r-1]} ${labels[r-1]}</span>
            <span style="color: var(--text-secondary); font-size: 0.8rem;">${count} votes (${percentage}%)</span>
          </div>
          <div style="height: 10px; width: 100%; background: rgba(255, 255, 255, 0.1); border-radius: 5px; overflow: hidden; border: 1px solid var(--card-border);">
            <div class="progress-bar-fill" style="width: 0%; height: 100%; background: linear-gradient(90deg, var(--accent-color) 0%, var(--success-color) 100%); border-radius: 5px; transition: width 0.8s cubic-bezier(0.1, 0.8, 0.3, 1);"></div>
          </div>
        `;
        barsContainer.appendChild(row);
        
        requestAnimationFrame(() => {
          setTimeout(() => {
            row.querySelector('.progress-bar-fill').style.width = `${percentage}%`;
          }, 50);
        });
      }

      // Process and Render Hourly Report
      const hourlyContainer = document.getElementById('hourlyReportContainer');
      hourlyContainer.innerHTML = '';
      
      const hourlyData = {};
      if (data.hourlyReport) {
        data.hourlyReport.forEach(item => {
          const hr = parseInt(item.hour, 10);
          const rating = parseInt(item.rating, 10);
          const count = parseInt(item.count, 10);
          
          if (!hourlyData[hr]) {
            hourlyData[hr] = {
              hour: hr,
              counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
              totalVotes: 0,
              totalScore: 0
            };
          }
          
          if (rating >= 1 && rating <= 5) {
            hourlyData[hr].counts[rating] = count;
            hourlyData[hr].totalVotes += count;
            hourlyData[hr].totalScore += rating * count;
          }
        });
      }
      
      const sortedHours = Object.values(hourlyData).sort((a, b) => a.hour - b.hour);
      
      if (sortedHours.length === 0) {
        hourlyContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); margin-top: 2rem;">No hourly rating data available.</p>';
      } else {
        const ratingColors = {
          1: '#f87171', // Red
          2: '#fb923c', // Orange
          3: '#facc15', // Yellow
          4: '#a3e635', // Light Green
          5: '#34d399'  // Emerald Green
        };
        
        sortedHours.forEach(hrData => {
          const avgRating = hrData.totalVotes > 0 ? (hrData.totalScore / hrData.totalVotes).toFixed(1) : '0.0';
          const pad = (n) => String(n).padStart(2, '0');
          const hourLabel = `${pad(hrData.hour)}:00 - ${pad((hrData.hour + 1) % 24)}:00`;
          
          const row = document.createElement('div');
          row.className = 'hourly-row';
          
          let headerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem;">
              <span style="font-weight: 700; color: #ffffff;">${hourLabel}</span>
              <div style="display: flex; gap: 0.75rem; align-items: center;">
                <span style="color: var(--text-secondary); font-size: 0.8rem;">${hrData.totalVotes} votes</span>
                <span style="background: rgba(16, 185, 129, 0.15); color: #34d399; padding: 0.15rem 0.5rem; border-radius: 6px; font-weight: 700; font-size: 0.8rem;">★ ${avgRating}</span>
              </div>
            </div>
          `;
          
          let barHTML = `
            <div style="height: 12px; width: 100%; display: flex; border-radius: 6px; overflow: hidden; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.05); margin-top: 0.25rem;">
          `;
          
          for (let r = 1; r <= 5; r++) {
            const count = hrData.counts[r];
            if (count > 0) {
              const pct = ((count / hrData.totalVotes) * 100).toFixed(1);
              const labelText = emojis[r-1] + ' ' + labels[r-1];
              barHTML += `
                <div style="width: ${pct}%; background: ${ratingColors[r]}; height: 100%;" 
                     title="${labelText}: ${count} votes (${pct}%)"></div>
              `;
            }
          }
          
          barHTML += `</div>`;
          row.innerHTML = headerHTML + barHTML;
          hourlyContainer.appendChild(row);
        });
      }

      // Render Average Rating Histogram
      const histogramContainer = document.getElementById('histogramContainer');
      histogramContainer.innerHTML = '';
      
      if (sortedHours.length === 0) {
        histogramContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); margin-top: 2rem;">No hourly rating data available.</p>';
      } else {
        const padHour = (n) => String(n).padStart(2, '0');
        const minHour = sortedHours.reduce((min, h) => h.hour < min ? h.hour : min, 24);
        const maxHour = sortedHours.reduce((max, h) => h.hour > max ? h.hour : max, 0);
        
        const activeHoursMap = {};
        sortedHours.forEach(h => {
          activeHoursMap[h.hour] = h;
        });

        let chartHTML = `
          <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 100%; background: rgba(0, 0, 0, 0.15); padding: 1.5rem 1rem 1rem; border-radius: 16px; border: 1px solid var(--card-border);">
            <div style="display: flex; align-items: flex-end; justify-content: space-between; height: 160px; width: 100%; border-bottom: 2px solid rgba(255, 255, 255, 0.1); padding-bottom: 0.25rem; position: relative;">
              <!-- Y-axis guide lines -->
              <div style="position: absolute; left: 0; right: 0; top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none;">
                <div style="border-top: 1px dashed rgba(255, 255, 255, 0.05); width: 100%; height: 0; display: flex; align-items: center;"><span style="font-size: 0.6rem; color: rgba(255,255,255,0.25); margin-top: -6px; margin-left: 2px;">5.0</span></div>
                <div style="border-top: 1px dashed rgba(255, 255, 255, 0.05); width: 100%; height: 0; display: flex; align-items: center;"><span style="font-size: 0.6rem; color: rgba(255,255,255,0.25); margin-top: -6px; margin-left: 2px;">4.0</span></div>
                <div style="border-top: 1px dashed rgba(255, 255, 255, 0.05); width: 100%; height: 0; display: flex; align-items: center;"><span style="font-size: 0.6rem; color: rgba(255,255,255,0.25); margin-top: -6px; margin-left: 2px;">3.0</span></div>
                <div style="border-top: 1px dashed rgba(255, 255, 255, 0.05); width: 100%; height: 0; display: flex; align-items: center;"><span style="font-size: 0.6rem; color: rgba(255,255,255,0.25); margin-top: -6px; margin-left: 2px;">2.0</span></div>
                <div style="border-top: 1px dashed rgba(255, 255, 255, 0.05); width: 100%; height: 0; display: flex; align-items: center;"><span style="font-size: 0.6rem; color: rgba(255,255,255,0.25); margin-top: -6px; margin-left: 2px;">1.0</span></div>
              </div>
        `;

        for (let hr = minHour; hr <= maxHour; hr++) {
          const hrData = activeHoursMap[hr];
          if (hrData && hrData.totalVotes > 0) {
            const avgRating = (hrData.totalScore / hrData.totalVotes).toFixed(1);
            const heightPct = (parseFloat(avgRating) / 5) * 100;
            const hourLabel = `${padHour(hr)}:00 - ${padHour((hr+1)%24)}:00`;
            
            chartHTML += `
              <div style="display: flex; flex-direction: column; align-items: center; flex: 1; height: 100%; justify-content: flex-end; position: relative; z-index: 2;">
                <span style="font-size: 0.65rem; color: #34d399; font-weight: 700; margin-bottom: 0.15rem; transform: scale(0.9);">${avgRating}</span>
                <div class="histogram-bar" style="width: 65%; height: ${heightPct}%; background: linear-gradient(180deg, var(--accent-color) 0%, var(--success-color) 100%); border-radius: 4px 4px 0 0; transition: height 0.8s cubic-bezier(0.1, 0.8, 0.3, 1);" 
                     title="Hour ${hourLabel}: Average ${avgRating} (${hrData.totalVotes} votes)"></div>
                <span style="font-size: 0.65rem; color: var(--text-secondary); margin-top: 0.25rem; font-weight: 500; font-family: monospace;">${padHour(hr)}h</span>
              </div>
            `;
          } else {
            chartHTML += `
              <div style="display: flex; flex-direction: column; align-items: center; flex: 1; height: 100%; justify-content: flex-end; position: relative; z-index: 2;">
                <span style="font-size: 0.65rem; color: transparent; margin-bottom: 0.15rem;">-</span>
                <div style="width: 65%; height: 0%; border-bottom: 1px dashed rgba(255, 255, 255, 0.15);"></div>
                <span style="font-size: 0.65rem; color: rgba(255, 255, 255, 0.25); margin-top: 0.25rem; font-weight: 500; font-family: monospace;">${padHour(hr)}h</span>
              </div>
            `;
          }
        }

        chartHTML += `
            </div>
            <div style="text-align: center; font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem;">
              Histogram: Average rating (1.0 to 5.0) per hour of the day
            </div>
          </div>
        `;
        histogramContainer.innerHTML = chartHTML;
      }

      surveyReportModal.style.display = 'flex';
    } catch (error) {
      console.error('Error loading survey report:', error);
      alert('Network error loading survey report.');
    }
  }

  // Cookie Consent Logic
  const cookieBanner = document.getElementById('cookieBanner');
  const acceptCookiesBtn = document.getElementById('acceptCookiesBtn');

  const hasAcceptedCookies = localStorage.getItem('cookieConsent') === 'accepted';
  
  if (!hasAcceptedCookies) {
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (userTimeZone && userTimeZone.startsWith('Europe/')) {
      cookieBanner.style.display = 'block';
    }
  }

  acceptCookiesBtn.addEventListener('click', () => {
    localStorage.setItem('cookieConsent', 'accepted');
    cookieBanner.style.display = 'none';
  });
});
