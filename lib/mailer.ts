import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  name?: string;
  token?: string;
  otp?: string;
  frontendUrl?: string;
}

function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (!user || !pass) {
    console.warn('[Nodemailer] SMTP_USER or SMTP_PASS is missing in environment variables.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

export async function sendMagicLinkVerification({ to, name, token, frontendUrl }: EmailOptions) {
  const transporter = getTransporter();
  const baseUrl = (frontendUrl || process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const verifyLink = `${baseUrl}/?verify_token=${encodeURIComponent(token || '')}`;
  const fromName = process.env.SMTP_FROM_NAME || 'ShopIt Commerce';
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@shopit.com';
  const displayName = name || 'Valued Customer';

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Verify Your Email - ShopIt</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f1; margin: 0; padding: 40px 20px; color: #14212b;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #14212b20;">
      <tr>
        <td style="padding: 30px 40px; background-color: #14212b; text-align: center;">
          <h1 style="color: #e0ee56; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 2px;">SHOP IT</h1>
          <p style="color: #ffffff99; margin: 5px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px;">Customer Account Activation</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 40px;">
          <h2 style="font-size: 20px; font-weight: 800; margin: 0 0 15px 0; color: #14212b;">Welcome, ${displayName}!</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #14212b99; margin: 0 0 15px 0;">
            Thank you for creating an account on ShopIt. To complete your registration and securely activate your account, please click the button below:
          </p>
          <p style="font-size: 12px; color: #9a4e2c; font-weight: bold; margin: 0 0 25px 0;">* Note: This verification link expires in 30 minutes for your security.</p>
          <div style="text-align: center; margin: 35px 0;">
            <a href="${verifyLink}" style="background-color: #14212b; color: #e0ee56; padding: 14px 32px; font-size: 13px; font-weight: 900; text-decoration: none; text-transform: uppercase; letter-spacing: 1px; display: inline-block; border-radius: 0px;">
              Verify & Activate Account &rarr;
            </a>
          </div>
          <p style="font-size: 12px; line-height: 1.5; color: #14212b80; margin: 25px 0 0 0;">
            Or copy and paste this link into your browser:<br>
            <a href="${verifyLink}" style="color: #9a4e2c; word-break: break-all;">${verifyLink}</a>
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding: 20px 40px; background-color: #f5f5f1; border-top: 1px solid #14212b10; text-align: center; font-size: 11px; color: #14212b60;">
          &copy; ${new Date().getFullYear()} ShopIt Commerce. This verification link is valid for 30 minutes. If you did not create this account, please disregard this email.
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  return transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject: 'Activate Your ShopIt Account - Verification Link',
    html,
  });
}

export const sendVerificationEmail = sendMagicLinkVerification;


export async function sendPasswordResetOtp({ to, name, otp }: EmailOptions) {
  const transporter = getTransporter();
  const fromName = process.env.SMTP_FROM_NAME || 'ShopIt Commerce';
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@shopit.com';
  const displayName = name || 'Customer';

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Password Reset Code - ShopIt</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f1; margin: 0; padding: 40px 20px; color: #14212b;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #14212b20;">
      <tr>
        <td style="padding: 30px 40px; background-color: #14212b; text-align: center;">
          <h1 style="color: #e0ee56; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 2px;">SHOP IT</h1>
          <p style="color: #ffffff99; margin: 5px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px;">Password Recovery Code</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 40px;">
          <h2 style="font-size: 20px; font-weight: 800; margin: 0 0 15px 0; color: #14212b;">Hello, ${displayName}</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #14212b99; margin: 0 0 25px 0;">
            We received a request to reset your ShopIt account password. Use the 6-digit verification code below to complete the reset:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; background-color: #e8e8e1; border: 2px solid #14212b; padding: 16px 36px; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #14212b; font-family: monospace;">
              ${otp}
            </div>
          </div>
          <p style="font-size: 12px; color: #9a4e2c; font-weight: bold; text-align: center; margin: 0 0 20px 0;">
            This code expires in 15 minutes.
          </p>
          <p style="font-size: 12px; line-height: 1.5; color: #14212b60; margin: 0;">
            If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding: 20px 40px; background-color: #f5f5f1; border-top: 1px solid #14212b10; text-align: center; font-size: 11px; color: #14212b60;">
          &copy; ${new Date().getFullYear()} ShopIt Commerce. Automated Security Notification.
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  return transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject: `Your ShopIt Password Reset Code: ${otp}`,
    html,
  });
}

export async function sendOrderConfirmationEmail({
  to,
  name,
  orderId,
  items,
  subtotal,
  discount,
  tax,
  total,
  shippingAddress,
  paymentMethod,
}: {
  to: string;
  name?: string;
  orderId: number | string;
  items: Array<{ name: string; quantity: number; price: number }>;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  shippingAddress: string;
  paymentMethod: string;
}) {
  const transporter = getTransporter();
  const fromName = process.env.SMTP_FROM_NAME || 'ShopIt Commerce';
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@shopit.com';
  const displayName = name || 'Valued Customer';
  const orderDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const rows = items
    .map(
      (item) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 12px 8px; font-size: 13px; font-weight: 700; color: #14212b;">${item.name}</td>
      <td style="padding: 12px 8px; font-size: 13px; text-align: center; color: #475569;">${item.quantity}</td>
      <td style="padding: 12px 8px; font-size: 13px; text-align: right; font-family: monospace; color: #14212b;">₦${Number(item.price).toLocaleString()}</td>
      <td style="padding: 12px 8px; font-size: 13px; text-align: right; font-family: monospace; font-weight: 800; color: #14212b;">₦${(item.quantity * Number(item.price)).toLocaleString()}</td>
    </tr>`
    )
    .join('');

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Order Confirmation #${orderId}</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f1; margin: 0; padding: 40px 20px; color: #14212b;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #14212b20;">
      <tr>
        <td style="padding: 30px 40px; background-color: #14212b; text-align: center;">
          <h1 style="color: #e0ee56; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 2px;">SHOP IT</h1>
          <p style="color: #ffffff99; margin: 5px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px;">Order Receipt & Tax Invoice</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 35px 40px;">
          <h2 style="font-size: 20px; font-weight: 900; margin: 0 0 10px 0; color: #14212b;">Order Confirmation #${orderId}</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #14212b99; margin: 0 0 20px 0;">
            Hello ${displayName}, thank you for your order! Your payment has been received and order processing has begun.
          </p>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; margin-bottom: 25px; font-size: 12px; line-height: 1.6;">
            <strong>Order Date:</strong> ${orderDate}<br>
            <strong>Payment Method:</strong> ${paymentMethod} (Completed)<br>
            <strong>Delivery Address:</strong> ${shippingAddress}
          </div>

          <table width="100%" style="border-collapse: collapse; margin-bottom: 25px;">
            <thead>
              <tr style="background: #14212b; color: #ffffff; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em;">
                <th style="padding: 10px 8px; text-align: left;">Item</th>
                <th style="padding: 10px 8px; text-align: center;">Qty</th>
                <th style="padding: 10px 8px; text-align: right;">Price</th>
                <th style="padding: 10px 8px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding: 10px 8px 4px; text-align: right; font-size: 13px; color: #64748b;">Subtotal:</td>
                <td style="padding: 10px 8px 4px; text-align: right; font-size: 13px; font-family: monospace;">₦${Number(subtotal).toLocaleString()}</td>
              </tr>
              ${discount > 0 ? `
              <tr>
                <td colspan="3" style="padding: 4px 8px; text-align: right; font-size: 13px; color: #059669; font-weight: bold;">Coupon Discount:</td>
                <td style="padding: 4px 8px; text-align: right; font-size: 13px; color: #059669; font-weight: bold; font-family: monospace;">-₦${Number(discount).toLocaleString()}</td>
              </tr>` : ''}
              <tr>
                <td colspan="3" style="padding: 4px 8px; text-align: right; font-size: 13px; color: #64748b;">VAT (7.5%):</td>
                <td style="padding: 4px 8px; text-align: right; font-size: 13px; font-family: monospace;">₦${Number(tax).toLocaleString()}</td>
              </tr>
              <tr style="border-top: 2px solid #14212b;">
                <td colspan="3" style="padding: 12px 8px; text-align: right; font-size: 15px; font-weight: 900; color: #14212b; text-transform: uppercase;">Grand Total:</td>
                <td style="padding: 12px 8px; text-align: right; font-size: 16px; font-weight: 900; color: #9a4e2c; font-family: monospace;">₦${Number(total).toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 20px 40px; background-color: #f5f5f1; border-top: 1px solid #14212b10; text-align: center; font-size: 11px; color: #14212b60;">
          &copy; ${new Date().getFullYear()} ShopIt Commerce. Direct Wholesale & Retail Logistics.
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  return transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject: `Order Confirmation #${orderId} - ShopIt Receipt`,
    html,
  });
}

export async function sendReferralRewardEmail({
  to,
  name,
  friendName,
  couponCode,
  discountPercent = 5,
}: {
  to: string;
  name?: string;
  friendName: string;
  couponCode: string;
  discountPercent?: number;
}) {
  const transporter = getTransporter();
  const fromName = process.env.SMTP_FROM_NAME || 'ShopIt Commerce';
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@shopit.com';
  const displayName = name || 'Valued Partner';

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Referral Reward Unlocked</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f1; margin: 0; padding: 40px 20px; color: #14212b;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #14212b20;">
      <tr>
        <td style="padding: 30px 40px; background-color: #14212b; text-align: center;">
          <h1 style="color: #e0ee56; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 2px;">SHOP IT</h1>
          <p style="color: #ffffff99; margin: 5px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px;">Referral Rewards Hub</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 35px 40px;">
          <h2 style="font-size: 20px; font-weight: 900; margin: 0 0 10px 0; color: #14212b;">🎉 You Earned a ${discountPercent}% OFF Coupon!</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #14212b99; margin: 0 0 20px 0;">
            Hello ${displayName}, your friend <strong>${friendName}</strong> just joined ShopIt with your referral invite link!
          </p>
          <div style="background-color: #14212b; color: #e0ee56; text-align: center; padding: 24px; margin: 20px 0;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #ffffff99;">Your New Coupon Code</div>
            <div style="font-family: monospace; font-size: 28px; font-weight: 900; letter-spacing: 0.15em; margin: 10px 0;">${couponCode}</div>
            <div style="font-size: 12px; color: #ffffff;">${discountPercent}% OFF (Valid 7 days on 3+ items)</div>
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding: 20px 40px; background-color: #f5f5f1; border-top: 1px solid #14212b10; text-align: center; font-size: 11px; color: #14212b60;">
          &copy; ${new Date().getFullYear()} ShopIt Commerce. Unlimited Rewards Program.
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  return transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject: `🎉 You Earned a ${discountPercent}% OFF Coupon on ShopIt!`,
    html,
  });
}

export async function sendLoginAlertEmail({
  to,
  name,
  time,
  ip,
}: {
  to: string;
  name?: string;
  time: string;
  ip: string;
}) {
  const transporter = getTransporter();
  const fromName = process.env.SMTP_FROM_NAME || 'ShopIt Commerce';
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@shopit.com';
  const displayName = name || 'Customer';

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Security Alert: New Sign-In</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f1; margin: 0; padding: 40px 20px; color: #14212b;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #14212b20;">
      <tr>
        <td style="padding: 30px 40px; background-color: #14212b; text-align: center;">
          <h1 style="color: #e0ee56; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 2px;">SHOP IT</h1>
          <p style="color: #ffffff99; margin: 5px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px;">Account Security Alert</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 35px 40px;">
          <h2 style="font-size: 20px; font-weight: 900; margin: 0 0 10px 0; color: #14212b;">New Sign-In Detected</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #14212b99; margin: 0 0 20px 0;">
            Hello ${displayName}, your ShopIt account was just accessed with a successful sign-in.
          </p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; margin-bottom: 20px; font-size: 13px; line-height: 1.6;">
            <strong>Account:</strong> ${to}<br>
            <strong>Time:</strong> ${time}<br>
            <strong>IP Address:</strong> ${ip}
          </div>
          <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
            If this was you, no action is needed. If you did not sign in, please reset your password immediately.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding: 20px 40px; background-color: #f5f5f1; border-top: 1px solid #14212b10; text-align: center; font-size: 11px; color: #14212b60;">
          &copy; ${new Date().getFullYear()} ShopIt Commerce. Security Notifications.
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  return transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject: 'Security Alert: New Sign-In to Your ShopIt Account',
    html,
  });
}

export async function sendPasswordChangedEmail({
  to,
  name,
  time,
}: {
  to: string;
  name?: string;
  time: string;
}) {
  const transporter = getTransporter();
  const fromName = process.env.SMTP_FROM_NAME || 'ShopIt Commerce';
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@shopit.com';
  const displayName = name || 'Customer';

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Password Changed Successfully</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f1; margin: 0; padding: 40px 20px; color: #14212b;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #14212b20;">
      <tr>
        <td style="padding: 30px 40px; background-color: #14212b; text-align: center;">
          <h1 style="color: #e0ee56; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 2px;">SHOP IT</h1>
          <p style="color: #ffffff99; margin: 5px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px;">Security Confirmation</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 35px 40px;">
          <h2 style="font-size: 20px; font-weight: 900; margin: 0 0 10px 0; color: #14212b;">Password Updated</h2>
          <div style="background: #ecfdf5; border: 1px solid #10b98140; color: #065f46; padding: 16px; margin: 15px 0; font-size: 13px; font-weight: 600; text-align: center;">
            ✓ Your account password was successfully changed on ${time}.
          </div>
          <p style="font-size: 12px; color: #ef4444; font-weight: bold; line-height: 1.5;">
            If you did not perform this change, please recover your account immediately.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding: 20px 40px; background-color: #f5f5f1; border-top: 1px solid #14212b10; text-align: center; font-size: 11px; color: #14212b60;">
          &copy; ${new Date().getFullYear()} ShopIt Commerce. Security Center.
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  return transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject: 'Security Alert: Password Changed for Your ShopIt Account',
    html,
  });
}
