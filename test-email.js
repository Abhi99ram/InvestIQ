const nodemailer = require('nodemailer');

async function testMail() {
  try {
    console.log("Creating transporter...");
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'investiq.helpdesk@gmail.com',
        pass: 'mhne tsvo hbfl xmdi'
      }
    });

    console.log("Verifying connection...");
    await transporter.verify();
    console.log("Connection verified!");

    console.log("Sending mail...");
    const info = await transporter.sendMail({
      from: '"Test" <investiq.helpdesk@gmail.com>',
      to: 'investiq.helpdesk@gmail.com',
      subject: 'Test email from backend',
      text: 'This is a test to see if credentials work.'
    });
    console.log("Email sent! Message ID:", info.messageId);
  } catch (err) {
    console.error("Failed to send email:", err);
  }
}

testMail();
