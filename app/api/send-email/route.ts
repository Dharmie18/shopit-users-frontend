import { NextRequest, NextResponse } from 'next/server';
import {
  sendMagicLinkVerification,
  sendPasswordResetOtp,
  sendOrderConfirmationEmail,
  sendReferralRewardEmail,
  sendLoginAlertEmail,
  sendPasswordChangedEmail,
} from '@/lib/mailer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      type,
      to,
      name,
      token,
      otp,
      frontendUrl,
      orderId,
      items,
      subtotal,
      discount,
      tax,
      total,
      shippingAddress,
      paymentMethod,
      friendName,
      couponCode,
      discountPercent,
      time,
      ip,
    } = body;

    if (!to || !type) {
      return NextResponse.json({ error: 'Missing required fields: type and to' }, { status: 400 });
    }

    if (type === 'verification') {
      if (!token) {
        return NextResponse.json({ error: 'Verification token is required' }, { status: 400 });
      }
      await sendMagicLinkVerification({ to, name, token, frontendUrl });
      return NextResponse.json({ success: true, message: 'Verification email sent via Nodemailer.' });
    }

    if (type === 'reset_otp') {
      if (!otp) {
        return NextResponse.json({ error: 'OTP code is required' }, { status: 400 });
      }
      await sendPasswordResetOtp({ to, name, otp });
      return NextResponse.json({ success: true, message: 'Password reset OTP sent via Nodemailer.' });
    }

    if (type === 'order_receipt') {
      await sendOrderConfirmationEmail({
        to,
        name,
        orderId: orderId || Date.now(),
        items: Array.isArray(items) ? items : [],
        subtotal: Number(subtotal || 0),
        discount: Number(discount || 0),
        tax: Number(tax || 0),
        total: Number(total || 0),
        shippingAddress: shippingAddress || 'Standard Delivery',
        paymentMethod: paymentMethod || 'Completed',
      });
      return NextResponse.json({ success: true, message: 'Order receipt sent via Nodemailer.' });
    }

    if (type === 'referral_reward') {
      await sendReferralRewardEmail({
        to,
        name,
        friendName: friendName || 'Your friend',
        couponCode: couponCode || 'REF5-REWARD',
        discountPercent: discountPercent || 5,
      });
      return NextResponse.json({ success: true, message: 'Referral reward email sent via Nodemailer.' });
    }

    if (type === 'login_alert') {
      await sendLoginAlertEmail({
        to,
        name,
        time: time || new Date().toLocaleString(),
        ip: ip || 'Remote Client',
      });
      return NextResponse.json({ success: true, message: 'Login security alert sent via Nodemailer.' });
    }

    if (type === 'password_changed') {
      await sendPasswordChangedEmail({
        to,
        name,
        time: time || new Date().toLocaleString(),
      });
      return NextResponse.json({ success: true, message: 'Password changed confirmation sent via Nodemailer.' });
    }

    return NextResponse.json({ error: `Unsupported email type: ${type}` }, { status: 400 });
  } catch (error: any) {
    console.error('[Nodemailer API Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to send email via Nodemailer' },
      { status: 500 }
    );
  }
}

