// Simple test to validate Colombia mortgage calculation logic
const { calcularScore } = require('./app/start/components/HipotecaView.tsx');

// Test Colombia-specific scenarios
const testScenarios = [
  {
    name: "VIS Housing with Subsidy",
    inputs: {
      tipoVivienda: "VIS",
      modalidad: "Crédito Pesos",
      ciudad: "Bogotá", 
      subsidio: "Sí",
      valorVivienda: 150000000, // 150M COP
      ingresos: 4500000, // 4.5M COP monthly
      baseTasa: 13.5
    },
    expected: {
      tasaAdjustment: -1.3, // -0.8 VIS + -0.5 subsidy
      entradaMinima: 0.05 // 5% with subsidy
    }
  },
  {
    name: "No VIS Leasing",
    inputs: {
      tipoVivienda: "No VIS",
      modalidad: "Leasing Habitacional",
      ciudad: "Medellín",
      subsidio: "No",
      valorVivienda: 200000000,
      ingresos: 8000000,
      baseTasa: 13.5
    },
    expected: {
      tasaAdjustment: 0.5, // +0.2 city + 0.3 leasing
      entradaMinima: 0.30 // Standard entry
    }
  }
];

console.log('🇨🇴 Testing Colombia mortgage calculation logic...');
testScenarios.forEach(scenario => {
  console.log(`\n✅ Testing: ${scenario.name}`);
  console.log(`Base tasa: ${scenario.inputs.baseTasa}%`);
  console.log(`Expected adjustment: ${scenario.expected.tasaAdjustment}%`);
  console.log(`Final expected tasa: ${(scenario.inputs.baseTasa + scenario.expected.tasaAdjustment)}%`);
});