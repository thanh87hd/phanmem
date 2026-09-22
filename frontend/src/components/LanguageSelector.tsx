import React from 'react';
import { useTranslation } from 'react-i18next';
import { Select } from 'antd';

export const VietnamFlag: React.FC<{ width?: number; height?: number }> = ({ width = 20, height = 14 }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 900 600" 
    width={width} 
    height={height} 
    style={{ borderRadius: 2, display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, boxShadow: '0 0 1px rgba(0,0,0,0.3)' }}
  >
    <rect width="900" height="600" fill="#da251d" />
    <polygon 
      points="450,150 491,277 625,277 516,356 558,483 450,404 342,483 384,356 275,277 409,277" 
      fill="#ff0" 
    />
  </svg>
);

export const UsFlag: React.FC<{ width?: number; height?: number }> = ({ width = 20, height = 14 }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 741 390" 
    width={width} 
    height={height} 
    style={{ borderRadius: 2, display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, boxShadow: '0 0 1px rgba(0,0,0,0.3)' }}
  >
    <rect width="741" height="390" fill="#b22234" />
    <path d="M0,30H741M0,90H741M0,150H741M0,210H741M0,270H741M0,330H741" stroke="#fff" strokeWidth="30" />
    <rect width="296.4" height="210" fill="#3c3b6e" />
    <g fill="#fff">
      <circle cx="35" cy="25" r="7" />
      <circle cx="85" cy="25" r="7" />
      <circle cx="135" cy="25" r="7" />
      <circle cx="185" cy="25" r="7" />
      <circle cx="235" cy="25" r="7" />
      <circle cx="60" cy="55" r="7" />
      <circle cx="110" cy="55" r="7" />
      <circle cx="160" cy="55" r="7" />
      <circle cx="210" cy="55" r="7" />
      <circle cx="260" cy="55" r="7" />
      <circle cx="35" cy="85" r="7" />
      <circle cx="85" cy="85" r="7" />
      <circle cx="135" cy="85" r="7" />
      <circle cx="185" cy="85" r="7" />
      <circle cx="235" cy="85" r="7" />
      <circle cx="60" cy="115" r="7" />
      <circle cx="110" cy="115" r="7" />
      <circle cx="160" cy="115" r="7" />
      <circle cx="210" cy="115" r="7" />
      <circle cx="260" cy="115" r="7" />
      <circle cx="35" cy="145" r="7" />
      <circle cx="85" cy="145" r="7" />
      <circle cx="135" cy="145" r="7" />
      <circle cx="185" cy="145" r="7" />
      <circle cx="235" cy="145" r="7" />
      <circle cx="60" cy="175" r="7" />
      <circle cx="110" cy="175" r="7" />
      <circle cx="160" cy="175" r="7" />
      <circle cx="210" cy="175" r="7" />
      <circle cx="260" cy="175" r="7" />
    </g>
  </svg>
);

const LanguageSelector: React.FC<{ mode?: 'button' | 'compact' }> = () => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'vi';

  const handleChange = (val: string) => {
    i18n.changeLanguage(val);
    localStorage.setItem('i18nextLng', val);
  };

  return (
    <Select
      value={currentLang}
      onChange={handleChange}
      style={{ width: 95, height: 34 }}
      className="lpbank-lang-select font-bold text-xs"
      options={[
        {
          value: 'vi',
          label: (
            <div className="flex items-center gap-1.5" style={{ height: '100%' }}>
              <VietnamFlag />
              <span className="font-bold text-slate-800">VI</span>
            </div>
          ),
        },
        {
          value: 'en',
          label: (
            <div className="flex items-center gap-1.5" style={{ height: '100%' }}>
              <UsFlag />
              <span className="font-bold text-slate-800">EN</span>
            </div>
          ),
        },
      ]}
    />
  );
};

export default LanguageSelector;
