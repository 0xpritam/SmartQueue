// src/templates/cancellation.template.js

module.exports = ({
  patientName,
  departmentName,
  ticketNumber,
  cancellationTime,
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Cancelled - SmartQueue</title>
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
      background-color: #dc2626;
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
      background-color: #fdf2f2;
      border: 1px solid #fde2e2;
      border-radius: 6px;
      padding: 20px;
      margin-bottom: 25px;
    }
    .card-title {
      font-size: 16px;
      font-weight: 700;
      color: #dc2626;
      margin-top: 0;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      border-bottom: 1px dashed #fde2e2;
      padding-bottom: 8px;
    }
    .detail-row:last-child {
      margin-bottom: 0;
      border-bottom: none;
      padding-bottom: 0;
    }
    .detail-label {
      font-weight: 600;
      color: #7f1d1d;
    }
    .detail-value {
      color: #1f2937;
      text-align: right;
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
        <h1>Appointment Cancelled</h1>
      </div>
      <div class="content">
        <div class="greeting">Hello ${patientName},</div>
        <p>This email confirms that your SmartQueue appointment has been cancelled.</p>
        
        <div class="card">
          <div class="card-title">Cancellation Summary</div>
          <div class="detail-row">
            <div class="detail-label">Department</div>
            <div class="detail-value">${departmentName}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Ticket Number</div>
            <div class="detail-value" style="font-family: monospace;">${ticketNumber}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Cancellation Time</div>
            <div class="detail-value">${cancellationTime}</div>
          </div>
        </div>
        
        <p>If you did not request this cancellation or would like to book a new appointment, please visit the SmartQueue portal.</p>
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
