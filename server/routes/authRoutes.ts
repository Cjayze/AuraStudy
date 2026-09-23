import { Router, Response } from 'express';
import { getDb, saveDb, User } from '../db';
import { generateToken, hashPassword, comparePassword, authenticateToken, AuthRequest } from '../auth';
import { adminAuth } from '../../src/lib/firebase-admin.ts';
import { getOrCreateUser } from '../../src/db/users.ts';

export const authRouter = Router();

// POST /api/auth/firebase-login
authRouter.post('/firebase-login', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({
        status: 'error',
        message: 'Thiếu Firebase idToken để xác thực.'
      });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const email = decoded.email || `${decoded.uid}@aurastudy.user`;
    const fullName = decoded.name || email.split('@')[0];
    const avatarUrl = decoded.picture || '';

    // Synchronize to Cloud SQL via getOrCreateUser
    try {
      await getOrCreateUser(decoded.uid, email, fullName, avatarUrl);
    } catch (sqlErr) {
      console.warn('Note: getOrCreateUser Cloud SQL sync warning:', sqlErr);
    }

    // Sync to memory/disk state
    const db = getDb();
    let user = db.users.find(u => u.id === decoded.uid || u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      user = {
        id: decoded.uid,
        email,
        password_hash: '',
        full_name: fullName,
        role: 'student',
        avatar_url: avatarUrl,
        is_active: true,
        created_at: new Date().toISOString()
      };
      db.users.push(user);

      // Add default learning progress
      db.learning_progress.push({
        id: `prog_${user.id}`,
        user_id: user.id,
        total_documents: 0,
        total_questions_asked: 0,
        total_quizzes_completed: 0,
        average_score: 0,
        last_active_at: new Date().toISOString()
      });
      saveDb();
    }

    const token = generateToken(user);

    return res.status(200).json({
      status: 'success',
      message: 'Đăng nhập Google thành công!',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.full_name,
          full_name: user.full_name,
          role: user.role,
          school: user.school || '',
          avatar_url: user.avatar_url
        },
        access_token: token,
        token_type: 'Bearer'
      }
    });
  } catch (error: any) {
    console.error('Firebase login error:', error);
    return res.status(401).json({
      status: 'error',
      message: 'Xác thực tài khoản Google thất bại: ' + (error.message || 'Token không hợp lệ')
    });
  }
});

// POST /api/auth/register
authRouter.post('/register', (req, res) => {
  try {
    const email = req.body.email ? String(req.body.email).trim().toLowerCase() : '';
    const password = req.body.password ? String(req.body.password) : '';
    const fullName = (req.body.full_name || req.body.name || '').trim();
    const school = (req.body.school || req.body.university || '').trim();

    if (!email || !password || !fullName) {
      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng cung cấp đầy đủ email, mật khẩu và họ tên.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: 'error',
        message: 'Địa chỉ email không đúng định dạng hợp lệ.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Mật khẩu phải có độ dài tối thiểu từ 6 ký tự.'
      });
    }

    const db = getDb();
    const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(409).json({
        status: 'error',
        message: 'Email này đã được đăng ký trên hệ thống AuraStudy. Vui lòng sử dụng email khác hoặc đăng nhập.'
      });
    }

    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email,
      password_hash: hashPassword(password),
      full_name: fullName,
      school: school || undefined,
      role: 'student',
      is_active: true,
      created_at: new Date().toISOString()
    };

    db.users.push(newUser);

    // Initialize learning progress record for user
    db.learning_progress.push({
      id: `prog_${newUser.id}`,
      user_id: newUser.id,
      total_documents: 0,
      total_questions_asked: 0,
      total_quizzes_completed: 0,
      average_score: 0,
      last_active_at: new Date().toISOString()
    });

    saveDb();

    const token = generateToken(newUser);

    return res.status(201).json({
      status: 'success',
      message: 'Đăng ký tài khoản AuraStudy thành công!',
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.full_name,
          full_name: newUser.full_name,
          role: newUser.role,
          school: newUser.school || ''
        },
        access_token: token,
        token_type: 'Bearer'
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Đã xảy ra lỗi máy chủ trong quá trình đăng ký.',
      error: error?.message
    });
  }
});

// POST /api/auth/login
authRouter.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng nhập đầy đủ email và mật khẩu.'
      });
    }

    const db = getDb();
    const user = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

    if (!user || !comparePassword(password, user.password_hash)) {
      return res.status(401).json({
        status: 'error',
        message: 'Email hoặc mật khẩu không chính xác.'
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        status: 'error',
        message: 'Tài khoản của bạn đang bị tạm khóa. Vui lòng liên hệ Admin.'
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      status: 'success',
      message: 'Đăng nhập thành công vào AuraStudy!',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.full_name,
          full_name: user.full_name,
          role: user.role,
          school: user.school || '',
          avatar_url: user.avatar_url
        },
        access_token: token,
        token_type: 'Bearer'
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Lỗi máy chủ khi đăng nhập.',
      error: error?.message
    });
  }
});

// GET /api/auth/me (Current authenticated user profile)
authRouter.get('/me', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  return res.status(200).json({
    status: 'success',
    data: {
      id: user.id,
      email: user.email,
      name: user.full_name,
      full_name: user.full_name,
      role: user.role,
      school: user.school || '',
      avatar_url: user.avatar_url,
      created_at: user.created_at
    }
  });
});

// POST /api/auth/logout
authRouter.post('/logout', (req, res) => {
  return res.status(200).json({
    status: 'success',
    message: 'Đăng xuất tài khoản thành công.'
  });
});
