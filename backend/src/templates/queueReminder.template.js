// src/templates/queueReminder.template.js

module.exports = ({
  patientName,
  currentPosition,
  estimatedWaitTime,
  departmentName,
  queueNumber,
  queueLink,
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Turn is Approaching - SmartQueue</title>
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
      background-color: #0284c7;
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
    .alert-banner {
      background-color: #e0f2fe;
      border-left: 4px solid #0284c7;
      color: #0369a1;
      padding: 15px;
      margin-bottom: 25px;
      border-radius: 4px;
      font-weight: 600;
    }
    .card {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 20px;
      margin-bottom: 25px;
    }
    .card-title {
      font-size: 16px;
      font-weight: 700;
      color: #0284c7;
      margin-top: 0;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .button-container {
      text-align: center;
      margin-top: 30px;
      margin-bottom: 10px;
    }
    .btn {
      display: inline-block;
      background-color: #0284c7;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 15px;
      box-shadow: 0 2px 4px rgba(2, 132, 199, 0.2);
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
        <h1>Turn Approaching</h1>
      </div>
      <div class="content">
        <div class="greeting">Hello ${patientName},</div>
        <div class="alert-banner">
          Your turn is approaching. Please arrive at the hospital.
        </div>
        
       <div class="card">
  <div class="card-title">Queue Status Summary</div>

  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">

    <tr>
      <td style="padding:10px 0;font-weight:600;color:#4b5563;border-bottom:1px dashed #e2e8f0;">
        Department:
      </td>

      <td style="padding:10px 0;text-align:right;border-bottom:1px dashed #e2e8f0;">
        ${departmentName}
      </td>
    </tr>

    <tr>
      <td style="padding:10px 0;font-weight:600;color:#4b5563;border-bottom:1px dashed #e2e8f0;">
        Queue Number:
      </td>

      <td style="padding:10px 0;text-align:right;font-weight:700;color:#0284c7;border-bottom:1px dashed #e2e8f0;">
        #${queueNumber}
      </td>
    </tr>

    <tr>
      <td style="padding:10px 0;font-weight:600;color:#4b5563;border-bottom:1px dashed #e2e8f0;">
        Patients Remaining:
      </td>

      <td style="padding:10px 0;text-align:right;font-weight:700;border-bottom:1px dashed #e2e8f0;">
        ${currentPosition - 1}
      </td>
    </tr>

    <tr>
      <td style="padding:10px 0;font-weight:600;color:#4b5563;">
        Estimated Wait:
      </td>

      <td style="padding:10px 0;text-align:right;font-weight:700;color:#0284c7;">
        ${estimatedWaitTime}
      </td>
    </tr>

  </table>
</div>
        
       <div class="button-container">
  <a href="${queueLink}" class="btn" target="_blank">
    Track Queue Live Status
  </a>

  <p style="margin-top:20px;font-size:13px;color:#6b7280;">
    If the button doesn't work, copy and paste this link into your browser:
  </p>

  <p style="font-size:12px;word-break:break-all;color:#0284c7;">
    ${queueLink}
  </p>
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
