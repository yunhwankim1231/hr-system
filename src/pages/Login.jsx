import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { LogIn, Lock, Mail, ShieldCheck } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 회원가입 모달 상태
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupError, setSignupError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
    
    setLoading(false);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!signupEmail || !signupPassword) {
      setSignupError('이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }
    
    setLoading(true);
    setSignupError(null);

    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
    });

    if (error) {
      setSignupError(error.message);
    } else {
      alert(`회원가입이 완료되었습니다!\n\n입력하신 이메일(${signupEmail})로 이동하여 확인(Confirmation) 메일을 승인(Click)해 주세요.`);
      setShowSignupModal(false);
      setSignupEmail('');
      setSignupPassword('');
    }
    
    setLoading(false);
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={iconWrapperStyle}>
            <ShieldCheck size={40} style={{ color: 'var(--primary-color)' }} />
          </div>
          <h1 style={titleStyle}>MJ HR & PAYROLL</h1>
          <p style={subtitleStyle}>통합 인사/급여 관리 시스템에 로그인하세요</p>
        </div>

        {error && (
          <div style={errorAlertStyle}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={formStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>이메일</label>
            <div style={inputWrapperStyle}>
              <Mail size={18} style={inputIconStyle} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                placeholder="admin@example.com"
              />
            </div>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>비밀번호</label>
            <div style={inputWrapperStyle}>
              <Lock size={18} style={inputIconStyle} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
                placeholder="••••••••"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button 
              type="button" 
              disabled={loading} 
              style={signupButtonStyle} 
              onClick={() => {
                setShowSignupModal(true);
                setSignupError(null);
                setSignupEmail('');
                setSignupPassword('');
              }}
            >
              회원가입
            </button>
            <button type="submit" disabled={loading} style={{ ...buttonStyle, flex: 2, marginTop: 0 }}>
              {loading ? '처리 중...' : (
                <>
                  <LogIn size={18} />
                  로그인
                </>
              )}
            </button>
          </div>
        </form>

        <div style={footerStyle}>
          보안 접근 제어(RBAC) 시스템이 작동 중입니다. <br />
          권한 부여 및 계정 생성은 시스템 관리자에게 문의하세요.
        </div>
      </div>

      {/* 회원가입 모달 */}
      {showSignupModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ ...cardStyle, width: '400px', animation: 'fadeIn 0.2s ease', position: 'relative' }}>
            <button 
              onClick={() => setShowSignupModal(false)}
              style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              ✕
            </button>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px', color: 'white' }}>신규 관리자 회원가입</h2>
            
            {signupError && (
              <div style={errorAlertStyle}>
                {signupError}
              </div>
            )}

            <form onSubmit={handleSignUp} style={formStyle}>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>사용할 이메일</label>
                <div style={inputWrapperStyle}>
                  <Mail size={18} style={inputIconStyle} />
                  <input
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    style={inputStyle}
                    placeholder="new@example.com"
                  />
                </div>
              </div>

              <div style={inputGroupStyle}>
                <label style={labelStyle}>비밀번호 (6자리 이상)</label>
                <div style={inputWrapperStyle}>
                  <Lock size={18} style={inputIconStyle} />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    style={inputStyle}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} style={{ ...buttonStyle, marginTop: '20px' }}>
                {loading ? '가입 처리 중...' : '회원가입 신청'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const containerStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
  color: 'white',
  fontFamily: 'var(--font-family, Inter, sans-serif)',
};

const cardStyle = {
  width: '100%',
  maxWidth: '420px',
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '24px',
  padding: '40px',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  animation: 'fadeIn 0.5s ease-out',
};

const headerStyle = {
  textAlign: 'center',
  marginBottom: '32px',
};

const iconWrapperStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '80px',
  height: '80px',
  background: 'rgba(59, 130, 246, 0.1)',
  borderRadius: '50%',
  marginBottom: '20px',
  boxShadow: '0 0 30px rgba(59, 130, 246, 0.2)',
};

const titleStyle = {
  fontSize: '24px',
  fontWeight: '800',
  margin: '0 0 8px 0',
  background: 'linear-gradient(to right, #60a5fa, #a78bfa)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  letterSpacing: '0.5px',
};

const subtitleStyle = {
  fontSize: '14px',
  color: 'var(--text-secondary, #94a3b8)',
  margin: 0,
};

const formStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
};

const inputGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const labelStyle = {
  fontSize: '13px',
  fontWeight: '600',
  color: 'var(--text-secondary, #cbd5e1)',
  marginLeft: '4px',
};

const inputWrapperStyle = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
};

const inputIconStyle = {
  position: 'absolute',
  left: '16px',
  color: '#64748b',
};

const inputStyle = {
  width: '100%',
  padding: '14px 16px 14px 44px',
  background: 'rgba(0, 0, 0, 0.2)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  color: 'white',
  fontSize: '15px',
  outline: 'none',
  transition: 'all 0.2s',
  boxSizing: 'border-box'
};

const buttonStyle = {
  marginTop: '10px',
  width: '100%',
  padding: '14px',
  background: 'var(--primary-color, #3b82f6)',
  color: 'white',
  border: 'none',
  borderRadius: '12px',
  fontSize: '16px',
  fontWeight: '700',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  transition: 'all 0.2s',
  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
};

const signupButtonStyle = {
  flex: 1,
  padding: '14px',
  background: 'rgba(255, 255, 255, 0.1)',
  color: 'white',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '12px',
  fontSize: '15px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const errorAlertStyle = {
  background: 'rgba(239, 68, 68, 0.1)',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  color: '#f87171',
  padding: '12px 16px',
  borderRadius: '12px',
  fontSize: '13px',
  marginBottom: '20px',
  textAlign: 'center',
};

const footerStyle = {
  marginTop: '32px',
  textAlign: 'center',
  fontSize: '12px',
  color: 'rgba(255, 255, 255, 0.3)',
  lineHeight: '1.5',
};
