import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Shield } from '@/ui/icons'; // IDE Check: Shield icon
// CSSはApp.tsx等でグローバル定義するか、インラインでシンプルに実装

export const AccountLockedScreen: React.FC = () => {
  const { securityState } = useAuth();

  if (!securityState.isLocked) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#1a1a1a',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      color: '#fff',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div style={{
        backgroundColor: '#ef4444',
        padding: '2rem',
        borderRadius: '50%',
        marginBottom: '2rem'
      }}>
        <Shield size={64} color="#fff" />
      </div>
      
      <h1 style={{ marginBottom: '1rem', fontSize: '2rem' }}>Account Locked</h1>
      
      <p style={{ maxWidth: '600px', fontSize: '1.1rem', lineHeight: '1.6', color: '#d1d5db' }}>
        セキュリティ上の理由により、このアカウントは一時的にロックされています。<br />
        不正なアクセスや、ポリシー違反の操作が検知された可能性があります。
      </p>

      <div style={{ marginTop: '3rem', padding: '1rem', backgroundColor: '#333', borderRadius: '8px' }}>
        <p style={{ fontSize: '0.9rem', color: '#9ca3af' }}>
          管理者にお問い合わせください。<br />
          Reference ID: {useAuth().currentUser?.uid}
        </p>
      </div>
    </div>
  );
};
