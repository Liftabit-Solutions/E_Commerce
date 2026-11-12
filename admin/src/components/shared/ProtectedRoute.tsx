import React from 'react';
import { useApp } from '../../core/context/AppContext';
import { Loader2 } from 'lucide-react';
import AdminLoginPage from '../../features/auth/pages/AdminLoginPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ThreeDTruckLoader: React.FC = () => (
  <div className="relative flex flex-col items-center justify-center select-none py-4 overflow-hidden w-[280px] h-[130px]">
    <style>{`
      @keyframes personJourney {
        0% { transform: translateX(-40px); opacity: 0; }
        8% { opacity: 1; }
        25% { transform: translateX(28px); }
        38% { transform: translateX(28px); }
        50% { transform: translateX(10px); }
        85% { transform: translateX(10px); opacity: 1; }
        95%, 100% { transform: translateX(10px); opacity: 0; }
      }
      @keyframes personLegs {
        0%, 100% { transform: rotate(0deg); }
        15% { transform: rotate(-25deg); }
        30% { transform: rotate(25deg); }
        45% { transform: rotate(0deg); }
      }
      @keyframes boxMovement {
        0% { transform: translate(-40px, 0px); opacity: 0; }
        8% { opacity: 1; }
        25% { transform: translate(28px, -2px); }
        35% { transform: translate(62px, -12px) scale(0.85); opacity: 1; }
        38%, 100% { transform: translate(75px, -12px) scale(0.7); opacity: 0; }
      }
      @keyframes truckMotion {
        0%, 38% { transform: translate(0px, 0px); }
        42% { transform: translate(-3px, 1px); }
        78% { transform: translate(260px, 0px); opacity: 1; }
        85%, 100% { transform: translate(320px, 0px); opacity: 0; }
      }
      @keyframes wheelSpin {
        0%, 38% { transform: rotate(0deg); }
        42% { transform: rotate(-20deg); }
        78%, 85% { transform: rotate(1080deg); }
        100% { transform: rotate(1080deg); }
      }
      @keyframes engineVibe {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-1.5px); }
      }
      @keyframes cargoDoorClose {
        0%, 30% { transform: scaleX(1); }
        38%, 85% { transform: scaleX(0.1); }
        100% { transform: scaleX(1); }
      }
      @keyframes exhaustPuff {
        0%, 38% { opacity: 0; transform: scale(0.2) translate(0, 0); }
        45% { opacity: 0.8; transform: scale(1) translate(-12px, -8px); }
        60% { opacity: 0; transform: scale(1.6) translate(-28px, -16px); }
        100% { opacity: 0; }
      }
    `}</style>

    <div className="relative w-full h-full flex items-center justify-center">
      {/* Road Base */}
      <div className="absolute bottom-4 w-60 h-1.5 bg-slate-800 rounded-full" />

      {/* Main Scene */}
      <div className="relative w-56 h-24 flex items-center">
        {/* Person */}
        <div 
          className="absolute left-4 bottom-5 z-20"
          style={{ animation: 'personJourney 5s ease-in-out infinite' }}
        >
          <svg width="28" height="42" viewBox="0 0 28 42" fill="none">
            <g style={{ transformOrigin: '12px 28px', animation: 'personLegs 0.6s ease-in-out infinite' }}>
              <line x1="10" y1="28" x2="6" y2="40" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
            </g>
            <g style={{ transformOrigin: '16px 28px', animation: 'personLegs 0.6s ease-in-out infinite 0.3s' }}>
              <line x1="16" y1="28" x2="20" y2="40" stroke="#1E293B" strokeWidth="3.2" strokeLinecap="round" />
            </g>
            <rect x="7" y="14" width="13" height="15" rx="4" fill="#334155" stroke="#0F172A" strokeWidth="1.5" />
            <rect x="7" y="19" width="13" height="3" fill="#10B981" />
            <circle cx="13.5" cy="8.5" r="5.5" fill="#E2E8F0" />
            <path d="M7 8C7 5 10 3 14 3C18 3 21 5 21 8H7Z" fill="#0F172A" />
            <path d="M9 16C12 20 18 20 22 17" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Box */}
        <div 
          className="absolute left-7 bottom-8 z-30 pointer-events-none"
          style={{ animation: 'boxMovement 5s ease-in-out infinite' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 1L17 5V13L9 17L1 13V5L9 1Z" fill="#F59E0B" stroke="#B45309" strokeWidth="1" />
            <path d="M9 1L17 5L9 9L1 5L9 1Z" fill="#FBBF24" />
            <path d="M9 9V17L1 13V5L9 9Z" fill="#D97706" />
          </svg>
        </div>

        {/* Truck */}
        <div 
          className="absolute left-16 bottom-4 z-10"
          style={{ animation: 'truckMotion 5s cubic-bezier(0.45, 0, 0.25, 1) infinite' }}
        >
          <div style={{ animation: 'engineVibe 0.3s ease-in-out infinite' }}>
            <svg width="128" height="72" viewBox="0 0 128 72" fill="none">
              <ellipse cx="62" cy="62" rx="58" ry="5" fill="#000000" opacity="0.3" />
              <circle cx="2" cy="46" r="4" fill="#64748B" style={{ transformOrigin: '2px 46px', animation: 'exhaustPuff 5s ease-out infinite' }} />
              <path d="M4 10L68 10L72 14L8 14Z" fill="#1E293B" />
              <rect x="4" y="14" width="68" height="36" rx="3" fill="#0F172A" stroke="#334155" strokeWidth="1.5" />
              <line x1="12" y1="20" x2="60" y2="20" stroke="#10B981" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.8" />
              <line x1="12" y1="26" x2="60" y2="26" stroke="#10B981" strokeWidth="1.5" opacity="0.5" />
              <rect 
                x="4" y="15" width="10" height="34" fill="#020617" stroke="#10B981" strokeWidth="1"
                style={{ transformOrigin: '4px 32px', animation: 'cargoDoorClose 5s ease-in-out infinite' }} 
              />
              <path d="M72 20L92 20L112 32L114 50H72V20Z" fill="#1E293B" stroke="#334155" strokeWidth="1.5" />
              <path d="M78 23H90L106 33H78V23Z" fill="#64748B" stroke="#334155" strokeWidth="1" opacity="0.5" />
              <rect x="110" y="38" width="5" height="12" rx="1.5" fill="#0F172A" />
              <circle cx="113" cy="42" r="2.5" fill="#FEF08A" />
              {/* Wheels */}
              <g style={{ transformOrigin: '24px 52px', animation: 'wheelSpin 5s cubic-bezier(0.4, 0, 0.2, 1) infinite' }}>
                <circle cx="24" cy="52" r="10" fill="#0F172A" stroke="#334155" strokeWidth="2" />
                <circle cx="24" cy="52" r="4" fill="#94A3B8" />
              </g>
              <g style={{ transformOrigin: '48px 52px', animation: 'wheelSpin 5s cubic-bezier(0.4, 0, 0.2, 1) infinite' }}>
                <circle cx="48" cy="52" r="10" fill="#0F172A" stroke="#334155" strokeWidth="2" />
                <circle cx="48" cy="52" r="4" fill="#94A3B8" />
              </g>
              <g style={{ transformOrigin: '96px 52px', animation: 'wheelSpin 5s cubic-bezier(0.4, 0, 0.2, 1) infinite' }}>
                <circle cx="96" cy="52" r="10" fill="#0F172A" stroke="#334155" strokeWidth="2" />
                <circle cx="96" cy="52" r="4" fill="#94A3B8" />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
  const { curUser, isAuthLoading } = useApp();

  if (isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full px-4 text-center select-none bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <ThreeDTruckLoader />
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Loader2 size={14} className="animate-spin text-white" />
            <span>Verifying Admin Session Credentials...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!curUser || (requireAdmin && !curUser.isAdmin)) {
    return <AdminLoginPage />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
