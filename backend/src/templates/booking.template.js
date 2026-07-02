// src/templates/booking.template.js

module.exports = ({
  patientName,
  hospitalName,
  departmentName,
  queueNumber,
  ticketNumber,
  appointmentDate,
  bookingTime,
  queueLink,
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Booked - SmartQueue</title>
  <style>
    body {
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f3f4f6;
      color: #1f2937;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
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
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
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
  
   .button-container {
  text-align: center;
  margin-top: 30px;
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
        <h1>SmartQueue Appointment</h1>
      </div>
      <div class="content">
        <div class="greeting">Hello ${patientName},</div>
        <p>Your appointment has been successfully booked. Below are your queue and ticket details:</p>
        
        <div class="card">
  <div class="card-title">Appointment Details</div>

  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr>
      <td style="padding:10px 0;font-weight:600;color:#4b5563;border-bottom:1px dashed #e2e8f0;">
        Hospital:
      </td>
      <td style="padding:10px 0;text-align:right;border-bottom:1px dashed #e2e8f0;">
        ${hospitalName}
      </td>
    </tr>

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
        Queue Position:
      </td>
      <td style="padding:10px 0;text-align:right;font-weight:700;color:#0f766e;border-bottom:1px dashed #e2e8f0;">
        #${queueNumber}
      </td>
    </tr>

    <tr>
      <td style="padding:10px 0;font-weight:600;color:#4b5563;border-bottom:1px dashed #e2e8f0;">
        Ticket Number:
      </td>
      <td style="padding:10px 0;text-align:right;font-family:monospace;border-bottom:1px dashed #e2e8f0;">
        ${ticketNumber}
      </td>
    </tr>

    <tr>
      <td style="padding:10px 0;font-weight:600;color:#4b5563;border-bottom:1px dashed #e2e8f0;">
        Date:
      </td>
      <td style="padding:10px 0;text-align:right;border-bottom:1px dashed #e2e8f0;">
        ${appointmentDate}
      </td>
    </tr>

    <tr>
      <td style="padding:10px 0;font-weight:600;color:#4b5563;">
        Booking Time:
      </td>
      <td style="padding:10px 0;text-align:right;">
        ${bookingTime}
      </td>
    </tr>
  </table>
</div>
        
        <div class="button-container">
         <div class="button-container">
  <a href="${queueLink}" class="btn" target="_blank">
    Track Queue Live Status
  </a>

  <p style="margin-top:20px;font-size:13px;color:#6b7280;">
    If the button doesn't work, copy and paste this link into your browser:
  </p>

  <p style="font-size:12px;word-break:break-all;color:#0f766e;">
    ${queueLink}
  </p>
</div>
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
