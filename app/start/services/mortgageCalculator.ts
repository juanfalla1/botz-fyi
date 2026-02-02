import { supabase } from '../supabaseClient';

export interface MortgageCalculation {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  dti: number;
  ltv: number;
  approvalStatus: 'approved' | 'pending' | 'rejected';
  approvalScore: number;
  institutionName?: string;
  interestRate: number;
  insuranceCost?: number;
  taxesAndFees?: number;
  requiredDocuments: string[];
  warnings: string[];
  recommendations: string[];
}

export interface MortgageParams {
  propertyValue: number;
  loanAmount: number;
  termYears: number;
  income: number;
  existingDebts?: number;
  countryCode: string;
  institutionId?: string;
  propertyType?: string; // primary_residence, secondary, investment
}

export class MortgageCalculatorService {
  
  // Obtener configuración del país
  static async getCountryConfig(countryCode: string) {
    const { data, error } = await supabase
      .from('countries')
      .select('*, mortgage_config')
      .eq('code', countryCode)
      .single();
    
    if (error) throw new Error(`País no encontrado: ${countryCode}`);
    return data;
  }
  
  // Obtener entidad financiera específica
  static async getInstitution(institutionId?: string) {
    if (!institutionId) return null;
    
    const { data, error } = await supabase
      .from('financial_institutions')
      .select('*')
      .eq('id', institutionId)
      .single();
    
    if (error) return null;
    return data;
  }
  
  // Calcular cuota mensual (fórmula universal)
  static calculateMonthlyPayment(
    loanAmount: number,
    annualInterestRate: number,
    termYears: number
  ): number {
    if (loanAmount <= 0 || termYears <= 0) return 0;
    
    const monthlyRate = annualInterestRate / 100 / 12;
    const months = termYears * 12;
    
    if (monthlyRate === 0) return loanAmount / months;
    
    return (loanAmount * monthlyRate) / 
           (1 - Math.pow(1 + monthlyRate, -months));
  }
  
  // Calcular hipoteca completa
  static async calculateMortgage(params: MortgageParams): Promise<MortgageCalculation> {
    try {
      // 1. Obtener configuración del país
      const country = await this.getCountryConfig(params.countryCode);
      const countryConfig = country.mortgage_config || {};
      
      // 2. Obtener entidad financiera si se especifica
      const institution = params.institutionId ? 
        await this.getInstitution(params.institutionId) : null;
      
      // 3. Determinar tasa de interés
      let interestRate = countryConfig.default_interest_rate || 4.5;
      
      if (institution?.interest_rates) {
        // Buscar tasa para el plazo específico
        const rates = institution.interest_rates;
        const rateForTerm = rates.find((r: any) => 
          r.term === params.termYears || Math.abs(r.term - params.termYears) <= 5
        );
        if (rateForTerm) {
          interestRate = rateForTerm.rate;
        }
      }
      
      // 4. Validar límites del país
      const warnings: string[] = [];
      const recommendations: string[] = [];
      
      // Validar LTV (Loan-to-Value)
      const ltv = (params.loanAmount / params.propertyValue) * 100;
      const maxLTV = institution?.max_ltv || countryConfig.max_ltv || 80;
      
      if (ltv > maxLTV) {
        warnings.push(`LTV (${ltv.toFixed(1)}%) excede el máximo permitido (${maxLTV}%)`);
      }
      
      // Validar monto del préstamo
      const minLoan = institution?.min_loan_amount || countryConfig.min_loan_amount || 10000;
      const maxLoan = institution?.max_loan_amount || countryConfig.max_loan_amount || 1000000;
      
      if (params.loanAmount < minLoan) {
        warnings.push(`Monto mínimo: ${this.formatCurrency(minLoan, country.currency_code)}`);
      }
      if (params.loanAmount > maxLoan) {
        warnings.push(`Monto máximo: ${this.formatCurrency(maxLoan, country.currency_code)}`);
      }
      
      // 5. Calcular cuota mensual
      const monthlyPayment = this.calculateMonthlyPayment(
        params.loanAmount,
        interestRate,
        params.termYears
      );
      
      // 6. Calcular DTI (Debt-to-Income)
      const totalMonthlyDebt = monthlyPayment + (params.existingDebts || 0);
      const dti = (totalMonthlyDebt / params.income) * 100;
      const maxDTI = institution?.max_dti || countryConfig.max_dti || 40;
      
      if (dti > maxDTI) {
        warnings.push(`DTI (${dti.toFixed(1)}%) excede el máximo recomendado (${maxDTI}%)`);
      }
      
      // 7. Calcular score de aprobación
      let approvalScore = 100;
      
      if (dti > maxDTI) approvalScore -= 30;
      if (ltv > maxLTV) approvalScore -= 25;
      if (params.existingDebts && params.existingDebts > params.income * 0.3) approvalScore -= 20;
      if (params.termYears > 25) approvalScore -= 10;
      
      approvalScore = Math.max(0, Math.min(100, approvalScore));
      
      // 8. Determinar estado de aprobación
      let approvalStatus: 'approved' | 'pending' | 'rejected' = 'pending';
      
      if (approvalScore >= 70 && warnings.length === 0) {
        approvalStatus = 'approved';
        recommendations.push('✅ Cumple con todos los requisitos básicos');
      } else if (approvalScore >= 50) {
        approvalStatus = 'pending';
        recommendations.push('⚠️ Se requiere revisión manual por asesor');
      } else {
        approvalStatus = 'rejected';
        recommendations.push('❌ No cumple con los criterios mínimos');
      }
      
      // 9. Generar lista de documentos requeridos
      const requiredDocuments = this.getRequiredDocuments(
        params.countryCode,
        institution?.name
      );
      
      // 10. Calcular costos adicionales
      const insuranceCost = countryConfig.insurance_required ? 
        params.loanAmount * 0.001 : 0; // 0.1% del préstamo
      
      const taxesAndFees = params.loanAmount * 0.02; // 2% estimado
      
      return {
        monthlyPayment,
        totalPayment: monthlyPayment * params.termYears * 12,
        totalInterest: (monthlyPayment * params.termYears * 12) - params.loanAmount,
        dti,
        ltv,
        approvalStatus,
        approvalScore,
        institutionName: institution?.name || 'Sistema Genérico',
        interestRate,
        insuranceCost,
        taxesAndFees,
        requiredDocuments,
        warnings,
        recommendations
      };
      
    } catch (error) {
      console.error('Error calculando hipoteca:', error);
      throw error;
    }
  }
  
  // Obtener documentos requeridos por país
  static getRequiredDocuments(countryCode: string, institutionName?: string): string[] {
    const documentsByCountry: Record<string, string[]> = {
      'ES': [
        'DNI/NIE vigente',
        'Últimas 3 nóminas',
        'Vida laboral',
        'Última declaración de la renta',
        'Contrato de trabajo',
        'Certificado de ingresos bancarios',
        'Nota simple de la propiedad'
      ],
      'MX': [
        'INE vigente',
        'Comprobante de domicilio (menos de 3 meses)',
        'Comprobante de ingresos (3 meses)',
        'Estados de cuenta bancarios',
        'Comprobante de antigüedad laboral',
        'Aval (si aplica)'
      ],
      'CO': [
        'Cédula de ciudadanía',
        'Certificado de ingresos y retención',
        'Extractos bancarios (últimos 3 meses)',
        'Certificado laboral',
        'Declaración de renta',
        'Certificado de tradición y libertad',
        'Avalúo comercial'
      ],
      'CA': [
        'Government-issued ID',
        'Proof of income (last 3 pay stubs)',
        'Employment letter',
        'Bank statements (last 3 months)',
        'Credit report',
        'Property appraisal'
      ],
      'US': [
        'Social Security Number',
        'Government-issued ID',
        'W-2 forms (last 2 years)',
        'Pay stubs (last 30 days)',
        'Bank statements (last 2 months)',
        'Tax returns (last 2 years)'
      ]
    };
    
    const baseDocs = documentsByCountry[countryCode] || [
      'Identificación oficial',
      'Comprobante de ingresos',
      'Comprobante de domicilio',
      'Historial crediticio'
    ];
    
    // Agregar documentos específicos de la entidad
    if (institutionName?.includes('Santander')) {
      baseDocs.push('Formulario Santander específico');
    }
    
    return baseDocs;
  }
  
  // Formatear moneda según país
  static formatCurrency(amount: number, currencyCode: string): string {
    try {
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    } catch {
      return `${currencyCode} ${amount.toLocaleString('es-ES')}`;
    }
  }
  
  // Obtener entidades financieras por país
  static async getInstitutionsByCountry(countryCode: string) {
    const { data, error } = await supabase
      .from('financial_institutions')
      .select('id, name, short_name, type, interest_rates, calculation_type')
      .eq('country_code', countryCode)
      .eq('is_active', true)
      .order('name');
    
    if (error) return [];
    return data;
  }
}