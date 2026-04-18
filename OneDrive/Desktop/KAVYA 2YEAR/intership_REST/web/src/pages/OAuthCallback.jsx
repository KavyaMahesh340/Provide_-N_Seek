import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

const OAuthCallback = () => {
  const [params] = useSearchParams();
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const error = params.get('error');

    if (error) {
      toast('OAuth sign-in failed. Please try again.', 'error');
      navigate('/login');
      return;
    }
    if (accessToken && refreshToken) {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      api.get('/auth/me').then(({ data }) => {
        login(data.user, { accessToken, refreshToken });
        toast('Signed in with Google! 🎉', 'success');
        navigate('/dashboard');
      }).catch(() => {
        toast('Authentication error', 'error');
        navigate('/login');
      });
    } else {
      navigate('/login');
    }
  }, []);

  return (
    <div className="page-loader" style={{ minHeight: '100vh' }}>
      <div className="spinner" style={{ width: 40, height: 40, borderWidth: 4 }} />
    </div>
  );
};

export default OAuthCallback;
