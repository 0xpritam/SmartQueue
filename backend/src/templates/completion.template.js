// src/templates/completion.template.js

module.exports = ({
  patientName,
  departmentName,
  visitTime,
  appreciationMessage,
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank You for Your Visit - SmartQueue</title>
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
      text-align: center;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 20px;
      text-align: left;
    }
    .message {
      font-size: 16px;
      line-height: 1.6;
      color: #4b5563;
      margin-bottom: 25px;
      text-align: left;
    }
    .card {
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
      padding: 20px;
      margin-bottom: 25px;
      text-align: left;
    }
    .card-title {
      font-size: 16px;
      font-weight: 700;
      color: #16a34a;
      margin-top: 0;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
   
    .heart-icon {
      font-size: 48px;
      color: #0f766e;
      margin-bottom: 15px;
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
        <h1>Visit Completed</h1>
      </div>
      <div class="content">
        <div class="heart-icon">&hearts;</div>
        <div class="greeting">Hello ${patientName},</div>
        <div class="message">${appreciationMessage}</div>
        
        <div class="card">
  <div class="card-title">Visit Details</div>

  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">

    <tr>
      <td style="padding:10px 0;font-weight:600;color:#14532d;border-bottom:1px dashed #bbf7d0;">
        Department:
      </td>

      <td style="padding:10px 0;text-align:right;border-bottom:1px dashed #bbf7d0;">
        ${departmentName}
      </td>
    </tr>

    <tr>
      <td style="padding:10px 0;font-weight:600;color:#14532d;">
        Completion Time:
      </td>

      <td style="padding:10px 0;text-align:right;">
        ${visitTime}
      </td>
    </tr>

  </table>
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
