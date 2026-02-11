import { useContext } from 'react';
import LanguageContext from '../contexts/LanguageContext';

// Hook simplificado para traducciones
export default function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}