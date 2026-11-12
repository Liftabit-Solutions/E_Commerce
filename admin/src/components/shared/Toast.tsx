import React from 'react';
import { useApp } from '../../core/context/AppContext';
import { CheckCircle } from 'lucide-react';

const Toast: React.FC = () => {
  const { toastMessage } = useApp();

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] animate-toastSlideUp">
      <div className="bg-ink text-wht px-5 py-3.5 rounded-xl text-[0.85rem] font-medium flex items-center gap-2.5 shadow-premium-xl border border-white/10 backdrop-blur-md">
        <CheckCircle className="text-primary shrink-0" size={16} />
        <span className="tracking-wide">{toastMessage}</span>
      </div>
    </div>
  );
};

export default Toast;
