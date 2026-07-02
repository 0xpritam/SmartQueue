module.exports = ({
  patientName,
  ticketNumber,
  oldDepartment,
  newDepartment,
  oldQueuePosition,
  newQueuePosition,
  rescheduledTime,
  queueLink,
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Rescheduled - SmartQueue</title>
  <style>
    body {
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f3f4f6;
      color: #1f2937;
      margin: 0;
      padding: 0;
    }
    .wrapper {
      width: 100%;
      background-color: #f3f4f6;
      padding: 20px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .header {
      background-color: #0f766e;
      padding: 30px 20px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.025em;
    }
    .content {
      padding: 30px 25px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 20px;
    }
    .card {
      background-color: #f0fdfa;
      border: 1px solid #ccfbf1;
      border-radius: 6px;
      padding: 20px;
      margin-bottom: 25px;
    }
    .card-title {
      font-size: 16px;
      font-weight: 700;
      color: #0f766e;
      margin-top: 0;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      border-bottom: 1px dashed #ccfbf1;
      padding-bottom: 8px;
    }
    .detail-row:last-child {
      margin-bottom: 0;
      border-bottom: none;
      padding-bottom: 0;
    }
    .detail-label {
      font-weight: 600;
      color: #0f766e;
    }
    .detail-value {
      color: #1f2937;
      text-align: right;
    }
    .button-container {
      text-align: center;
      margin-top: 25px;
      margin-bottom: 10px;
    }
    .btn {
      display: inline-block;
      background-color: #0f766e;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 15px;
      box-shadow: 0 2px 4px rgba(15, 118, 110, 0.2);
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
      border-top: 1px solid #f3f4f6;
    }
    .footer p {
      margin: 4px 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>Appointment Rescheduled</h1>
      </div>
      <div class="content">
        <div class="greeting">Hello ${patientName},</div>
        <p>Your SmartQueue appointment has been successfully rescheduled. Below are your updated details:</p>
        
        <div class="card">
          <div class="card-title">Rescheduled Details</div>
          <div class="detail-row">
            <div class="detail-label">Ticket Number</div>
            <div class="detail-value" style="font-family: monospace;">${ticketNumber}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Previous Department</div>
            <div class="detail-value" style="text-decoration: line-through; color: #6b7280;">${oldDepartment} (#${oldQueuePosition})</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">New Department</div>
            <div class="detail-value" style="font-weight: 700; color: #0f766e;">${newDepartment}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">New Queue Position</div>
            <div class="detail-value" style="font-weight: 700; color: #0f766e;">#${newQueuePosition}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Rescheduled Time</div>
            <div class="detail-value">${rescheduledTime}</div>
          </div>
        </div>
        
        <div class="button-container">
          <a href="${queueLink}" class="btn" target="_blank">Track Queue Live Status</a>
        </div>
      </div>
      <div class="footer">
        <p>This is an automated SmartQueue notification.</p>
        <p>&copy; ${new Date().getFullYear()} SmartQueue. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;
