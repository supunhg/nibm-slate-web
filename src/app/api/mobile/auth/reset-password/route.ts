import { NextResponse } from 'next/server';
import { authenticateMobileRequest, mobileAuthErrorResponse } from '@/lib/mobile-auth';
import { adminResetPassword } from '@/lib/storage';

export async function POST(request: Request) {
  const auth = await authenticateMobileRequest(request);
  if ('error' in auth) {
    return mobileAuthErrorResponse(auth);
  }

  if (auth.user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden: Only administrators can reset passwords.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { userId, newPassword, mustChangePassword } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required.' },
        { status: 400 }
      );
    }

    const result = await adminResetPassword(
      userId,
      newPassword,
      mustChangePassword ?? false,
      auth.user.id
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      user: result.user,
      newPassword: result.newPassword,
      message: 'Password reset successfully.',
    });
  } catch (error) {
    console.error('Error resetting password via mobile API:', error);
    return NextResponse.json({ error: 'Failed to reset password.' }, { status: 500 });
  }
}
